import { SelectInput } from '@platform/components/custom/form/select-input'
import { TextInput } from '@platform/components/custom/form/text-input'
import { Button } from '@platform/components/ui/button'
import { Separator } from '@platform/components/ui/separator'
import type { MountProps } from '@platform/lib/mount-manager'
import { useForm } from '@tanstack/react-form'
import { ArrowLeft, Hash, Save, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import type { posProduct } from '@/lib/queries/fetch-pos-products'
import { recordWaste } from '@/lib/queries/record-waste'
import { closeProductSidebar } from '../-components/product-sidebar'

// ---------------------------------------------------------------------------
// Common waste reasons — selectable shortcuts
// ---------------------------------------------------------------------------
const WASTE_REASONS = [
  { value: 'Spoilage', label: 'Spoilage' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Damaged', label: 'Damaged' },
  { value: 'Contamination', label: 'Contamination' },
  { value: 'Over-production', label: 'Over-production' },
  { value: 'Other', label: 'Other' },
]

const wasteFormSchema = z.object({
  inventoryId: z.string().min(1, 'Select a batch'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
})

interface RecordWasteSidebarProps extends MountProps {
  product: posProduct
  variant: posProduct['variants'][number]
  /** Pre-selected batch id — passed when opened from a specific batch row */
  defaultInventoryId?: string
  onBack?: () => void
}

export function RecordWasteSidebar({ open: _open, onClose, product, variant, defaultInventoryId, onBack }: RecordWasteSidebarProps) {
  // Build batch options from the variant's live inventory
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  const batchOptions = useMemo(
    () =>
      (variant.inventory ?? [])
        // biome-ignore lint/suspicious/noExplicitAny: flexibility required
        .filter((inv: any) => inv.quantity > 0)
        // biome-ignore lint/suspicious/noExplicitAny: flexibility required
        .map((inv: any) => ({
          value: inv.id,
          label: `${inv.batchNumber || 'N/A'} — ${inv.quantity} ${inv.unit?.abbreviation ?? ''}${inv.location?.name ? ` · ${inv.location.name}` : ''}`,
        })),
    [variant.inventory],
  )

  // Current batch qty for the selected inventory id — used in the hint
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  const getBatchQty = (inventoryId: string) => (variant.inventory ?? []).find((inv: any) => inv.id === inventoryId)?.quantity ?? 0

  const form = useForm({
    validators: { onChange: wasteFormSchema },
    defaultValues: {
      inventoryId: defaultInventoryId ?? batchOptions[0]?.value ?? '',
      quantity: 0,
      reason: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const result = await recordWaste({
        variantId: variant.id,
        inventoryId: value.inventoryId,
        quantity: value.quantity,
        reason: value.notes ? `${value.reason} — ${value.notes}` : value.reason,
      })

      if (result.error) {
        toast.error(result.error.message || 'Failed to record waste. Please try again.')
        return
      }

      toast.success(`Waste recorded for ${variant.name || product.name}`)
      if (onBack) onBack()
      else if (onClose) onClose()
      else closeProductSidebar()
    },
  })

  const handleClose = () => {
    if (onClose) onClose()
    else closeProductSidebar()
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header band */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-2'>
          {onBack && (
            <Button variant='ghost' size='icon' onClick={onBack} className='h-7 w-7'>
              <ArrowLeft className='size-4' />
            </Button>
          )}
          <div>
            <div className='flex items-center gap-2'>
              <Trash2 className='h-4 w-4 text-orange-500' />
              <h2 className='text-base font-semibold leading-none'>Record Waste</h2>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {[product.name, variant?.name && variant.name !== product.name ? `(${variant.name})` : ''].filter(Boolean).join(' ')}
            </p>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Scrollable form body */}
      <div className='flex-1 overflow-y-auto p-4 space-y-5'>

        {/* Section 1: Batch & Quantity */}
        <div className='space-y-3'>
          <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
            <Hash className='w-3 h-3' /> Batch & Quantity
          </h4>

          {batchOptions.length === 0 ? (
            <p className='text-xs text-muted-foreground py-2'>No stock batches with available quantity.</p>
          ) : (
            <>
              <form.Field
                name='inventoryId'
                children={field => (
                  <SelectInput
                    field={field}
                    label='Batch'
                    options={batchOptions}
                    placeholder='Select batch'
                  />
                )}
              />

              <form.Subscribe
                selector={state => state.values.inventoryId}
                children={inventoryId => {
                  const available = getBatchQty(inventoryId)
                  return (
                    <div className='flex items-start gap-3'>
                      <div className='flex-1'>
                        <form.Field
                          name='quantity'
                          children={field => (
                            <TextInput
                              field={field}
                              label='Waste Quantity'
                              type='number'
                              className='rounded-xl'
                              onChange={e => field.handleChange(Number(e.target.value))}
                            />
                          )}
                        />
                      </div>
                      {available > 0 && (
                        <div className='pt-6 shrink-0'>
                          <p className='text-[10px] text-muted-foreground'>Available</p>
                          <p className='text-sm font-bold tabular-nums'>{available}</p>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </>
          )}
        </div>

        <Separator />

        {/* Section 2: Reason */}
        <div className='space-y-3'>
          <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
            <Trash2 className='w-3 h-3' /> Waste Reason
          </h4>
          <form.Field
            name='reason'
            children={field => (
              <SelectInput
                field={field}
                label='Reason'
                options={WASTE_REASONS}
                placeholder='Select reason'
              />
            )}
          />
          <form.Field
            name='notes'
            children={field => (
              <TextInput
                field={field}
                label='Notes (optional)'
                placeholder='e.g. Dropped during prep, found mouldy'
                className='rounded-xl'
              />
            )}
          />
        </div>
      </div>

      {/* Sticky footer */}
      <div className='p-4 border-t shrink-0'>
        <form.Subscribe
          selector={state => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              onClick={() => form.handleSubmit()}
              disabled={!canSubmit || isSubmitting}
              className='w-full h-11 rounded-xl font-semibold flex gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]'
            >
              <Trash2 className='w-4! h-4!' />
              {isSubmitting ? 'Recording...' : 'Record Waste'}
            </Button>
          )}
        />
      </div>
    </div>
  )
}
