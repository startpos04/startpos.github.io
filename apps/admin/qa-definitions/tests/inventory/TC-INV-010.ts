/**
 * TC-INV-010 — Journey A: Multi-Batch Waste in One Submission
 *
 * Verifies that a user can select multiple batches in a single Record Waste
 * submission. Each batch gets its own quantity input, and the confirmation
 * banner shows the combined total. On submit, one WASTE movement is created
 * per batch — not one combined movement.
 *
 * This is important for audit trail accuracy: each batch write-off must be
 * traceable to its specific batch record.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_010: QaTestCase = {
  id: 'TC-INV-010',
  title: 'Journey A — Multi-Batch Waste in a Single Submission',
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
    batchCount: 2,
    wasteQtyBatch1: 2,
    wasteQtyBatch2: 3,
    wasteReason: 'Quality Issue',
    notes: 'QA multi-batch test',
    note: 'The product must have at least 2 separate FINISHED_GOOD batches. Run two separate preparation sessions to create them.',
  },

  steps: [
    {
      instruction: 'Ensure at least 2 separate finished goods batches exist for this product. Run two preparation sessions if needed.',
      manualAction: true,
      hint: 'Each preparation session creates a new batch. You need at least 2 batches with quantity > 0.',
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
      instruction: `Note the current total "Remaining" for "${PRODUCT.name}".`,
      manualAction: true,
    },
    {
      instruction: 'Click "Record Waste" for this product.',
    },
    {
      instruction: 'Verify the batch list shows at least 2 separate batches.',
    },
    {
      instruction: 'Check the first batch and set its quantity to 2.',
      copyable: { label: 'Batch 1 qty', value: '2' },
    },
    {
      instruction: 'Check the second batch and set its quantity to 3.',
      copyable: { label: 'Batch 2 qty', value: '3' },
    },
    {
      instruction: 'Verify the confirmation banner shows "5 units across 2 batches".',
    },
    {
      instruction: 'Select "Quality Issue" as the reason.',
      copyable: { label: 'Reason', value: 'Quality Issue' },
    },
    {
      instruction: 'Add notes: "QA multi-batch test".',
      copyable: { label: 'Notes', value: 'QA multi-batch test' },
    },
    {
      instruction: 'Click "Record Waste".',
    },
    {
      instruction: 'Check the Preparation page — total remaining should decrease by 5.',
    },
    {
      instruction: 'Navigate to Inventory Reports → Recent Movements and look for the waste movements.',
    },
  ],

  expected: [
    'Both batch rows show individual quantity inputs when checked.',
    'Confirmation banner shows combined total: "5 units across 2 batches".',
    'After submit: toast success references both batches.',
    'Total remaining decreases by 5 (2 + 3).',
    'Two separate WASTE inventory movements are created — one per batch.',
    'Each movement references its own inventoryId.',
    'Waste History shows one entry per batch (2 rows), both with reason "Quality Issue".',
    'Notes "QA multi-batch test" appear on both Waste History entries.',
  ],

  sourceModules: [
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/components/custom/waste/batch-waste-picker.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/waste-history.tsx',
  ],
}
