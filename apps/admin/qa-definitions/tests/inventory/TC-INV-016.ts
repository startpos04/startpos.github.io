/**
 * TC-INV-016 — Waste Movement Appears in Inventory Movement Audit Trail
 *
 * Verifies that every waste write-off (from both Journey A and Journey B2)
 * creates a traceable WASTE movement in the inventory movement audit trail.
 *
 * Key assertions:
 *   - Movement type is WASTE (not OUT, not ADJUST)
 *   - One movement per batch touched (multi-batch waste = multiple rows)
 *   - The reason field contains the user-selected reason and any notes
 *   - The movement links to the correct inventoryId (batch)
 *   - The user who recorded it is shown
 *
 * Also verifies the WasteRate card on Inventory Reports reflects the movements.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_016: QaTestCase = {
  id: 'TC-INV-016',
  title: 'Waste Movements in Inventory Audit Trail — Type, Reason, Per-Batch',
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
    wasteQuantity: 2,
    wasteReason: 'Failed Preparation',
    wasteNotes: 'QA audit trail test',
    prerequisiteTests: ['TC-INV-007'],
    note: 'This test records a fresh waste event with a unique reason and notes, then verifies the movement appears in Recent Movements on the Inventory Reports page.',
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
      instruction: `Click "Record Waste" for "${PRODUCT.name}".`,
    },
    {
      instruction: 'Check the first batch and set quantity to 2.',
      copyable: { label: 'Waste qty', value: '2' },
    },
    {
      instruction: 'Select "Failed Preparation" as the reason.',
      copyable: { label: 'Reason', value: 'Failed Preparation' },
    },
    {
      instruction: 'Add notes: "QA audit trail test".',
      copyable: { label: 'Notes', value: 'QA audit trail test' },
    },
    {
      instruction: 'Click "Record Waste" and wait for the success toast.',
    },
    {
      instruction: 'Navigate to Supervisor → Inventory Reports.',
    },
    {
      instruction: 'Scroll to the "Recent Stock Movements" card (audit trail section).',
    },
    {
      instruction: 'Find the most recent movement. Verify it has type WASTE.',
      hint: 'The type badge should say WASTE, not OUT or ADJUST.',
    },
    {
      instruction: 'Verify the reason shown includes "Failed Preparation" and "QA audit trail test".',
      hint: 'The stored format is "Waste: Failed Preparation - QA audit trail test".',
    },
    {
      instruction: 'Verify the quantity shown is 2.',
    },
    {
      instruction: 'Verify the user column shows the admin account name.',
    },
    {
      instruction: 'Scroll up to the Waste Rate card. Verify the percentage increased compared to before this test.',
      hint: 'If this is the first waste event, the Waste Rate will change from 0% to a non-zero value.',
    },
    {
      instruction: 'Now test multi-batch audit trail: run TC-INV-010 (multi-batch waste) if not already done, then return to Recent Movements.',
    },
    {
      instruction: 'Verify two separate WASTE movement rows appear — one for each batch — not one combined row.',
    },
  ],

  expected: [
    'WASTE movement appears in the Recent Stock Movements audit trail.',
    'Movement type is WASTE — not OUT, not ADJUST.',
    'Reason field contains "Failed Preparation - QA audit trail test".',
    'Movement quantity is exactly 2.',
    'User column shows the admin who recorded the waste.',
    'Waste Rate card on the page reflects the new waste value.',
    'Multi-batch waste creates one WASTE movement row per batch, not a combined row.',
    'Each movement row references a different inventoryId (batch).',
  ],

  sourceModules: [
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/recent-stock-movements.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/waste-rate.tsx',
  ],
}
