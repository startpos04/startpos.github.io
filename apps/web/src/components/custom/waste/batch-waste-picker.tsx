/**
 * batch-waste-picker.tsx
 *
 * Shared UI component for selecting which inventory batches to write off as waste.
 *
 * Design principle: waste is a physical inspection activity. This component
 * shows every available batch for a variant and lets the user:
 *   1. Check which batches they physically inspected and found to be waste
 *   2. Enter a partial or full quantity for each selected batch
 *
 * Expiry awareness:
 *   - Batches where expiryDate < now are highlighted red and pre-selected
 *   - Batches where expiryDate is within 3 days are highlighted amber
 *   - For finished goods, expiry is derived from producedAt + shelfLifeHours
 *     when no explicit expiryDate is set on the inventory row
 *   - The reason field defaults to "Expired" when all selected batches are past expiry
 *
 * Used by:
 *   - RecordWasteSidebar (Journey A — finished goods from /preparation)
 *   - RecordStockWasteSidebar (Journey B2 — raw materials / stock from /inventory-reports)
 */

import { WASTE_REASONS } from '@constants/lib/waste'
import { Badge } from '@platform/components/ui/badge'
import { Checkbox } from '@platform/components/ui/checkbox'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Textarea } from '@platform/components/ui/textarea'
import { cn } from '@platform/lib/utils'
import dayjs from '@platform/lib/dayjs'
import { AlertTriangle, Clock, PackageX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { WasteBatchSelection } from '@/lib/production/waste-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchRow {
  inventoryId: string
  batchNumber: string | null
  quantity: number // current available quantity
  unitAbbreviation: string
  costPrice: number // cents per unit
  /** Set on purchased raw material batches */
  expiryDate: Date | null
  /** Set on finished goods batches — used to derive expiry when no expiryDate */
  producedAt: Date | null
  /** Shelf life hours — for finished goods expiry derivation */
  shelfLifeHours: number | null
  /** Human-readable location label (optional) */
  locationLabel: string | null
}

export interface BatchPickerState {
  selections: WasteBatchSelection[]
  reason: string
  notes: string
}

interface BatchWastePickerProps {
  productName: string
  batches: BatchRow[]
  value: BatchPickerState
  onChange: (next: BatchPickerState) => void
  /** Whether to show the reason/notes fields (default true) */
  showReasonFields?: boolean
}

// ---------------------------------------------------------------------------
// Expiry helpers
// ---------------------------------------------------------------------------

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function getEffectiveExpiry(batch: BatchRow): Date | null {
  if (batch.expiryDate) return batch.expiryDate
  if (batch.producedAt && batch.shelfLifeHours) {
    return new Date(batch.producedAt.getTime() + batch.shelfLifeHours * 60 * 60 * 1000)
  }
  return null
}

type ExpiryStatus = 'expired' | 'expiring-soon' | 'ok' | 'unknown'

function getExpiryStatus(batch: BatchRow, now: Date): ExpiryStatus {
  const expiry = getEffectiveExpiry(batch)
  if (!expiry) return 'unknown'
  if (expiry < now) return 'expired'
  if (expiry.getTime() - now.getTime() <= THREE_DAYS_MS) return 'expiring-soon'
  return 'ok'
}

