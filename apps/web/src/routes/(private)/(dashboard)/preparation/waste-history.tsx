import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { type DateRange, DateRangeInput } from '@platform/components/custom/form/date-rage-input'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import {
  inventoryCollection,
  inventoryMovementCollection,
  productCollection,
  productVariantCollection,
  unitCollection,
  userCollection,
} from '@platform/db/collections'
import dayjs from '@platform/lib/dayjs'
import { cn } from '@platform/lib/utils'
import { and, eq, gte, lte, toArray, useLiveQuery } from '@tanstack/react-db'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/(private)/(dashboard)/preparation/waste-history')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search['from'] as string) || dayjs().startOf('month').format('YYYY-MM-DD'),
    to: (search['to'] as string) || dayjs().endOf('month').format('YYYY-MM-DD'),
    page: Number(search['page']) || 1,
    pageSize: Number(search['pageSize']) || 50,
  }),
  component: RouteComponent,
})

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

export interface WasteHistoryRow {
  id: string
  variantId: string
  productName: string
  variantName: string
  quantity: number
  unitAbbreviation: string
  reason: string
  notes: string | null
  recordedBy: string
  costValue: number // cents
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const wasteHistoryCols = getColumns<WasteHistoryRow>(h => [
  h.accessor('createdAt', {
    header: 'Date',
    cell: info => (
      <span className='text-sm tabular-nums text-muted-foreground'>{dayjs(info.getValue()).format('MMM D, YYYY h:mm A')}</span>
    ),
  }),
  h.accessor('productName', {
    header: 'Product',
    cell: info => (
      <div className='flex flex-col gap-0.5'>
        <span className='font-medium text-sm'>{info.getValue()}</span>
        {info.row.original.variantName !== info.row.original.productName && (
          <span className='text-xs text-muted-foreground'>{info.row.original.variantName}</span>
        )}
      </div>
    ),
  }),
  h.accessor('quantity', {
    header: 'Qty Wasted',
    cell: info => (
      <span className='font-mono font-semibold text-sm text-rose-600 dark:text-rose-400'>
        -{info.getValue()} {info.row.original.unitAbbreviation}
      </span>
    ),
  }),
  h.accessor('reason', {
    header: 'Reason',
    cell: info => {
      const reason = info.getValue()
      const colorMap: Record<string, string> = {
        'Past Shelf Life': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
        Expired: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
        Spoiled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
        Damaged: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
        'Failed Preparation': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
        'Quality Issue': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
        Other: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
      }
      return (
        <Badge variant='outline' className={cn('text-xs', colorMap[reason] ?? colorMap['Other'])}>
          {reason}
        </Badge>
      )
    },
  }),
  h.accessor('notes', {
    header: 'Notes',
    cell: info => (
      <span className='text-sm text-muted-foreground truncate max-w-[200px] block'>
        {info.getValue() || '—'}
      </span>
    ),
  }),
  h.accessor('recordedBy', {
    header: 'Recorded By',
    cell: info => <span className='text-sm'>{info.getValue()}</span>,
  }),
  h.accessor('costValue', {
    header: 'Est. Value Lost',
    cell: info => {
      const cents = info.getValue()
      if (cents === 0) return <span className='text-sm text-muted-foreground'>—</span>
      return (
        <span className='font-mono font-semibold text-sm text-rose-600 dark:text-rose-400'>
          ₱{(cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
      )
    },
  }),
])

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RouteComponent() {
  const user = useAuthenticatedUser()
  const navigate = useNavigate({ from: Route.fullPath })
  const { from, to, page, pageSize } = useSearch({ from: '/(private)/(dashboard)/preparation/waste-history' })

  const fromDate = useMemo(() => dayjs(from).startOf('day').toDate(), [from])
  const toDate = useMemo(() => dayjs(to).endOf('day').toDate(), [to])

  // Fetch waste movements with all related data via live query
  const { data: rawRows = [], isFetching } = useLiveQuery(
    q =>
      q
        .from({ mov: inventoryMovementCollection })
        .where(({ mov }) =>
          and(
            eq(mov.branchId, user.branch.id),
            eq(mov.type, 'WASTE'),
            gte(mov.createdAt, fromDate),
            lte(mov.createdAt, toDate),
          ),
        )
        .leftJoin({ inventory: inventoryCollection }, ({ mov, inventory }) => eq(mov.inventoryId, inventory.id))
        .leftJoin({ variant: productVariantCollection }, ({ mov, variant }) => eq(mov.variantId, variant.id))
        .leftJoin({ product: productCollection }, ({ variant, product }) => eq(variant.productId, product.id))
        .leftJoin({ unit: unitCollection }, ({ mov, unit }) => eq(mov.unitId, unit.id))
        .leftJoin({ recorder: userCollection }, ({ mov, recorder }) => eq(mov.userId, recorder.id))
        .orderBy(({ mov }) => [mov.createdAt, 'desc'])
        .select(({ mov, inventory, variant, product, unit, recorder }) => ({
          id: mov.id,
          variantId: mov.variantId,
          productName: product?.name ?? 'Unknown Product',
          variantName: variant?.name ?? 'Unknown Variant',
          quantity: mov.quantity,
          unitAbbreviation: unit?.abbreviation ?? '',
          // Parse reason: format is "Waste: {reason}" or "Waste: {reason} - {notes}"
          rawReason: mov.reason ?? '',
          costPrice: inventory?.costPrice ?? 0,
          recordedByName: recorder?.name ?? 'Unknown',
          createdAt: mov.createdAt,
        })),
    [user.branch.id, fromDate, toDate],
  )

  // Parse reason/notes from the "Waste: {reason} - {notes}" format
  const rows: WasteHistoryRow[] = useMemo(() => {
    return rawRows.map(r => {
      const reasonMatch = r.rawReason.match(/^Waste: (.+?)(?:\s-\s(.+))?$/)
      const reason = reasonMatch?.[1] ?? r.rawReason
      const notes = reasonMatch?.[2] ?? null
      const costValue = Math.round(r.costPrice * r.quantity)

      return {
        id: r.id,
        variantId: r.variantId,
        productName: r.productName,
        variantName: r.variantName,
        quantity: r.quantity,
        unitAbbreviation: r.unitAbbreviation,
        reason,
        notes,
        recordedBy: r.recordedByName,
        costValue,
        createdAt: new Date(r.createdAt),
      }
    })
  }, [rawRows])

  // Summary stats
  const summary = useMemo(() => {
    const totalEvents = rows.length
    const totalValue = rows.reduce((sum, r) => sum + r.costValue, 0)
    const topReason = rows.reduce(
      (acc, r) => {
        acc[r.reason] = (acc[r.reason] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const topReasonEntry = Object.entries(topReason).sort((a, b) => b[1] - a[1])[0]

    return { totalEvents, totalValue, topReason: topReasonEntry?.[0] ?? '—' }
  }, [rows])

  // Paginate client-side
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const handleDateChange = (range: DateRange) => {
    if (!range) return
    navigate({
      search: prev => ({
        ...prev,
        from: range.from ? dayjs(range.from).format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD'),
        to: range.to ? dayjs(range.to).format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD'),
        page: 1,
      }),
    })
  }

  return (
    <div className='flex flex-col gap-6 p-4 overflow-auto'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/preparation' })} className='h-8 w-8'>
            <ArrowLeft className='size-4' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
              <Trash2 className='h-6 w-6 text-rose-500' />
              Waste History
            </h1>
            <p className='text-sm text-muted-foreground mt-0.5'>
              All waste disposal events for{' '}
              <span className='font-medium text-foreground'>{user.branch.name}</span>
            </p>
          </div>
        </div>
        <DateRangeInput
          value={{ from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined }}
          onChange={handleDateChange}
          placeholder='Select period'
        />
      </div>

      {/* Summary cards */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold'>{summary.totalEvents}</p>
            <p className='text-xs text-muted-foreground mt-1'>waste records in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Est. Value Lost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
              ₱{(summary.totalValue / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className='text-xs text-muted-foreground mt-1'>based on cost price</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Top Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold truncate'>{summary.topReason}</p>
            <p className='text-xs text-muted-foreground mt-1'>most frequent cause</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty state hint */}
      {rows.length === 0 && !isFetching && (
        <div className='flex flex-col items-center justify-center gap-3 py-16 text-center'>
          <AlertTriangle className='h-10 w-10 text-muted-foreground/40' />
          <p className='font-medium text-muted-foreground'>No waste records found</p>
          <p className='text-sm text-muted-foreground/70'>
            Waste events recorded in the Preparation module will appear here.
          </p>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <TableView
          data={paginatedRows}
          columns={wasteHistoryCols}
          isFetching={isFetching}
          emptyMessage='No waste records for this period.'
          paginable={{
            pageIndex: page - 1,
            pageSize,
            totalItems: rows.length,
            onPaginationChange: ({ pageIndex, pageSize: ps }) => {
              navigate({ search: prev => ({ ...prev, page: pageIndex + 1, pageSize: ps }) })
            },
          }}
          selectableRow={undefined}
        />
      )}
    </div>
  )
}
