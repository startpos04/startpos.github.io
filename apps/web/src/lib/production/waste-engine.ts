/**
 * waste-engine.ts
 *
 * Engine for recording explicit waste of inventory batches.
 * Waste is NEVER automatic — it must be explicitly recorded by the user
 * through the UI after physically inspecting the stock.
 *
 * Architecture:
 *   - All methods are synchronous (called inside dbTransaction)
 *   - Creates one WASTE movement per batch touched
 *   - Batch selection is ALWAYS explicit — the caller provides exactly which
 *     batches to waste and how much from each. No FIFO, no auto-selection.
 *   - Expiry dates on Inventory rows are informational; they drive UI highlights
 *     but never trigger automatic waste.
 *
 * Design rationale:
 *   Waste is a physical inspection activity. A person walks to the shelf, sees
 *   which specific batches are spoiled/expired/damaged, and records exactly those.
 *   Allocating waste across batches algorithmically (FIFO) produces incorrect
 *   records — the wrong batch would appear in the audit trail. The user must
 *   select the batch(es) they physically inspected.
 */

import type { inventoryCollection as InventoryCollectionType, inventoryMovementCollection as MovementCollectionType } from '@platform/db/collections'
import { MovementType } from 'prisma/generated/prisma/enums'
import { getInventoryMode, InventoryPolicy } from '@/lib/inventory'

// ---------------------------------------------------------------------------
// Shared tenant-context type
// ---------------------------------------------------------------------------

interface TenantContext {
  userId: string
  branchId: string
  businessId: string
}

// ---------------------------------------------------------------------------
// Batch selection — one entry per physical batch the user selected
// ---------------------------------------------------------------------------

/**
 * A single batch the user selected for waste recording.
 *
 * quantity  — how much to waste from this batch (≤ batch.quantity in strict mode)
 * inventoryId — the Inventory row id for this batch
 */
export interface WasteBatchSelection {
  inventoryId: string
  quantity: number
}

// ---------------------------------------------------------------------------
// RecordWaste params — new batch-explicit model
// ---------------------------------------------------------------------------

export interface RecordWasteParams {
  /** The variant these batches belong to (used for movement record). */
  variantId: string
  /** Unit to stamp on each movement record. */
  unitId: string
  /** Reason for waste — applies to all batches in this submission. */
  reason: string
  /** Optional notes — applies to all batches in this submission. */
  notes?: string
  /**
   * Explicit batch selections from the user.
   * Each entry = one batch the user physically inspected and chose to write off.
   * The engine creates one WASTE movement per entry.
   */
  batches: WasteBatchSelection[]
  ctx: TenantContext
}

// ---------------------------------------------------------------------------
// Waste Summary for reporting
// ---------------------------------------------------------------------------

export interface WasteSummary {
  totalQuantity: number
  totalValue: number // Cost in cents
  byReason: Array<{
    reason: string
    quantity: number
    value: number
    count: number // Number of waste events
  }>
  byProduct: Array<{
    variantId: string
    productName: string
    quantity: number
    value: number
  }>
}

// ---------------------------------------------------------------------------
// Date range for queries
// ---------------------------------------------------------------------------

export interface DateRange {
  start: Date
  end: Date
}

// ---------------------------------------------------------------------------
// Waste Engine
// ---------------------------------------------------------------------------