function formatExpiry(batch: BatchRow, now: Date): string | null {
  const expiry = getEffectiveExpiry(batch)
  if (!expiry) return null
  if (expiry < now) return `Expired ${dayjs(expiry).fromNow()}`
  return `Expires ${dayjs(expiry).fromNow()}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BatchWastePicker({ productName, batches, value, onChange, showReasonFields = true }: BatchWastePickerProps) {
  const now = useMemo(() => new Date(), [])

  // On first render, pre-select all expired batches with their full quantity
  useEffect(() => {
    if (value.selections.length > 0) return // already initialised by caller
    const expired = batches.filter(b => getExpiryStatus(b, now) === 'expired' && b.quantity > 0)
    if (expired.length === 0) return

    onChange({
      ...value,
      selections: expired.map(b => ({ inventoryId: b.inventoryId, quantity: b.quantity })),
      reason: value.reason || 'Expired',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount

  // Derived: set of selected inventoryIds for quick lookup
  const selectedIds = useMemo(() => new Set(value.selections.map(s => s.inventoryId)), [value.selections])

  // When all selected batches are expired, default reason to "Expired"
  const allSelectedExpired = useMemo(() => {
    if (value.selections.length === 0) return false
    return value.selections.every(s => {
      const batch = batches.find(b => b.inventoryId === s.inventoryId)
      if (!batch) return false
      return getExpiryStatus(batch, now) === 'expired'
    })
  }, [value.selections, batches, now])

  // Totals for summary line
  const { totalQty, totalValue } = useMemo(() => {
    return value.selections.reduce(
      (acc, s) => {
        const batch = batches.find(b => b.inventoryId === s.inventoryId)
        const cost = batch ? Math.round(batch.costPrice * s.quantity) : 0
        return { totalQty: acc.totalQty + s.quantity, totalValue: acc.totalValue + cost }
      },
      { totalQty: 0, totalValue: 0 },
    )
  }, [value.selections, batches])

  // ── Handlers ────────────────────────────────────────────────────────────

  function toggleBatch(inventoryId: string, checked: boolean) {
    if (checked) {
      const batch = batches.find(b => b.inventoryId === inventoryId)
      const newSelection: WasteBatchSelection = { inventoryId, quantity: batch?.quantity ?? 0 }
      const next = [...value.selections, newSelection]
      const reason = resolveReason(next, value.reason)
      onChange({ ...value, selections: next, reason })
    } else {
      const next = value.selections.filter(s => s.inventoryId !== inventoryId)
      const reason = resolveReason(next, value.reason)
      onChange({ ...value, selections: next, reason })
    }
  }

  function updateQty(inventoryId: string, qty: number) {
    const next = value.selections.map(s => (s.inventoryId === inventoryId ? { ...s, quantity: qty } : s))
    onChange({ ...value, selections: next })
  }

  function resolveReason(selections: WasteBatchSelection[], current: string): string {
    if (selections.length === 0) return current
    const allExpired = selections.every(s => {
      const b = batches.find(x => x.inventoryId === s.inventoryId)
      return b ? getExpiryStatus(b, now) === 'expired' : false
    })
    // Only auto-set to Expired if it hasn't been manually changed away
    if (allExpired && (current === '' || current === 'Expired')) return 'Expired'
    return current
  }

  const hasBatches = batches.length > 0
  const hasSelections = value.selections.some(s => s.quantity > 0)

  return (
    <div className='space-y-4'>
      {/* Product header */}
      <div className='rounded-lg border bg-muted/50 px-4 py-3'>
        <p className='font-semibold text-sm'>{productName}</p>
        <p className='text-xs text-muted-foreground mt-0.5'>
          {batches.length} batch{batches.length !== 1 ? 'es' : ''} available · select batches to write off
        </p>
      </div>

      {/* Batch list */}
      {!hasBatches ? (
        <div className='flex flex-col items-center gap-2 py-8 text-center'>
          <PackageX className='h-8 w-8 text-muted-foreground/40' />
          <p className='text-sm text-muted-foreground'>No inventory batches found for this product</p>
        </div>
      ) : (
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground uppercase tracking-wide'>Batches</Label>
          {batches.map(batch => {
            const status = getExpiryStatus(batch, now)
            const expiryLabel = formatExpiry(batch, now)
            const isSelected = selectedIds.has(batch.inventoryId)
            const selection = value.selections.find(s => s.inventoryId === batch.inventoryId)
            const inputQty = selection?.quantity ?? 0
            const isOverQty = inputQty > batch.quantity

            return (
              <div
                key={batch.inventoryId}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isSelected
                    ? 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20'
                    : 'border-border bg-card hover:bg-muted/30',
                  status === 'expired' && !isSelected && 'border-rose-200 bg-rose-50/20 dark:border-rose-900/50',
                  status === 'expiring-soon' && !isSelected && 'border-amber-200 bg-amber-50/20 dark:border-amber-900/50',
                )}
              >
                <div className='flex items-start gap-3'>
                  {/* Checkbox */}
                  <Checkbox
                    id={`batch-${batch.inventoryId}`}
                    checked={isSelected}
                    onCheckedChange={checked => toggleBatch(batch.inventoryId, !!checked)}
                    className='mt-0.5 shrink-0'
                    disabled={batch.quantity <= 0}
                  />

                  {/* Batch info */}
                  <div className='flex-1 min-w-0 space-y-1.5'>
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span className='text-sm font-medium'>
                        {batch.batchNumber ?? `Batch #${batch.inventoryId.slice(-6).toUpperCase()}`}
                      </span>

                      {/* Expiry badges */}
                      {status === 'expired' && (
                        <Badge variant='destructive' className='text-[10px] px-1.5 py-0'>
                          Expired
                        </Badge>
                      )}
                      {status === 'expiring-soon' && (
                        <Badge className='text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'>
                          Expiring Soon
                        </Badge>
                      )}
                      {batch.locationLabel && (
                        <span className='text-xs text-muted-foreground'>@ {batch.locationLabel}</span>
                      )}
                    </div>

                    <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                      <span>
                        Available:{' '}
                        <span className={cn('font-medium', batch.quantity <= 0 && 'text-rose-500')}>
                          {batch.quantity.toLocaleString()} {batch.unitAbbreviation}
                        </span>
                      </span>
                      {expiryLabel && (
                        <span className={cn('flex items-center gap-1', status === 'expired' && 'text-rose-500', status === 'expiring-soon' && 'text-amber-600')}>
                          <Clock className='h-3 w-3' />
                          {expiryLabel}
                        </span>
                      )}
                      {batch.costPrice > 0 && (
                        <span>
                          ₱{(batch.costPrice / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/unit
                        </span>
                      )}
                    </div>

                    {/* Quantity input — only shown when batch is checked */}
                    {isSelected && (
                      <div className='flex items-center gap-2 pt-1'>
                        <div className='flex items-center gap-2 flex-1'>
                          <Input
                            type='number'
                            min='0.01'
                            max={batch.quantity}
                            step='0.01'
                            value={inputQty || ''}
                            onChange={e => updateQty(batch.inventoryId, Number(e.target.value))}
                            className={cn('h-7 text-sm w-28', isOverQty && 'border-rose-400 focus-visible:ring-rose-400')}
                            placeholder='0'
                          />
                          <span className='text-xs text-muted-foreground'>{batch.unitAbbreviation}</span>
                          {/* Quick-fill full quantity button */}
                          {inputQty !== batch.quantity && (
                            <button
                              type='button'
                              onClick={() => updateQty(batch.inventoryId, batch.quantity)}
                              className='text-xs text-primary underline-offset-2 hover:underline'
                            >
                              All ({batch.quantity})
                            </button>
                          )}
                        </div>
                        {isOverQty && (
                          <span className='text-xs text-rose-500'>Exceeds available</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reason + notes fields */}
      {showReasonFields && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='waste-reason'>
              Reason
              {allSelectedExpired && (
                <span className='ml-2 text-xs text-muted-foreground font-normal'>(auto-set from expired batches)</span>
              )}
            </Label>
            <Select value={value.reason} onValueChange={reason => onChange({ ...value, reason })}>
              <SelectTrigger id='waste-reason'>
                <SelectValue placeholder='Select a reason' />
              </SelectTrigger>
              <SelectContent>
                {WASTE_REASONS.map(r => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='waste-notes'>Notes (optional)</Label>
            <Textarea
              id='waste-notes'
              placeholder='Describe condition, location, or any other details…'
              rows={2}
              value={value.notes}
              onChange={e => onChange({ ...value, notes: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Summary confirmation banner */}
      {hasSelections && (
        <div className='rounded-lg border border-orange-300/60 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-950/20 p-3'>
          <div className='flex items-start gap-2'>
            <AlertTriangle className='h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5' />
            <div className='text-sm text-orange-700 dark:text-orange-300 space-y-0.5'>
              <p>
                Writing off{' '}
                <strong>
                  {totalQty.toLocaleString()} {batches[0]?.unitAbbreviation ?? 'units'}
                </strong>{' '}
                across <strong>{value.selections.filter(s => s.quantity > 0).length}</strong> batch
                {value.selections.filter(s => s.quantity > 0).length !== 1 ? 'es' : ''}.
                {totalValue > 0 && (
                  <> Est. value lost:{' '}
                    <strong>₱{(totalValue / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </>
                )}
              </p>
              <p className='text-xs text-orange-600 dark:text-orange-400/80'>This cannot be undone.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
