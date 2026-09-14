/**
 * record-stock-waste-sidebar.tsx — Journey B2
 *
 * Direct stock write-off for raw materials and purchased stock.
 * No task workflow required — available to any user with BRANCH_ADJUST_INVENTORY.
 *
 * This is the missing path for businesses that don't use task management:
 * they can write off damaged/expired raw material batches directly from
 * the Inventory Reports page without creating a WASTE_DISPOSAL task.
 *
 * Uses BatchWastePicker so the user manually selects which batches to write off,
 * with expiry highlighting from Inventory.expiryDate.
 */

import { Button } from '@platform/components/ui/button'
import {
  inventoryCollection,
  inventoryMovementCollection,
  locationCollection,
  productVariantCollection,
  unitCollection,
} from '@platform/db/collections'
import { dbTransaction } from '@platform/db/local-db-transaction'
import { usePermission } from '@platform/hooks/use-permission'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import type { MountProps } from '@platform/lib/mount-manager'
import { InventoryType } from 'prisma/generated/prisma/enums'
import { Loader2, Lock, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { type BatchPickerState, BatchWastePicker, type BatchRow } from '@/components/custom/waste/batch-waste-picker'
import { WasteEngine } from '@/lib/production/waste-engine'
import { closeInventoryReportsSidebar } from './inventory-reports-sidebar'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecordStockWasteSidebarProps extends MountProps {
  /** Variant to write off raw material stock for */
  variantId: string
  productName: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordStockWasteSidebar({ variantId, productName, open: _open, onClose }: RecordStockWasteSidebarProps) {
  const user = useAuthenticatedUser()
  // Journey B2 uses BRANCH_ADJUST_INVENTORY — no batch-preparation capability needed
  const canWriteOff = usePermission(Permissions.BRANCH_ADJUST_INVENTORY)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pickerState, setPickerState] = useState<BatchPickerState>({ selections: [], reason: '', notes: '' })

  // Build BatchRow list from RAW_MATERIAL inventory batches for this variant/branch
  const batches: BatchRow[] = useMemo(() => {
    return [...inventoryCollection.values()]
      .filter(
        inv =>
          inv.variantId === variantId &&
          inv.branchId === user.branch.id &&
          inv.inventoryType === InventoryType.RAW_MATERIAL &&
          inv.quantity > 0,
      )
      .sort((a, b) => {
        // Sort expired first, then by oldest batch
        const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
        const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
        if (aExpiry !== bExpiry) return aExpiry - bExpiry
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
      .map(inv => {
        const unit = unitCollection.get(inv.unitId)
        const location = inv.locationId ? locationCollection.get(inv.locationId) : null
        return {
          inventoryId: inv.id,
          batchNumber: inv.batchNumber ?? null,
          quantity: inv.quantity,
          unitAbbreviation: unit?.abbreviation ?? '',
          costPrice: inv.costPrice,
          expiryDate: inv.expiryDate ? new Date(inv.expiryDate) : null,
          producedAt: null, // raw materials don't use shelfLifeHours
          shelfLifeHours: null,
          locationLabel: location?.name ?? null,
        } satisfies BatchRow
      })
  }, [variantId, user.branch.id])

  const totalSelectedQty = pickerState.selections.reduce((sum, s) => sum + s.quantity, 0)
  const hasValidSelections = pickerState.selections.some(s => s.quantity > 0)
  const hasReason = pickerState.reason !== ''
  const anyOverQty = pickerState.selections.some(s => {
    const batch = batches.find(b => b.inventoryId === s.inventoryId)
    return batch ? s.quantity > batch.quantity : false
  })

  const handleSubmit = async () => {
    if (!hasValidSelections) { toast.error('Select at least one batch to write off'); return }
    if (!hasReason) { toast.error('Please select a reason'); return }
    if (anyOverQty) { toast.error('One or more quantities exceed the available batch quantity'); return }

    setIsSubmitting(true)
    try {
      const result = await dbTransaction(() => {
        const variant = productVariantCollection.get(variantId)
        if (!variant) throw new Error('Variant not found')

        return WasteEngine.recordWaste(
          {
            variantId,
            unitId: variant.unitId,
            reason: pickerState.reason,
            notes: pickerState.notes || undefined,
            batches: pickerState.selections.filter(s => s.quantity > 0),
            ctx: { userId: user.id, branchId: user.branch.id, businessId: user.business.id },
          },
          inventoryCollection,
          inventoryMovementCollection,
        )
      })

      if (result.isOk()) {
        const batchCount = pickerState.selections.filter(s => s.quantity > 0).length
        toast.success(
          `${totalSelectedQty.toLocaleString()} units written off across ${batchCount} batch${batchCount !== 1 ? 'es' : ''}`,
        )
        handleClose()
      } else {
        throw result.error
      }
    } catch (error) {
      console.error('Failed to write off stock:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to write off stock')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (onClose) onClose()
    else closeInventoryReportsSidebar()
  }

  // Permission gate
  if (!canWriteOff) {
    return (
      <div className='flex flex-col h-full'>
        <div className='flex items-center justify-between p-4 border-b shrink-0'>
          <div className='flex items-center gap-2'>
            <Trash2 className='w-5 h-5 text-red-600' />
            <h2 className='text-base font-semibold leading-none'>Write Off Stock</h2>
          </div>
          <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7'>
            <X className='size-4' />
          </Button>
        </div>
        <div className='flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center'>
          <Lock className='w-8 h-8 text-muted-foreground' />
          <p className='font-medium'>Permission required</p>
          <p className='text-sm text-muted-foreground'>
            You need the "Adjust Inventory" permission to write off stock. Contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-2'>
          <Trash2 className='w-5 h-5 text-red-600' />
          <div>
            <h2 className='text-base font-semibold leading-none'>Write Off Stock</h2>
            <p className='text-xs text-muted-foreground mt-1'>Select batches to mark as waste</p>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Batch picker */}
      <div className='flex-1 overflow-y-auto p-4'>
        <BatchWastePicker
          productName={productName}
          batches={batches}
          value={pickerState}
          onChange={setPickerState}
        />
      </div>

      {/* Footer */}
      <div className='p-4 border-t shrink-0'>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handleClose} disabled={isSubmitting} className='flex-1'>
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleSubmit}
            disabled={isSubmitting || !hasValidSelections || !hasReason || anyOverQty}
            className='flex-1'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Writing Off…
              </>
            ) : (
              'Write Off Stock'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
