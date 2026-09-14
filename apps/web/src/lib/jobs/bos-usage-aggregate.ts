/**
 * bos-usage-aggregate.ts
 *
 * Background job: BOS Usage Aggregate
 *
 * Aggregates per-business usage counts into BusinessUsageSummary.additionalMetrics
 * so the CharacteristicsEngine (recalculation-job.ts) has fresh signal data to
 * evaluate observation rules (e.g. hasRegularWaste, reconcilesCash, usesSuppliers).
 *
 * Why this exists:
 *   The recalculation job reads BusinessUsageSummary.additionalMetrics but nothing
 *   was ever writing that JSON blob. This job is the missing writer. Without it,
 *   every observation rule that depends on a usage count permanently returns false,
 *   meaning BOS characteristics never update from usage signals.
 *
 * What it aggregates (covers all Phase 2 + Phase 3b + Phase 5 observation rules):
 *   - supplierCount                — total Supplier rows
 *   - employeeCount                — active Membership rows (non-deleted)
 *   - branchCount                  — active Branch rows (non-deleted)
 *   - customerCount                — Customer rows (non-deleted)
 *   - purchaseOrderCount           — Purchase rows
 *   - inventoryAdjustmentCount     — InventoryMovement rows with type = ADJUST
 *   - componentRecipeCount         — ProductComponent rows
 *   - wasteRecordCount             — InventoryMovement rows with type = WASTE
 *   - reconciliationCount          — OperationalTask rows with type = CASH_RECONCILIATION, status = FULFILLED
 *   - approvalWorkflowUsageCount   — OperationalTask rows with approverId set (approved tasks)
 *   - deliveryOrderCount           — Order rows with type = DELIVERY
 *   - productVariantCount          — ProductVariant rows (non-deleted)
 *   - productCount                 — Product rows (non-deleted)
 *   - transactionsLast30Days       — Transaction rows created in the last 30 days
 *   - transactionsPrev30Days       — Transaction rows created in the 30 days before that
 *   - avgDailyTransactions         — transactionsLast30Days / 30
 *
 * Idempotency:
 *   Upserts on (businessId, periodEnd) — running twice for the same period is safe.
 *
 * Architecture:
 *   - Uses rootPrisma (platform-level) — counts are cross-branch per business.
 *   - No tenant-scoped client; all counts are WHERE businessId = <id>.
 *   - periodStart = start of the current calendar month.
 *   - periodEnd   = end of the current calendar month.
 *     Using calendar month keeps periods stable and human-readable.
 *     (The recalculation job reads the MOST RECENT row, regardless of period.)
 *
 * Usage (called from a cron endpoint):
 *   const result = await runBosUsageAggregateJob(rootPrisma, now)
 *   console.log(result)
 */

import type { PrismaClient } from 'prisma/generated/prisma/client'
import type { BusinessUsageSummaryData } from '../evolution/types'
import { type JobResult, jobError, jobSuccess } from './index'

// ---------------------------------------------------------------------------
// runBosUsageAggregateJob
// ---------------------------------------------------------------------------

/**
 * Aggregate BOS usage counts for all businesses and write them to
 * BusinessUsageSummary.additionalMetrics.
 *
 * @param rootPrisma - The root Prisma client (platform-level, not tenant-scoped)
 * @param now        - Current time — passed explicitly for determinism; defaults to new Date()
 */
