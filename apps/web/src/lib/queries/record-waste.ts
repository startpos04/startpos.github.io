import { auditLogCollection, inventoryCollection, inventoryMovementCollection } from '@platform/db/collections'
import { dbTransaction } from '@platform/db/local-db-transaction'
import { MovementType } from 'prisma/generated/prisma/enums'
import { z } from 'zod'
import { AuditAction, AuditTargetType } from '@/lib/audit/types'
import { getAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { InventoryPolicy } from '@/lib/inventory/inventory-policy'

export const recordWasteSchema = z.object({
  variantId: z.string().min(1, 'Variant is required'),
  inventoryId: z.string().min(1, 'Batch is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
})

export type RecordWasteInput = z.infer<typeof recordWasteSchema>

export const recordWaste = async (data: RecordWasteInput) => {
  const user = getAuthenticatedUser()

  const result = await dbTransaction(() => {
    const batch = inventoryCollection.get(data.inventoryId)

    if (!batch) {
      throw new Error(`Inventory batch not found: ${data.inventoryId}`)
    }

    // Validate — cannot waste more than what's in the batch
    InventoryPolicy.validateWasteDisposal(data.variantId, batch.quantity, data.quantity)

    const now = new Date()

    // Deduct from the batch
    inventoryCollection.update(data.inventoryId, draft => {
      draft.quantity -= data.quantity
      draft.updatedAt = now
    })

    // Record the WASTE movement
    const movementId = crypto.randomUUID()
    inventoryMovementCollection.insert({
      id: movementId,
      variantId: data.variantId,
      inventoryId: data.inventoryId,
      userId: user.id,
      quantity: data.quantity,
      unitId: batch.unitId,
      type: MovementType.WASTE,
      reason: data.reason,
      transactionId: null,
      purchaseId: null,
      operationalTaskId: null,
      targetBranchId: null,
      locationId: batch.locationId,
      businessId: user.business.id,
      branchId: user.branch.id,
      updatedAt: now,
      createdAt: now,
    })

    return { movementId, remainingQty: batch.quantity - data.quantity }
  })

  if (result.isErr()) {
    console.error('[recordWaste] Transaction failed:', result.error.message)

    auditLogCollection.insert({
      id: crypto.randomUUID(),
      businessId: user.business.id,
      actorId: user.id,
      action: AuditAction.SEQUENCE_ALLOCATION_FAILED,
      targetType: AuditTargetType.SequenceCounter,
      targetId: data.inventoryId,
      before: null,
      after: {
        variantId: data.variantId,
        inventoryId: data.inventoryId,
        quantity: data.quantity,
        reason: data.reason,
        errorMessage: result.error.message,
        timestamp: new Date().toISOString(),
      },
      ipAddress: null,
      createdAt: new Date(),
    })

    return { data: null, error: result.error }
  }

  return { data: result.value, error: null }
}
