/**
 * TC-INV-009 — Journey A: Expired Batch Pre-Selected, Reason Defaults to "Expired"
 *
 * Verifies the expiry-aware behaviour of the batch picker.
 * When the Record Waste sidebar opens and there are finished goods batches
 * whose effective expiry (producedAt + shelfLifeHours) has passed, those
 * batches must be:
 *   - Highlighted with a red "Expired" badge
 *   - Pre-checked automatically
 *   - Their quantity pre-filled to the full batch amount
 *   - The reason field auto-set to "Expired"
 *
 * The tester must be able to confirm without manually selecting anything.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_009: QaTestCase = {
  id: 'TC-INV-009',
  title: 'Journey A — Expired Batch Auto-Selected, Reason Defaults to Expired',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'waste',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    note: 'This test requires a FINISHED_GOOD batch whose effective expiry has already passed. Either: (a) use a product with shelfLifeHours set to a very short value and prepare a batch a few hours ago, or (b) manually set producedAt to a past date via the database so the computed expiry is in the past.',
    setupHint: 'shelfLifeHours = 1 hour, producedAt = 2 hours ago → batch is expired.',
  },

  steps: [
    {
      instruction: 'Ensure a finished goods batch exists for this product whose effective expiry (producedAt + shelfLifeHours) is in the past.',
      manualAction: true,
      hint: 'If needed, prepare a batch and wait for its shelf life to expire, or seed an expired batch directly in the DB.',
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Admin → Preparation.',
    },
    {
      instruction: `Find "${PRODUCT.name}" and click "Record Waste".`,
    },
    {
      instruction: 'Inspect the batch list before touching anything.',
    },
    {
      instruction: 'Verify the expired batch shows a red "Expired" badge.',
    },
    {
      instruction: 'Verify the expired batch checkbox is already checked.',
    },
    {
      instruction: 'Verify the quantity input for the expired batch is pre-filled with its full available quantity.',
    },
    {
      instruction: 'Scroll to the Reason field and verify it is pre-set to "Expired".',
    },
    {
      instruction: 'Do not change anything. Click "Record Waste" directly.',
    },
    {
      instruction: 'Verify the success toast appears and the Preparation page shows reduced remaining quantity.',
    },
  ],

  expected: [
    'Expired batch is highlighted with a red "Expired" badge.',
    'Expired batch checkbox is pre-checked on sidebar open.',
    'Quantity input for the expired batch is pre-filled with the full batch quantity.',
    'Reason field is auto-set to "Expired" without any user action.',
    'Confirmation banner is visible immediately without user selecting anything.',
    'Submit succeeds without any manual selections.',
    'After submit: remaining quantity decreases by the expired batch quantity.',
    'Waste History shows the entry with reason "Expired".',
  ],

  sourceModules: [
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
  ],
}