export async function runBosUsageAggregateJob(rootPrisma: PrismaClient, now: Date = new Date()): Promise<JobResult> {
  const JOB_NAME = 'bos-usage-aggregate'

  try {
    // Find all businesses (we aggregate all, not just active ones — inactive
    // businesses may still have characteristics that need updating).
    const businesses = await rootPrisma.business.findMany({
      select: { id: true },
    })

    if (businesses.length === 0) {
      return jobSuccess(JOB_NAME, 0, 0)
    }

    // Period: current calendar month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Rolling 30-day windows for transaction velocity signals
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    let processed = 0
    let skipped = 0
    const warnings: string[] = []

    for (const { id: businessId } of businesses) {
      try {
        const metrics = await aggregateForBusiness(rootPrisma, businessId, thirtyDaysAgo, sixtyDaysAgo)

        // Upsert on (businessId, periodEnd) — idempotent
        await rootPrisma.businessUsageSummary.upsert({
          where: {
            businessId_periodEnd: {
              businessId,
              periodEnd,
            },
          },
          update: {
            additionalMetrics: metrics as object,
            updatedAt: now,
          },
          create: {
            businessId,
            periodStart,
            periodEnd,
            additionalMetrics: metrics as object,
          },
        })

        processed++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        warnings.push(`[${businessId}] Failed to aggregate usage: ${message}`)
        skipped++
      }
    }

    return jobSuccess(JOB_NAME, processed, skipped, warnings)
  } catch (err) {
    return jobError(JOB_NAME, err)
  }
}

// ---------------------------------------------------------------------------
// Per-business aggregation
// ---------------------------------------------------------------------------

async function aggregateForBusiness(prisma: PrismaClient, businessId: string, thirtyDaysAgo: Date, sixtyDaysAgo: Date): Promise<BusinessUsageSummaryData> {
  // Run all counts in parallel for efficiency
  const [
    supplierCount,
    employeeCount,
    branchCount,
    customerCount,
    purchaseOrderCount,
    inventoryAdjustmentCount,
    wasteRecordCount,
    componentRecipeCount,
    reconciliationCount,
    approvalWorkflowUsageCount,
    deliveryOrderCount,
    productVariantCount,
    productCount,
    transactionsLast30Days,
    transactionsPrev30Days,
  ] = await Promise.all([
    // supplierCount — total supplier records
    prisma.supplier.count({
      where: { businessId, deletedAt: null },
    }),

    // employeeCount — active memberships
    prisma.membership.count({
      where: { businessId, deletedAt: null },
    }),

    // branchCount — active branches
    prisma.branch.count({
      where: { businessId, deletedAt: null },
    }),

    // customerCount — customer records
    prisma.customer.count({
      where: { businessId, deletedAt: null },
    }),

    // purchaseOrderCount — total purchase orders
    prisma.purchase.count({
      where: { businessId },
    }),

    // inventoryAdjustmentCount — manual inventory adjustments
    prisma.inventoryMovement.count({
      where: { businessId, type: 'ADJUST' },
    }),

    // wasteRecordCount — waste disposal movements (the key signal)
    prisma.inventoryMovement.count({
      where: { businessId, type: 'WASTE' },
    }),

    // componentRecipeCount — product component recipes
    prisma.productComponent.count({
      where: { businessId },
    }),

    // reconciliationCount — completed cash reconciliation tasks
    prisma.operationalTask.count({
      where: { businessId, type: 'CASH_RECONCILIATION', status: 'FULFILLED' },
    }),

    // approvalWorkflowUsageCount — tasks that went through approval (have an approverId)
    prisma.operationalTask.count({
      where: { businessId, approverId: { not: null } },
    }),

    // deliveryOrderCount — delivery orders
    prisma.order.count({
      where: { businessId, orderType: 'DELIVERY' },
    }),

    // productVariantCount — product variants
    prisma.productVariant.count({
      where: { businessId, deletedAt: null },
    }),

    // productCount — products
    prisma.product.count({
      where: { businessId, deletedAt: null },
    }),

    // transactionsLast30Days — rolling 30-day window
    prisma.transaction.count({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
    }),

    // transactionsPrev30Days — the 30-day window before that (for rapid-growth detection)
    prisma.transaction.count({
      where: { businessId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
  ])

  const avgDailyTransactions = Math.round(transactionsLast30Days / 30)

  return {
    supplierCount,
    employeeCount,
    branchCount,
    customerCount,
    purchaseOrderCount,
    inventoryAdjustmentCount,
    wasteRecordCount,
    componentRecipeCount,
    reconciliationCount,
    approvalWorkflowUsageCount,
    deliveryOrderCount,
    productVariantCount,
    productCount,
    transactionsLast30Days,
    transactionsPrev30Days,
    avgDailyTransactions,
  }
}
