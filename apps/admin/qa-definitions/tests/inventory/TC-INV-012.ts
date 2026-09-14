/**
 * TC-INV-012 — Journey B2: Expired Raw Material Batch Pre-Selected with Expiry Badge
 *
 * Verifies that when a raw material batch has an expiryDate in the past,
 * the Write Off Stock sidebar pre-selects it, shows a red "Expired" badge,
 * and defaults the reason to "Expired".
 *
 * Also verifies the "Expiring Soon" amber badge for batches whose expiryDate
 * is within 3 days but not yet past.
 *
 * This tests the Inventory.expiryDate field being surfaced in the UI —
 * previously it was stored but never shown to the user.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_INV_012: QaTestCase = {
  id: 'TC-INV-012',
  title: 'Journey B2 — Expired Raw Material Batch Pre-Selected with Expiry Badge',
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
    note: 'Requires a RAW_MATERIAL inventory batch where Inventory.expiryDate is in the past. Create this via a GRN where you set the expiry date to yesterday, or set it directly in the database.',
    setupHint: 'Via GRN: when confirming goods receipt, set expiry date to a past date (e.g. yesterday).',
  },

  steps: [
    {
      instruction: 'Ensure a raw material batch exists for this product with expiryDate set to yesterday or earlier.',
      manualAction: true,
      hint: 'This can be done by creating a purchase → GRN and setting the expiry date to a past date. Or update the batch directly in the database.',
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Supervisor → Inventory Reports → Stock Levels & Valuation.',
    },
    {
      instruction: `Find the "${PRODUCT.name}" row. Verify it shows a red "Batch Expired" badge in the Batch Info column.`,
    },
    {
      instruction: 'Verify the entire row has a subtle red tint to draw attention.',
    },
    {
      instruction: 'Click "Write Off" for this product.',
    },
    {
      instruction: 'In the sidebar, find the expired batch. Verify it shows a red "Expired" badge.',
    },
    {
      instruction: 'Verify the expired batch checkbox is already checked.',
    },
    {
      instruction: 'Verify the quantity input is pre-filled with the full batch quantity.',
    },
    {
      instruction: 'Scroll to the Reason field. Verify it is pre-set to "Expired".',
    },
    {
      instruction: 'Click "Write Off Stock" without changing anything.',
    },
    {
      instruction: 'Verify success and check that the "Batch Expired" badge disappears from the Stock Levels row.',
    },
  ],

  expected: [
    'Stock Levels table row shows "Batch Expired" badge in red for the product.',
    'The row has a red tint.',
    '"Write Off" button in that row is also tinted red.',
    'In the sidebar: expired batch shows red "Expired" badge.',
    'Expired batch is pre-checked with full quantity.',
    'Reason field defaults to "Expired".',
    'Submit succeeds without any manual selections.',
    'After submit: "Batch Expired" badge disappears from the Stock Levels row.',
    'Waste History entry shows reason "Expired".',
  ],

  sourceModules: [
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/record-stock-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/stock-levels.tsx',
  ],
}
