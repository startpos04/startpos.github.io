/**
 * TC-INV-017 — Zero-Quantity Batch Not Selectable in Batch Picker
 *
 * Verifies that inventory batches with quantity = 0 (fully depleted) cannot
 * be selected for waste recording. The checkbox must be disabled, preventing
 * a write-off against a batch that has nothing left.
 *
 * This is an edge case guard: if all batches for a product are empty,
 * the sidebar should show the batch list with all checkboxes disabled and
 * the submit button must remain disabled.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_017: QaTestCase = {
  id: 'TC-INV-017',
  title: 'Batch Picker — Zero-Quantity Batch Is Disabled, Cannot Be Selected',
  risk: 'MEDIUM',
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
    note: 'Requires a finished goods batch with quantity = 0. The easiest way to create this: record waste for the full quantity of a batch using TC-INV-007, which depletes it to 0. Then open Record Waste again to see the depleted batch.',
    setupHint: 'After TC-INV-007, the wasted batch will have quantity 0. Re-open Record Waste for the same product to test this case. If new batches were prepared since TC-INV-007, you may need to deplete those too.',
  },

  steps: [
    {
      instruction: 'Ensure at least one finished goods batch for this product has been fully depleted (quantity = 0) by a prior waste recording.',
      manualAction: true,
      hint: 'Run TC-INV-007 first which fully wastes one batch. That batch will then have quantity 0.',
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
      instruction: `Click "Record Waste" for "${PRODUCT.name}".`,
    },
    {
      instruction: 'Look for the depleted batch (the one with 0 remaining from TC-INV-007) in the batch list.',
      hint: 'The batch picker only shows batches with quantity > 0. If the depleted batch does not appear, that is also a pass condition — the filter correctly excludes it.',
    },
    {
      instruction: 'If the batch appears: verify its checkbox is disabled (greyed out, cannot be checked).',
    },
    {
      instruction: 'Try to click the disabled checkbox. Verify it does not respond.',
    },
    {
      instruction: 'Verify the "Available:" label for this batch shows 0.',
    },
    {
      instruction: 'Verify the Submit button remains disabled while only the zero-quantity batch exists in the list.',
      hint: 'If other batches with quantity > 0 are present, the submit button will be enabled for those. Focus on confirming the 0-qty batch is not selectable.',
    },
  ],

  expected: [
    'Batches with quantity = 0 either: (a) do not appear in the batch list at all (filtered out), OR (b) appear with a disabled checkbox that cannot be checked.',
    'Either behaviour is a pass — both prevent writing off a batch with no stock.',
    'The "Available" label shows 0 for the depleted batch if it is shown.',
    'The disabled checkbox does not respond to clicks.',
    'The Submit button remains disabled if no valid (quantity > 0) batch is selected.',
    'No error messages or console errors appear.',
  ],

  sourceModules: [
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
  ],
}
