/**
 * open-session-dialog.tsx — Start Shift modal
 *
 * Shown when an employee needs to start a shift to use the POS.
 * The employee cannot proceed until they open a session.
 *
 * Behaviour:
 *   - Blocks navigation — no close button, no backdrop dismiss.
 *   - Creates a vendor session and operational task in dbTransaction.
 *   - Updates authStore so the session check passes immediately without reload.
 *
 * When shown:
 *   - When user has no active vendor session and canReconcile capability is enabled.
 */

import { Form } from '@platform/components/custom/form'
import { CashDenominationInput } from '@platform/components/custom/form/cash-denomination-input'
import { Button } from '@platform/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@platform/components/ui/dialog'
import { operationalTaskCollection, vendorSessionCollection } from '@platform/db/collections'
import { dbTransaction } from '@platform/db/local-db-transaction'
import { cn } from '@platform/lib/utils'
import { useForm, useStore } from '@tanstack/react-form'
import { Banknote, Info, PlayCircle } from 'lucide-react'
import { SessionStatus, TaskStatus, TaskType } from 'prisma/generated/prisma/enums'
import { toast } from 'sonner'
import { z } from 'zod'
import { authStore, useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { PriceEngine } from '@/lib/conversion/price-engine'

export const createSessionSchema = z
  .object({
    openingCash: z.number({ error: 'Starting float is required' }).min(0, 'Starting float cannot be negative'),
    notes: z.string(),
  })
  .refine(
    _ => {
      const hasActiveSession = [...vendorSessionCollection.values()].some(s => s.status === 'OPEN')
      return !hasActiveSession
    },
    {
      message: 'You have an existing open session. Please close it before starting a new one.',
      path: ['openingCash'],
    },
  )

export type CreateSessionFormData = z.infer<typeof createSessionSchema>

// ---------------------------------------------------------------------------
// Session check
// ---------------------------------------------------------------------------

export function needsSession(vendorSession: { status: SessionStatus } | null, canReconcile: boolean): boolean {
  // If cash reconciliation is not enabled, sessions are not required
  if (!canReconcile) return false

  // If no session exists or session is closed, need to start a new one
  return !vendorSession || vendorSession.status !== SessionStatus.OPEN
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpenSessionDialog() {
  const user = useAuthenticatedUser()

  // Reactively compute if session is needed - will update when user.vendorSession changes
  const shouldShow = needsSession(user.vendorSession, true)

  const form = useForm({
    defaultValues: {
      openingCash: 0, // Start at 0, user builds with denominations
      notes: '',
    },
    validators: {
      onChange: createSessionSchema,
    },
    onSubmit: async ({ value }) => {
      const taskId = crypto.randomUUID()
      const session = {
        id: crypto.randomUUID(),
        userId: user.id,
        startTime: new Date(),
        openingCash: Number(value.openingCash),
        status: SessionStatus.OPEN,
        notes: value.notes || null,
        endTime: null,
        closingCash: null,
        expectedCash: null,
        verifiedCash: null,
        operationalTaskId: taskId,
        businessId: user.business.id,
        branchId: user.branch.id,
      }

      const result = await dbTransaction(() => {
        operationalTaskCollection.insert({
          id: taskId,
          type: TaskType.CASH_RECONCILIATION,
          status: TaskStatus.DRAFT,
          notes: null,
          dueDate: new Date(),
          creatorId: user.id,
          approverId: user.id,
          clerkId: user.id,
          metadata: {
            expectedCash: null,
            approvedCash: null,
            verifiedCash: null,
          },
          approvedAt: new Date(),
          inProgressAt: new Date(),
          fulfilledAt: null,
          reviewedAt: null,
          reviewerId: null,
          canceledAt: null,
          cancelerId: null,
          businessId: user.business.id,
          branchId: user.branch.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        vendorSessionCollection.insert(session)
      })

      if (result.isErr()) {
        console.error('Transaction failed:', result.error.message)
        toast.error('Failed to start shift. Please try again.')
        return
      }

      // Update auth store AFTER the transaction confirms — moving this inside
      // the dbTransaction callback fired it prematurely, causing the POS guard
      // useEffect to re-run with a stale user reference and re-show the dialog.
      authStore.setState(state => ({
        ...state,
        user: {
          ...state.user,
          vendorSession: session,
        },
      }))

      toast.success('Shift started successfully')
      // Dialog will automatically close because shouldShow will become false
    },
  })

  // Read opening cash for denomination input handlers
  const openingCash = useStore(form.store, s => s.values.openingCash)

  // Don't render if session is not needed
  if (!shouldShow) return null

  return (
    <Dialog
      open={shouldShow}
      // Intentionally no onOpenChange — this dialog cannot be dismissed
      // without starting a session. The employee must start a shift to continue.
    >
      <DialogContent
        className='sm:max-w-lg'
        data-testid='open-session-dialog'
        // Remove the default close button by overriding onPointerDownOutside
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='text-2xl font-bold tracking-tight flex items-center gap-2'>
            <Banknote className='w-6 h-6 text-primary' />
            Start Your Shift
          </DialogTitle>
          <DialogDescription className='text-base'>Count your starting cash to begin.</DialogDescription>
        </DialogHeader>

        <Form onSubmit={form.handleSubmit} className='space-y-4'>
          {/* Current Amount Display */}
          <div className='rounded-xl bg-primary/5 border border-primary/20 p-4'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1'>Starting Cash</p>
            <p className='text-3xl font-black font-mono tabular-nums text-primary leading-none'>{PriceEngine.format(openingCash)}</p>
          </div>

          {/* Cash Denominations */}
          <CashDenominationInput
            value={openingCash}
            onChange={cents => form.setFieldValue('openingCash', cents)}
            onClear={() => form.setFieldValue('openingCash', 0)}
            showActions={true}
          />

          {/* Info Banner */}
          <div className='bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 flex gap-3'>
            <Info className='h-4 w-4 text-blue-500 shrink-0 mt-0.5' />
            <p className='text-xs text-blue-700 dark:text-blue-300 leading-relaxed'>
              Opening the session will track all transactions until you close the shift.
            </p>
          </div>

          {/* Submit Button */}
          <form.Subscribe
            selector={state => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type='submit'
                disabled={!canSubmit || openingCash === 0}
                className={cn('w-full gap-2 h-12 text-base font-bold')}
                data-testid='start-shift-button'
              >
                {isSubmitting ? (
                  'Starting Shift...'
                ) : (
                  <>
                    <PlayCircle className='h-5 w-5' /> Start Shift with {PriceEngine.format(openingCash)}
                  </>
                )}
              </Button>
            )}
          />
        </Form>
      </DialogContent>
    </Dialog>
  )
}
