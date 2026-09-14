/**
 * TC-INV-018 — Over-Quantity Validation Blocks Submit in Batch Picker
 *
 * Verifies that the batch picker prevents submitting a waste quantity
 * greater than the batch's available quantity.
 *
 * In strict inventory mode, the engine calls InventoryPolicy.validateWasteDisposal
 * which blocks over-disposal. The UI also provides a client-side guard:
 *   - The quantity input shows an error when it exceeds the batch quantity
 *   - The submit button is disabled until all quantities are within range
 *
 * Tests both the UI guard (client) and the engine guard (server-side).
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_018: QaTestCase = {
  id: 'TC-INV-018',
  title: 'Batch Picker — Over-Quantity Validation Blocks Submit',
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
    note: 'Requires a finished goods batch with a known quantity, e.g. 5 units. You will attempt to enter 999 to trigger the over-quantity guard.',
    overQty: 999,
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Admin → Preparation.',
    },
    {
      instruction: `Click "Record Waste" for "${PRODUCT.name}". Note the available quantity shown for the first batch.`,
      manualAction: true,
    },
    {
      instruction: 'Check the checkbox for the first batch.',
    },
    {
      instruction: 'In the quantity input, clear the value and type 999.',
      copyable: { label: 'Over qty', value: '999' },
    },
    {
      instruction: 'Verify an inline error message appears on the quantity input saying something like "Exceeds available".',
    },
    {
      instruction: 'Verify the Submit button is disabled.',
    },
    {
      instruction: 'Select "Spoiled" as the reason.',
      copyable: { label: 'Reason', value: 'Spoiled' },
    },
    {
      instruction: 'Attempt to click "Record Waste" anyway.',
      hint: 'The button should remain disabled and not fire the submit. If it somehow fires, the engine should reject the request.',
    },
    {
      instruction: 'Clear the quantity input and type 1 (a valid value within the batch quantity).',
      copyable: { label: 'Valid qty', value: '1' },
    },
    {
      instruction: 'Verify the inline error disappears and the Submit button becomes enabled.',
    },
    {
      instruction: 'Now test multiple batches: check a second batch (if available) and set its quantity to 999 as well.',
    },
    {
      instruction: 'Verify the Submit button remains disabled even though the first batch has a valid quantity (because the second has an invalid one).',
    },
    {
      instruction: 'Do NOT submit — this test is validation-only, no actual waste should be recorded.',
    },
  ],

  expected: [
    'Entering a quantity greater than the batch available quantity shows an inline "Exceeds available" error on that batch row.',
    'Submit button is disabled when any selected batch has an over-quantity.',
    'Reason selection does not override the quantity validation — submit stays blocked.',
    'Correcting the quantity to a valid value clears the error and re-enables submit.',
    'If multiple batches are checked and ANY of them has an over-quantity, submit remains blocked.',
    'No waste movement is created during this test.',
    'No console errors or unhandled exceptions occur.',
  ],

  sourceModules: [
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/record-stock-waste-sidebar.tsx',
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/lib/inventory/inventory-policy.ts',
  ],
}
