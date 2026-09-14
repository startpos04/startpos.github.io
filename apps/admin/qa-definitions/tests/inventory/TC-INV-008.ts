/**
 * TC-INV-008 — Journey A: Record Waste for Finished Goods (Partial Quantity)
 *
 * Verifies that a user can write off only part of a batch — for example,
 * a batch of 10 where only 3 units are spoiled. The remaining 7 should
 * stay in inventory. This tests the partial-quantity path in the batch picker.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_008: QaTestCase = {
  id: 'TC-INV-008',
  title: 'Journey A — Record Waste: Finished Goods Partial Quantity',
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
    wasteQuantity: 3,
    wasteReason: 'Damaged',
    note: 'The target batch must have at least 5 units so that after wasting 3 there is a visible remainder of at least 2.',
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
      instruction: `Find "${PRODUCT.name}" and note the exact "Remaining" quantity shown.`,
      manualAction: true,
    },
    {
      instruction: 'Click "Record Waste" for this product.',
    },
    {
      instruction: 'Check the checkbox next to the first batch. The quantity input appears.',
    },
    {
      instruction: 'Clear the pre-filled quantity and type 3.',
      copyable: { label: 'Waste qty', value: '3' },
    },
    {
      instruction: 'Confirm the quantity input shows 3 and the "All (n)" shortcut is still visible.',
      hint: 'The "All" shortcut should still show the full batch quantity, not 3.',
    },
    {
      instruction: 'Select "Damaged" as the reason.',
      copyable: { label: 'Reason', value: 'Damaged' },
    },
    {
      instruction: 'Verify the confirmation banner shows "3 units" — not the full batch quantity.',
    },
    {
      instruction: 'Click "Record Waste".',
    },
    {
      instruction: 'Return to the Preparation page. Check the new "Remaining" quantity.',
    },
  ],

  expected: [
    'Quantity input accepts partial values; "All" shortcut remains visible.',
    'Confirmation banner shows exactly 3 units.',
    'After submit: toast success message appears.',
    'Remaining quantity on the Preparation page decreases by exactly 3.',
    'The batch still exists in inventory with quantity = (original − 3).',
    'Waste History shows one new entry: 3 units, reason "Damaged".',
    'A WASTE inventory movement for quantity 3 is recorded.',
  ],

  sourceModules: [
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
  ],
}
