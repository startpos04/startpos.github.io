/**
 * VariantDetailBlock / VariantsTab
 *
 * VariantDetailBlock — renders a single variant's full detail:
 *   • Price / Cost / SKU stat row
 *   • Stock batches table (when hasInventory)
 *   • Ingredients list with per-ingredient restock (when has recipe)
 *   • Add-ons list
 *   • Direct Restock button (when hasInventory and no recipe)
 *
 * VariantsTab — exported for use in the Tab component.
 *   Renders VariantDetailBlock for the specific variant passed via props.
 *   The parent ($productId/index.tsx) creates one Tab entry per variant,
 *   so each tab receives a single variant.
 */

import { Button } from '@platform/components/ui/button'
import { Separator } from '@platform/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platform/components/ui/table'
import dayjs from '@platform/lib/dayjs'
import { AlertTriangle, Package, Trash2 } from 'lucide-react'
import { PriceEngine } from '@/lib/conversion/price-engine'
import type { posProduct } from '@/lib/queries/fetch-pos-products'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VariantDetailBlockProps {
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  variant: any
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  product: any
  hasInventory: boolean
  /** Sales count for this specific variant */
  salesCount?: number
  /** Hide the per-variant stat row (price/cost/SKU/sales/stock) — used when single-variant
   *  since the parent header band already shows those numbers */
  hideStatRow?: boolean
  /** Called when the user clicks Restock on a direct (no-recipe) variant */
  onRestockVariant?: (variant: posProduct['variants'][number]) => void
  /** Called when the user clicks Restock on an ingredient */
  onRestockIngredient?: (ingredientVariant: posProduct['variants'][number]) => void
  /** Called when the user clicks Waste on a batch row — passes variant + inventoryId */
  onRecordWaste?: (variant: posProduct['variants'][number], inventoryId: string) => void
}

// ---------------------------------------------------------------------------
// VariantDetailBlock — the shared rendering logic
// ---------------------------------------------------------------------------

