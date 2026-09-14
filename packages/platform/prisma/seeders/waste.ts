// fallow-ignore-file unused-file
/** biome-ignore-all lint/suspicious/noExplicitAny: seeder */

/**
 * waste.ts — Waste Movement Seeder
 *
 * Seeds realistic InventoryMovement records with type = WASTE to populate:
 *   - The Waste History page (/preparation/waste-history)
 *   - The Waste Analytics section in Inventory Reports
 *   - The WasteRate card
 *   - The wasteRecordCount BOS signal (fires after bos-usage-aggregate job runs)
 *
 * Approach:
 *   - Finds up to 8 inventory batches for the seeded business/branch
 *   - Creates 8–12 waste movements spread over the past 30 days
 *   - Uses varied reasons from WASTE_REASONS to give analytics meaningful data
 *   - Decrements inventory quantity by the wasted amount (capped at 10% of batch)
 *   - Fully idempotent: stable IDs prefixed with "waste-seed-"
 *
 * Order 110 — must run after Inventory (order 100).
 */

import { MovementType, type PrismaClient } from 'prisma/generated/prisma/client'
import { getAccounts } from './accounts'

export const order = 110

// Reasons spread across the full WASTE_REASONS constant — representative mix
const SEED_WASTE_REASONS = [
  'Past Shelf Life',
  'Expired',
  'Spoiled',
  'Damaged',
  'Failed Preparation',
  'Quality Issue',
  'Past Shelf Life', // weighted higher — most common in practice
  'Spoiled',
]

// Seed notes for variety
const SEED_NOTES: (string | null)[] = [
  'Found during morning stock check',
  'Refrigerator malfunction overnight',
  null,
  'Dropped during transfer',
  'Did not pass quality check before service',
  null,
  'End of batch shelf life reached',
  null,
]

export async function Waste(prisma: PrismaClient, options: { folder: string }) {
  console.info('🗑️  Seeding waste movements...')

  const accounts = getAccounts(options.folder)

  const adminUser = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
      memberships: {
        some: {
          business: { id: accounts.business.id },
          branch: { id: accounts.branch.id },
        },
      },
    },
  })

  if (!adminUser) {
    console.warn('⚠️  No Admin user found — skipping waste seeder.')
    return
  }

  // Find existing inventory batches to waste from
  const batches = await prisma.inventory.findMany({
    where: {
      businessId: accounts.business.id,
      branchId: accounts.branch.id,
      quantity: { gt: 0 },
    },
    include: { unit: true },
    take: 8, // Use up to 8 different batches for variety
    orderBy: { createdAt: 'asc' },
  })

  if (batches.length === 0) {
    console.warn('⚠️  No inventory batches found — skipping waste seeder. Run inventory seeder first.')
    return
  }

  const now = new Date()
  let seededCount = 0
  let skippedCount = 0

  // Create 1–2 waste events per batch, spread across the last 30 days
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    const eventsForBatch = batchIdx % 3 === 0 ? 2 : 1 // Some batches get 2 events

    for (let eventIdx = 0; eventIdx < eventsForBatch; eventIdx++) {
      const movementId = `waste-seed-${batch.id}-${eventIdx}`

      // Check idempotency — skip if already seeded
      const existing = await prisma.inventoryMovement.findUnique({ where: { id: movementId } })
      if (existing) {
        skippedCount++
        continue
      }

      // Waste quantity: 5–15% of batch quantity, minimum 1
      const wastePercent = 0.05 + (((batchIdx * 7 + eventIdx * 3) % 10) / 100) // deterministic variation
      const wasteQty = Math.max(1, Math.round(batch.quantity * wastePercent * 10) / 10)

      // Only waste if batch has enough remaining
      const currentBatch = await prisma.inventory.findUnique({ where: { id: batch.id } })
      if (!currentBatch || currentBatch.quantity < wasteQty) {
        skippedCount++
        continue
      }

      // Spread events across last 30 days — deterministic offset per event
      const daysAgo = Math.round(((batchIdx * 3 + eventIdx * 7) % 28) + 1)
      const wastedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      // Vary the time of day too (morning/afternoon)
      wastedAt.setHours(6 + ((batchIdx * 3) % 12), (eventIdx * 17) % 60, 0, 0)

      const reasonIdx = (batchIdx + eventIdx * 2) % SEED_WASTE_REASONS.length
      const noteIdx = (batchIdx + eventIdx) % SEED_NOTES.length
      const reason = SEED_WASTE_REASONS[reasonIdx]
      const note = SEED_NOTES[noteIdx]
      const reasonText = note ? `${reason} - ${note}` : reason

      await prisma.$transaction([
        // Create the WASTE movement
        prisma.inventoryMovement.create({
          data: {
            id: movementId,
            variantId: batch.variantId,
            inventoryId: batch.id,
            userId: adminUser.id,
            type: MovementType.WASTE,
            quantity: wasteQty,
            unitId: batch.unitId,
            reason: `Waste: ${reasonText}`,
            businessId: accounts.business.id,
            branchId: accounts.branch.id,
            createdAt: wastedAt,
            updatedAt: wastedAt,
          },
        }),
        // Decrement the inventory batch
        prisma.inventory.update({
          where: { id: batch.id },
          data: {
            quantity: { decrement: wasteQty },
            updatedAt: wastedAt,
          },
        }),
      ])

      seededCount++
    }
  }

  console.info(`✅ Waste movements seeded: ${seededCount} created, ${skippedCount} skipped (already exist).`)
}
