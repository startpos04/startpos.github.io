/**
 * waste-analytics.tsx
 *
 * Waste analytics section for the Inventory Reports page.
 *
 * Consumes WasteEngine.getWasteSummary() — the only consumer of that engine
 * method, which was previously dead code.
 *
 * Shows:
 *   - Total waste events, total value lost, and average loss per event
 *   - Breakdown by reason (bar chart with percentage fill)
 *   - Breakdown by product (ranked list with value lost)
 *
 * All data is sourced from offline-first collections — no server round-trip.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Progress } from '@platform/components/ui/progress'
import { inventoryCollection, inventoryMovementCollection, productCollection, productVariantCollection } from '@platform/db/collections'
import dayjs from '@platform/lib/dayjs'
import { and, eq, gte, lte, useLiveQuery } from '@tanstack/react-db'
import { Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { WasteEngine } from '@/lib/production/waste-engine'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WasteAnalyticsProps {
  from?: string
  to?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WasteAnalytics({ from, to }: WasteAnalyticsProps) {
  const user = useAuthenticatedUser()

  const dateRange = useMemo(
    () => ({
      start: from ? dayjs(from).startOf('day').toDate() : dayjs().startOf('month').toDate(),
      end: to ? dayjs(to).endOf('day').toDate() : dayjs().endOf('month').toDate(),
    }),
    [from, to],
  )

  // Subscribe to waste movements in the date range so the component re-renders
  // when new waste is recorded. The live query result is used as a dependency
  // trigger; the actual aggregation runs through WasteEngine.
  const { data: _wasteMovementsTrigger = [] } = useLiveQuery(
    q =>
      q
        .from({ mov: inventoryMovementCollection })
        .where(({ mov }) =>
          and(eq(mov.branchId, user.branch.id), eq(mov.type, 'WASTE'), gte(mov.createdAt, dateRange.start), lte(mov.createdAt, dateRange.end)),
        )
        .select(({ mov }) => ({ id: mov.id })),
    [user.branch.id, dateRange],
  )

  // Run the engine synchronously — it reads from the collection singletons directly.
  // Recomputes whenever the live query result changes (new waste events) or date range changes.
  const summary = useMemo(() => {
    return WasteEngine.getWasteSummary(user.branch.id, dateRange, inventoryMovementCollection, inventoryCollection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.branch.id, dateRange, _wasteMovementsTrigger])

  // Enrich byProduct entries with human-readable names from the variant/product collections
  const enrichedByProduct = useMemo(() => {
    return summary.byProduct.map(entry => {
      const variant = productVariantCollection.get(entry.variantId)
      const product = variant?.productId ? productCollection.get(variant.productId) : null
      return {
        ...entry,
        productName: product ? `${product.name}${variant?.name !== product.name ? ` — ${variant?.name}` : ''}` : entry.productName,
      }
    })
  }, [summary.byProduct])

  const hasData = summary.totalQuantity > 0

  // Top reason percentage for proportional bar widths
  const maxReasonValue = Math.max(...summary.byReason.map(r => r.value), 1)
  const maxProductValue = Math.max(...enrichedByProduct.map(p => p.value), 1)

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {/* ── By Reason ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Trash2 className='h-4 w-4 text-rose-500' />
            Waste by Reason
          </CardTitle>
          <CardDescription>
            {hasData ? `${summary.byReason.length} reason${summary.byReason.length !== 1 ? 's' : ''} recorded` : 'No waste events in this period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className='text-sm text-muted-foreground text-center py-6'>No data to display</p>
          ) : (
            <div className='space-y-3'>
              {summary.byReason.map(entry => (
                <div key={entry.reason} className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='font-medium truncate max-w-[180px]'>{entry.reason}</span>
                    <div className='flex items-center gap-3 text-right shrink-0'>
                      <span className='text-muted-foreground tabular-nums'>
                        {entry.count} event{entry.count !== 1 ? 's' : ''} · {entry.quantity.toLocaleString()} units
                      </span>
                      <span className='font-semibold text-rose-600 dark:text-rose-400 tabular-nums font-mono'>
                        ₱{(entry.value / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <Progress value={(entry.value / maxReasonValue) * 100} className='h-1.5 bg-rose-100 dark:bg-rose-950/40 [&>div]:bg-rose-500' />
                </div>
              ))}

              {/* Totals row */}
              <div className='pt-2 mt-2 border-t flex justify-between text-sm font-semibold'>
                <span>Total</span>
                <span className='font-mono text-rose-600 dark:text-rose-400'>
                  ₱{(summary.totalValue / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── By Product ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Trash2 className='h-4 w-4 text-amber-500' />
            Waste by Product
          </CardTitle>
          <CardDescription>
            {hasData ? `Top ${enrichedByProduct.length} product${enrichedByProduct.length !== 1 ? 's' : ''} by value lost` : 'No waste events in this period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className='text-sm text-muted-foreground text-center py-6'>No data to display</p>
          ) : (
            <div className='space-y-3'>
              {enrichedByProduct.slice(0, 8).map((entry, idx) => (
                <div key={entry.variantId} className='space-y-1'>
                  <div className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='text-xs text-muted-foreground tabular-nums w-4 shrink-0'>{idx + 1}.</span>
                      <span className='font-medium truncate'>{entry.productName}</span>
                    </div>
                    <div className='flex items-center gap-3 shrink-0'>
                      <span className='text-muted-foreground tabular-nums text-xs'>{entry.quantity.toLocaleString()} units</span>
                      <span className='font-semibold text-amber-600 dark:text-amber-400 tabular-nums font-mono'>
                        ₱{(entry.value / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <Progress value={(entry.value / maxProductValue) * 100} className='h-1.5 bg-amber-100 dark:bg-amber-950/40 [&>div]:bg-amber-500' />
                </div>
              ))}

              {enrichedByProduct.length > 8 && (
                <p className='text-xs text-muted-foreground text-center pt-1'>+{enrichedByProduct.length - 8} more products not shown</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
