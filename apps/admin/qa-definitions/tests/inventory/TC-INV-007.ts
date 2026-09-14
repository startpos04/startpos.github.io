/**
 * TC-INV-007 — Journey A: Record Waste for Finished Goods (Single Batch, Full Quantity)
 *
 * Verifies the core waste recording path for batch-prepared finished goods.
 * The user opens the Record Waste sidebar from the Preparation page,
 * selects a single batch, enters the full available quantity, picks a reason,
 * and submits. Inventory must decrease and a WASTE movement must be created.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_007: QaTestCase = {
  id: 'TC-INV-007',
  title: 'Journey A — Record Waste: Finished Goods Single Batch Full Write-Off',
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
    note: 'The product must be configured as batch-prepared and have at least one FINISHED_GOOD batch with quantity > 0. Run a preparation batch first if needed.',
    wasteReason: 'Spoiled',
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
      instruction: `Find "${PRODUCT.name}" in the batch-prepared products list.`,
      hint: 'The product must have finished goods inventory. If the "Remaining" shows 0, run a preparation batch first.',
    },
    {
      instruction: 'Note the current "Remaining" quantity shown for the product.',
      manualAction: true,
    },
    {
      instruction: 'Click the "Waste Log" button in the page header to confirm the waste history is currently empty or note existing entries.',
      hint: 'You will return here after the test to verify the new entry.',
      manualAction: true,
    },
    {
      instruction: 'Return to the Preparation page and click the "Record Waste" button for this product.',
    },
    {
      instruction: 'The Record Waste sidebar opens. Verify the batch list shows at least one batch with quantity > 0.',
    },
    {
      instruction: 'Check the checkbox next to the first batch.',
    },
    {
      instruction: 'The quantity input appears pre-filled with the full batch quantity. Leave it at the full amount.',
      hint: 'You can also click "All (n)" to fill the full quantity if it isn\'t pre-filled.',
    },
    {
      instruction: 'Select "Spoiled" as the reason.',
      copyable: { label: 'Reason', value: 'Spoiled' },
    },
    {
      instruction: 'Verify the confirmation banner appears at the bottom showing the total quantity and estimated value.',
    },
    {
      instruction: 'Click "Record Waste".',
    },
    {
      instruction: 'Return to the Preparation page and check the "Remaining" quantity for the product.',
    },
    {
      instruction: 'Navigate to Preparation → Waste Log and verify a new entry appears.',
    },
  ],

  expected: [
    'Record Waste sidebar opens and shows the batch list for the product.',
    'Checking a batch reveals a quantity input pre-filled with the full batch quantity.',
    'Confirmation banner shows total quantity and estimated value lost.',
    'After submit: toast success message appears.',
    'Remaining quantity on the Preparation page decreases by the wasted amount.',
    'Waste History page shows the new entry with correct product name, quantity, reason ("Spoiled"), and timestamp.',
    'A WASTE inventory movement is created (visible in Inventory Reports → Recent Movements).',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/waste-history.tsx',
  ],
}
