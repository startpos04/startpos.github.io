/**
 * TC-INV-011 — Journey B2: Direct Stock Write-Off for Raw Materials
 *
 * Verifies the new Journey B2 path: writing off raw material / purchased stock
 * directly from the Inventory Reports page without creating a task.
 *
 * This path is for businesses that don't use task management (no CREATE_TASK
 * capability) or for quick ad-hoc write-offs. It requires only the
 * BRANCH_ADJUST_INVENTORY permission.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_INV_011: QaTestCase = {
  id: 'TC-INV-011',
  title: 'Journey B2 — Direct Stock Write-Off from Inventory Reports',
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
    wasteQuantity: 4,
    wasteReason: 'Past Shelf Life',
    note: 'The product must have at least one RAW_MATERIAL inventory batch with quantity > 0. If the product is batch-prepared (FINISHED_GOOD), use a different product that is purchased as raw material.',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Supervisor → Inventory Reports.',
    },
    {
      instruction: 'Scroll down to the "Stock Levels & Valuation" table.',
    },
    {
      instruction: `Find the row for "${PRODUCT.name}" and note the current stock quantity.`,
      manualAction: true,
    },
    {
      instruction: 'Click the "Write Off" button in the rightmost column of that product row.',
      hint: 'The button only appears for raw material products when you have Adjust Inventory permission.',
    },
    {
      instruction: 'The "Write Off Stock" sidebar opens. Verify the product name in the header.',
    },
    {
      instruction: 'Verify the batch list shows the available raw material batches.',
    },
    {
      instruction: 'Check the first batch.',
    },
    {
      instruction: 'Set the quantity to 4.',
      copyable: { label: 'Write-off qty', value: '4' },
    },
    {
      instruction: 'Select "Past Shelf Life" as the reason.',
      copyable: { label: 'Reason', value: 'Past Shelf Life' },
    },
    {
      instruction: 'Verify the confirmation banner shows 4 units and an estimated value.',
    },
    {
      instruction: 'Click "Write Off Stock".',
    },
    {
      instruction: 'Return to the Stock Levels table. Verify the stock decreased by 4.',
    },
    {
      instruction: 'Navigate to Preparation → Waste Log and verify the new entry appears.',
    },
  ],

  expected: [
    '"Write Off" button is visible for raw material product rows.',
    '"Write Off Stock" sidebar opens showing batch list for the product.',
    'After submit: toast success message appears.',
    'Stock level in the Inventory Reports table decreases by exactly 4.',
    'Waste History shows a new entry: 4 units, reason "Past Shelf Life".',
    'A WASTE inventory movement is created and visible in the audit trail.',
    'No task is created — this is a direct write-off without task workflow.',
  ],

  sourceModules: [
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/record-stock-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/stock-levels.tsx',
  ],
}