export const WasteEngine = {
  /**
   * Record waste for explicitly selected inventory batches.
   *
   * IMPORTANT: This is ONLY called when the user explicitly records waste
   * through the UI after physically inspecting the stock. There is NO
   * automatic waste — not at end of day, not when expiry dates pass.
   *
   * Each batch in params.batches is processed independently:
   *   1. Look up the batch in inventoryCollection
   *   2. Validate quantity against batch.quantity (mode-aware)
   *   3. Decrement inventory
   *   4. Insert a WASTE movement for the audit trail
   *
   * @throws Error if any batch is not found, or if validation fails in strict mode.
   */
  recordWaste(
    params: RecordWasteParams,
    inventoryCollection: typeof InventoryCollectionType,
    movementCollection: typeof MovementCollectionType,
  ): { success: true; wastedBatches: Array<{ inventoryId: string; quantity: number; cost: number }> } {
    const { variantId, unitId, reason, notes, batches, ctx } = params

    if (batches.length === 0) {
      throw new Error('No batches selected for waste recording')
    }

    const totalRequested = batches.reduce((sum, b) => sum + b.quantity, 0)
    if (totalRequested <= 0) {
      throw new Error('Total waste quantity must be greater than 0')
    }

    const inventoryMode = getInventoryMode(ctx.businessId)
    const now = new Date()
    const reasonText = notes ? `${reason} - ${notes}` : reason
    const wastedBatches: Array<{ inventoryId: string; quantity: number; cost: number }> = []

    for (const selection of batches) {
      if (selection.quantity <= 0) continue // skip zero-qty rows the user left blank

      const batch = inventoryCollection.get(selection.inventoryId)
      if (!batch) {
        throw new Error(`Inventory batch ${selection.inventoryId} not found`)
      }

      // Validate per-batch quantity
      if (inventoryMode !== 'none') {
        InventoryPolicy.validateWasteDisposal({
          mode: inventoryMode,
          variantId,
          requested: selection.quantity,
          available: batch.quantity,
          batchId: batch.id,
        })
      }

      const cost = Math.round((batch.costPrice || 0) * selection.quantity)

      // Decrement inventory
      inventoryCollection.update(batch.id, draft => {
        draft.quantity -= selection.quantity
        draft.updatedAt = now
      })

      // One WASTE movement per batch — preserves the full audit trail
      movementCollection.insert({
        id: crypto.randomUUID(),
        variantId,
        inventoryId: batch.id,
        transactionId: null,
        productionOrderId: batch.productionOrderId ?? null,
        userId: ctx.userId,
        type: MovementType.WASTE,
        quantity: selection.quantity,
        reason: `Waste: ${reasonText}`,
        unitId,
        purchaseId: null,
        locationId: batch.locationId ?? null,
        targetBranchId: null,
        operationalTaskId: null,
        businessId: ctx.businessId,
        branchId: ctx.branchId,
        createdAt: now,
        updatedAt: now,
      })

      wastedBatches.push({ inventoryId: batch.id, quantity: selection.quantity, cost })
    }

    return { success: true, wastedBatches }
  },

  /**
   * Get waste summary for reporting.
   *
   * Aggregates waste movements by reason and product for analytics.
   * Used by WasteAnalytics component and WasteRate card.
   */
  getWasteSummary(
    branchId: string,
    dateRange: DateRange,
    movementCollection: typeof MovementCollectionType,
    inventoryCollection: typeof InventoryCollectionType,
  ): WasteSummary {
    const wasteMovements = [...movementCollection.values()].filter(
      m => m.branchId === branchId && m.type === MovementType.WASTE && new Date(m.createdAt) >= dateRange.start && new Date(m.createdAt) <= dateRange.end,
    )

    // Aggregate by reason
    const byReasonMap = new Map<string, { quantity: number; value: number; count: number }>()

    for (const movement of wasteMovements) {
      // Extract reason from movement reason text (format: "Waste: {reason}" or "Waste: {reason} - {notes}")
      const reasonMatch = movement.reason?.match(/^Waste: (.+?)(?:\s-\s.+)?$/)
      const reason = reasonMatch ? reasonMatch[1] : 'Unknown'

      const inventory = inventoryCollection.get(movement.inventoryId)
      const value = inventory ? Math.round((inventory.costPrice || 0) * movement.quantity) : 0

      const existing = byReasonMap.get(reason) ?? { quantity: 0, value: 0, count: 0 }
      byReasonMap.set(reason, {
        quantity: existing.quantity + movement.quantity,
        value: existing.value + value,
        count: existing.count + 1,
      })
    }

    const byReason = Array.from(byReasonMap.entries())
      .map(([reason, data]) => ({ reason, ...data }))
      .sort((a, b) => b.value - a.value)

    // Aggregate by product (variantId)
    const byProductMap = new Map<string, { productName: string; quantity: number; value: number }>()

    for (const movement of wasteMovements) {
      const inventory = inventoryCollection.get(movement.inventoryId)
      if (!inventory) continue

      const existing = byProductMap.get(movement.variantId) ?? { productName: 'Unknown', quantity: 0, value: 0 }
      const value = Math.round((inventory.costPrice || 0) * movement.quantity)

      byProductMap.set(movement.variantId, {
        productName: existing.productName,
        quantity: existing.quantity + movement.quantity,
        value: existing.value + value,
      })
    }

    const byProduct = Array.from(byProductMap.entries())
      .map(([variantId, data]) => ({ variantId, ...data }))
      .sort((a, b) => b.value - a.value)

    return {
      totalQuantity: byReason.reduce((sum, r) => sum + r.quantity, 0),
      totalValue: byReason.reduce((sum, r) => sum + r.value, 0),
      byReason,
      byProduct,
    }
  },
}
