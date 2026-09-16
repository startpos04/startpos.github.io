import { Form } from '@platform/components/custom/form'
import { CashDenominationInput } from '@platform/components/custom/form/cash-denomination-input'
import { Button } from '@platform/components/ui/button'
import { Skeleton } from '@platform/components/ui/skeleton'
import { membershipCollection, operationalTaskCollection, transactionCollection, vendorSessionCollection } from '@platform/db/collections'
import { dbTransaction } from '@platform/db/local-db-transaction'
import { useAppForm } from '@platform/hooks/form'
import { useCapability } from '@platform/hooks/use-capability'
import dayjs from '@platform/lib/dayjs'
import { Capabilities } from '@platform/lib/entitlement/capability-keys'
import type { MountProps } from '@platform/lib/mount-manager'
import { and, count, eq, gte, inArray, lte, sum, useLiveQuery } from '@tanstack/react-db'
import { formOptions, useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import type { VendorSession } from 'prisma/generated/prisma/browser'
import { NotificationType, Role, SessionStatus, TaskStatus } from 'prisma/generated/prisma/enums'
import { useState } from 'react'
import { toast } from 'sonner'
import { logout } from '@/lib/better-auth/auth-engine'
import { authStore, useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { PriceEngine } from '@/lib/conversion/price-engine'
import { NotificationEngine } from '@/lib/notification/notification-engine'

export const closeSessionFormOpts = formOptions({
  defaultValues: {
    closingCash: 0,
    notes: '' as string | null,
  },
})

type SubmissionType = 'CREATE_TASK' | 'INSTANT_RECONCILE'

export function ReconcileLater({ onClose }: MountProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('CREATE_TASK')
  const user = useAuthenticatedUser()
  const navigate = useNavigate()
  const canCreateTask = useCapability(Capabilities.CREATE_TASK)

  const members = useLiveQuery(q => q.from({ member: membershipCollection }).where(({ member }) => inArray(member.role, [Role.ADMIN, Role.SUPERVISOR])), [])
  const sessions = useLiveQuery(
    q =>
      q
        .from({ session: vendorSessionCollection })
        .where(({ session }) => eq(session.id, user.vendorSession?.id))
        .leftJoin({ task: operationalTaskCollection }, ({ task, session }) => eq(session.operationalTaskId, task.id))
        .select(({ session, task }) => ({ ...session, operationalTask: task })),
    [],
  )

  const transactions = useLiveQuery(
    q =>
      q
        .from({ transaction: transactionCollection })
        .where(({ transaction }) =>
          and(
            eq(transaction.cashierId, user.id),
            gte(transaction.createdAt, dayjs(user.vendorSession?.startTime).toDate()),
            lte(transaction.createdAt, dayjs().endOf('day').toDate()),
          ),
        )
        .select(({ transaction }) => ({ totalSales: sum(transaction.totalAmount), totalTransactions: count(transaction.id) })),
    [],
  )

  const expectedCash = (user.vendorSession?.openingCash || 0) + (Number(transactions.data?.[0]?.totalSales) || 0)

  const form = useAppForm({
    ...closeSessionFormOpts,
    defaultValues: {
      closingCash: 0,
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const session = sessions.data[0]
      const admins = members.data
      if (!session?.id) return
      if (admins.length === 0) return

      const result = await dbTransaction(() => {
        const verifiedCash = Number(value.closingCash)
        const variance = verifiedCash - expectedCash

        // Create the Reconciliation Task
        operationalTaskCollection.update(session.operationalTaskId, draft => {
          draft.status = TaskStatus.IN_PROGRESS
          draft.notes = value.notes || `Reconciliation for session ${session.id}`
          draft.dueDate = dayjs().endOf('day').toDate()
          // B5: capture verifiedCash and variance so the supervisor can see the discrepancy on review
          draft.metadata = { vendorSessionId: session.id, expectedCash, approvedCash: value.closingCash, verifiedCash, variance }
          draft.inProgressAt = new Date()
        })

        // Update the Session
        vendorSessionCollection.update(session.id, draft => {
          draft.status = SessionStatus.CLOSED
          draft.endTime = new Date()
          draft.closingCash = verifiedCash
          draft.expectedCash = expectedCash
          // DEV-8: write verifiedCash to session record so both reconciliation paths
          // produce a consistent session state. ReconcileNow already sets this field;
          // ReconcileLater was the only path that left it null.
          // The supervisor's REVIEWED step on the task is the formal confirmation;
          // this write records the cashier's submitted count at session close time.
          draft.verifiedCash = verifiedCash
        })

        NotificationEngine.send(
          admins.map(admin => admin.userId),
          {
            type: NotificationType.COMPLIANCE_REMINDER,
            title: 'Shift Closed & Awaiting Review',
            message: `${user.name || 'A cashier'} has ended their shift for session ${session.id}. Expected: ${PriceEngine.format(expectedCash)}, Actual: ${PriceEngine.format(Number(value.closingCash))}.`,
            metadata: { vendorSessionId: session.id, taskId: session.operationalTaskId },
            link: `/tasks/${session.operationalTaskId}`,
          },
        )
      })

      if (result.isErr()) {
        console.error('Transaction failed:', result.error.message)
        toast.error('Failed to close session.')
        return
      }

      // Update global state and reload to reset POS gate
      authStore.setState(state => ({
        ...state,
        user: {
          ...state.user,
          vendorSession: vendorSessionCollection.get(session.id) as VendorSession,
        },
      }))
      toast.success('Shift ended successfully')

      onClose()
      if (user.role === Role.CASHIER) logout({ onSuccess: () => navigate({ to: '/login' }) })
      else navigate({ to: user.landingPage })
    },
  })

  // Read closing cash for denomination input
  const closingCash = useStore(form.store, s => s.values.closingCash)
  const variance = closingCash - expectedCash

  return (
    <Form onSubmit={form.handleSubmit} className='space-y-2'>
      {/* Summary Grid - Ultra Compact */}
      <div className='grid grid-cols-4 gap-1.5'>
        <div className='p-2 rounded-lg bg-muted/30 border border-border/50'>
          <p className='text-[8px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider'>Txns</p>
          {transactions.isLoading ? (
            <Skeleton className='h-6 w-full rounded-lg' />
          ) : (
            <p className='text-base font-bold tracking-tight'>{transactions.data?.[0]?.totalTransactions || 0}</p>
          )}
        </div>

        <div className='p-2 rounded-lg bg-muted/30 border border-border/50'>
          <p className='text-[8px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider'>Sales</p>
          {transactions.isLoading ? (
            <Skeleton className='h-6 w-full rounded-lg' />
          ) : (
            <p className='text-base font-bold tracking-tight'>{PriceEngine.format(Number(transactions.data?.[0]?.totalSales) || 0)}</p>
          )}
        </div>

        <div className='p-2 rounded-lg bg-muted/30 border border-border/50'>
          <p className='text-[8px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider'>Opening</p>
          {transactions.isLoading ? (
            <Skeleton className='h-6 w-full rounded-lg' />
          ) : (
            <p className='text-base font-bold tracking-tight'>{PriceEngine.format(Number(user.vendorSession?.openingCash) || 0)}</p>
          )}
        </div>

        <div className='p-2 rounded-lg bg-primary/10 border border-primary/20'>
          <p className='text-[8px] uppercase font-bold text-primary mb-0.5 tracking-wider'>Expected</p>
          {transactions.isLoading ? (
            <Skeleton className='h-6 w-full rounded-lg' />
          ) : (
            <p className='text-base font-black text-primary'>{PriceEngine.format(expectedCash)}</p>
          )}
        </div>
      </div>

      {/* Compact Actual Cash Display with Variance */}
      <div className='rounded-lg bg-background border border-border/60 p-2'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex-1'>
            <p className='text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5'>Actual Cash</p>
            <p className='text-xl font-black font-mono tabular-nums text-foreground leading-none'>{PriceEngine.format(closingCash)}</p>
          </div>
          {closingCash > 0 && (
            <div className='text-right'>
              <p className='text-[8px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5'>Variance</p>
              <p
                className={`text-lg font-black font-mono tabular-nums leading-none ${
                  variance === 0 ? 'text-emerald-500' : variance > 0 ? 'text-blue-500' : 'text-amber-500'
                }`}
              >
                {variance === 0 ? '✓' : variance > 0 ? `+${PriceEngine.format(variance)}` : PriceEngine.format(variance)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Denominations - Compact */}
      <CashDenominationInput
        value={closingCash}
        onChange={cents => form.setFieldValue('closingCash', cents)}
        onExact={() => form.setFieldValue('closingCash', expectedCash)}
        onClear={() => form.setFieldValue('closingCash', 0)}
        isExactSelected={closingCash === expectedCash}
        showActions={true}
        className='space-y-2'
      />

      {/* Submit Button */}
      <form.Subscribe
        selector={state => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type='submit'
            disabled={!canSubmit || transactions.isLoading || closingCash === 0}
            onClick={() => setSubmissionType('CREATE_TASK')}
            className='w-full h-10 rounded-lg text-sm font-bold gap-2'
          >
            {isSubmitting && submissionType === 'CREATE_TASK' ? (
              'Creating Task...'
            ) : (
              <>
                <CheckCircle2 className='size-4' /> Create Task with {PriceEngine.format(closingCash)}
              </>
            )}
          </Button>
        )}
      />
    </Form>
  )
}
