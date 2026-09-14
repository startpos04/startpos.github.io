import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platform/components/ui/table'
import { usePermission } from '@platform/hooks/use-permission'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { cn } from '@platform/lib/utils'
import { Trash2 } from 'lucide-react'
import { InventoryType } from 'prisma/generated/prisma/enums'
import type { InventoryData } from '..'
import { showInventoryReportsSidebar } from './inventory-reports-sidebar'
import { RecordStockWasteSidebar } from './record-stock-waste-sidebar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function hasExpiredBatch(batches: Array<{ expiryDate?: Date | null }>): boolean {
  const now = new Date()
  return batches.some(b => b.expiryDate && new Date(b.expiryDate) < now)
}

function hasExpiringBatch(batches: Array<{ expiryDate?: Date | null }>): boolean {
  const now = new Date()
  return batches.some(b => {
    if (!b.expiryDate) return false
    const exp = new Date(b.expiryDate)
    return exp >= now && exp.getTime() - now.getTime() <= THREE_DAYS_MS
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StockLevels({ inventoryData }: { inventoryData: InventoryData }) {
  const canWriteOff = usePermission(Permissions.BRANCH_ADJUST_INVENTORY)

  const handleWriteOff = (variantId: string, productName: string, variantName: string) => {
    const displayName = variantName !== productName ? `${productName} — ${variantName}` : productName
    showInventoryReportsSidebar(<RecordStockWasteSidebar variantId={variantId} productName={displayName} />)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Levels &amp; Valuation</CardTitle>
        <CardDescription>Detailed breakdown of physical goods and raw materials.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product / Variant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Batch Info</TableHead>
              <TableHead className='text-right'>Asset Value</TableHead>
              {canWriteOff && <TableHead className='w-[100px]' />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryData.map(product =>
              product.variants.map((variant, variantIdx) => {
                // Only show raw material batches for write-off (finished goods use /preparation)
                const rawBatches = variant.inventory.filter(i => i.inventoryType === InventoryType.RAW_MATERIAL)
                const totalQty = variant.inventory.reduce((acc, i) => acc + i.quantity, 0)
                const assetValue = variant.inventory.reduce((acc, i) => acc + i.quantity * i.costPrice, 0)

                const expired = hasExpiredBatch(rawBatches)
                const expiringSoon = !expired && hasExpiringBatch(rawBatches)

                // Show product name only on first variant row, indent subsequent ones
                const isFirstVariant = variantIdx === 0
                const hasMultipleVariants = product.variants.length > 1

                return (
                  <TableRow
                    key={variant.id}
                    className={cn(expired && 'bg-rose-50/40 dark:bg-rose-950/10', expiringSoon && 'bg-amber-50/40 dark:bg-amber-950/10')}
                  >
                    {/* Product / Variant name */}
                    <TableCell className='font-medium'>
                      <div className='flex flex-col'>
                        {isFirstVariant ? <span>{product.name}</span> : <span className='text-muted-foreground text-xs pl-2'>↳</span>}
                        {hasMultipleVariants && <span className={cn('text-xs text-muted-foreground', !isFirstVariant && 'pl-4')}>{variant.name}</span>}
                        {isFirstVariant && <span className='text-xs text-muted-foreground'>{product.category?.name}</span>}
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge variant='outline'>{product.type}</Badge>
                    </TableCell>

                    {/* Stock */}
                    <TableCell>
                      <span className={cn(totalQty < 10 ? 'text-rose-600 font-bold' : '')}>{totalQty.toLocaleString()}</span>
                    </TableCell>

                    {/* Unit */}
                    <TableCell>{product.baseUnit?.abbreviation}</TableCell>

                    {/* Batch info */}
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {product.hasExpiry && (
                          <Badge variant='secondary' className='text-[10px]'>
                            Exp. Tracking
                          </Badge>
                        )}
                        {expired && (
                          <Badge variant='destructive' className='text-[10px]'>
                            Batch Expired
                          </Badge>
                        )}
                        {expiringSoon && (
                          <Badge className='text-[10px] bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'>
                            Expiring Soon
                          </Badge>
                        )}
                        {product.requiresDeposit && (
                          <Badge variant='secondary' className='text-[10px] bg-blue-50'>
                            Deposit
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Asset value */}
                    <TableCell className='text-right'>₱{(assetValue / 100).toLocaleString()}</TableCell>

                    {/* Write Off action */}
                    {canWriteOff && (
                      <TableCell>
                        {rawBatches.length > 0 && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className={cn(
                              'h-7 px-2 text-xs gap-1',
                              expired
                                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                            onClick={() => handleWriteOff(variant.id, product.name, variant.name)}
                          >
                            <Trash2 className='h-3 w-3' />
                            Write Off
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              }),
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