export function VariantDetailBlock({
  variant,
  product,
  hasInventory,
  salesCount = 0,
  hideStatRow = false,
  onRestockVariant,
  onRestockIngredient,
  onRecordWaste,
}: VariantDetailBlockProps) {
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  const ingredients = (variant.components ?? []).filter((c: any) => !c.isAddon)
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  const addons = (variant.components ?? []).filter((c: any) => c.isAddon)
  const hasRecipe = ingredients.length > 0

  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  const totalStock = (variant.inventory ?? []).reduce((acc: number, inv: any) => acc + inv.quantity, 0)

  return (
    <div className='space-y-4 px-4'>
      {/* ── Stat row — only shown for multi-variant (single-variant header already shows these) */}
      {!hideStatRow && (
        <div className='flex items-center gap-4 rounded-xl bg-muted/30 px-3 py-2.5'>
          <div>
            <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>Price</p>
            <p className='text-sm font-black font-mono'>{PriceEngine.format(variant.price)}</p>
          </div>
          <div className='w-px h-5 bg-border' />
          <div>
            <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>Cost</p>
            <p className='text-sm font-black font-mono text-muted-foreground'>{PriceEngine.format(variant.costPrice || 0)}</p>
          </div>
          <div className='w-px h-5 bg-border' />
          <div>
            <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>SKU</p>
            <p className='text-xs font-mono font-bold'>{variant.sku || '—'}</p>
          </div>
          <div className='w-px h-5 bg-border' />
          <div>
            <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>Sales</p>
            <p className='text-sm font-black'>{salesCount}</p>
          </div>
          {hasInventory && (
            <>
              <div className='w-px h-5 bg-border' />
              <div>
                <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>Stock</p>
                <p className='text-sm font-black'>{totalStock}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Stock batches ─────────────────────────────────────────────── */}
      {hasInventory && (
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Stock Batches</p>
            {/* Button group — Restock and Waste visually joined */}
            <div className='flex'>
              {!hasRecipe && onRestockVariant && (
                <Button
                  variant='outline'
                  size='sm'
                  className='h-6 text-[10px] px-2 rounded-r-none border-r-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 hover:z-10'
                  onClick={() => onRestockVariant(variant)}
                >
                  <Package className='size-2.5 mr-1' /> Restock
                </Button>
              )}
              {onRecordWaste && (variant.inventory ?? []).some((inv: any) => inv.quantity > 0) && (
                <Button
                  variant='outline'
                  size='sm'
                  className={`h-6 text-[10px] px-2 text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400 hover:z-10 ${
                    !hasRecipe && onRestockVariant ? 'rounded-l-none' : 'rounded-lg'
                  }`}
                  onClick={() => onRecordWaste(variant, '')}
                >
                  <Trash2 className='size-2.5 mr-1' /> Waste
                </Button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='text-xs'>Batch</TableHead>
                <TableHead className='text-xs'>Location</TableHead>
                <TableHead className='text-xs text-right'>Qty</TableHead>
                {onRecordWaste && <TableHead className='w-8' />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(variant.inventory ?? []).length > 0 ? (
                // biome-ignore lint/suspicious/noExplicitAny: flexibility required
                (variant.inventory as any[]).map((inv: any) => {
                  const isExpiringSoon = inv.expiryDate && dayjs(inv.expiryDate).diff(dayjs(), 'day') <= 7
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className='font-mono text-[10px] py-2'>{inv.batchNumber || 'N/A'}</TableCell>
                      <TableCell className='text-xs py-2'>{inv.location?.name ?? '—'}</TableCell>
                      <TableCell className='text-right text-xs font-bold py-2'>
                        <span className='flex items-center justify-end gap-1'>
                          {isExpiringSoon && <AlertTriangle className='size-3 text-orange-500' />}
                          {inv.quantity} {inv.unit?.abbreviation}
                        </span>
                      </TableCell>
                      {onRecordWaste && (
                        <TableCell className='py-1.5 text-right'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                            onClick={() => onRecordWaste(variant, inv.id)}
                          >
                            <Trash2 className='size-3' />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={onRecordWaste ? 4 : 3} className='text-center py-4 text-xs text-muted-foreground'>
                    No stock recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Expiry summary */}
          {(variant.inventory ?? []).some((i: any) => i.expiryDate) && (
            <p className='text-[10px] text-muted-foreground'>
              Expiry:{' '}
              {(variant.inventory as any[])
                .filter((i: any) => i.expiryDate)
                .map((i: any) => dayjs(i.expiryDate).format('MMM DD, YYYY'))
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      {/* ── Ingredients ───────────────────────────────────────────────── */}
      {ingredients.length > 0 && (
        <>
          {hasInventory && <Separator />}
          <div className='space-y-1.5'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Ingredients</p>
            {/* biome-ignore lint/suspicious/noExplicitAny: flexibility required */}
            {ingredients.map((comp: any) => {
              // biome-ignore lint/suspicious/noExplicitAny: flexibility required
              const ingStock = (comp.material.inventory ?? []).reduce((acc: number, inv: any) => acc + inv.quantity, 0)
              const isLow = ingStock < 10
              return (
                <div
                  key={comp.id}
                  className='flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='text-xs font-medium truncate'>{comp.material.product.name}</p>
                    <p className='text-[10px] text-muted-foreground font-mono'>
                      {comp.quantityUsed} {comp.unit?.abbreviation}
                      {comp.material.name && comp.material.name !== comp.material.product.name && (
                        <span className='ml-1 text-muted-foreground/60'>· {comp.material.name}</span>
                      )}
                    </p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    {isLow && <span className='text-[9px] font-bold text-orange-500 uppercase tracking-wider'>Low</span>}
                    {onRestockIngredient && (
                      <Button variant='outline' size='sm' className='h-6 text-[10px] px-2 rounded-lg' onClick={() => onRestockIngredient(comp.material)}>
                        <Package className='size-2.5 mr-1' /> Restock
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Add-ons ───────────────────────────────────────────────────── */}
      {addons.length > 0 && (
        <>
          <Separator />
          <div className='space-y-1.5'>
            <p className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Add-ons</p>
            {/* biome-ignore lint/suspicious/noExplicitAny: flexibility required */}
            {addons.map((addon: any) => (
              <div
                key={addon.id}
                className='flex items-center justify-between px-2.5 py-2 rounded-xl border border-border/50 bg-blue-50/40 dark:bg-blue-950/20'
              >
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-medium truncate'>{addon.material.product.name}</p>
                  {addon.material.name && addon.material.name !== addon.material.product.name && (
                    <p className='text-[10px] text-muted-foreground'>· {addon.material.name}</p>
                  )}
                </div>
                <p className='text-xs font-bold text-emerald-600 shrink-0'>+{PriceEngine.format(addon.priceOverride || 0)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state when no inventory capability and no recipe */}
      {!hasInventory && ingredients.length === 0 && addons.length === 0 && (
        <p className='text-xs text-muted-foreground py-2 text-center'>No additional details.</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VariantsTab — thin wrapper consumed by the Tab component.
// The parent passes a single `variant` for this tab's content.
// ---------------------------------------------------------------------------

interface VariantsTabProps {
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  variant: any
  // biome-ignore lint/suspicious/noExplicitAny: flexibility required
  product: any
  hasInventory: boolean
  salesCount?: number
  onRestockVariant?: (variant: posProduct['variants'][number]) => void
  onRestockIngredient?: (ingredientVariant: posProduct['variants'][number]) => void
  onRecordWaste?: (variant: posProduct['variants'][number], inventoryId: string) => void
}

export function VariantsTab(props: VariantsTabProps) {
  return <VariantDetailBlock {...props} />
}
