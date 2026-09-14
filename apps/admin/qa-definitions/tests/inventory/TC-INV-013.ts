/**
 * TC-INV-013 — Journey B2: Cashier Blocked from Write Off (Permission Enforcement)
 *
 * Verifies that a cashier cannot write off stock.
 * The cashier role does not have BRANCH_ADJUST_INVENTORY, so:
 *   - The "Write Off" button must not appear in the Stock Levels table for cashiers.
 *   - If a cashier somehow opens the Write Off sidebar directly, they see a
 *     "Permission required" locked state instead of the batch picker form.
 *
 * This covers the permission gate added to RecordStockWasteSidebar.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_INV_013: QaTestCase = {
  id: 'TC-INV-013',
  title: 'Journey B2 — Cashier Cannot Write Off Stock (Permission Block)',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'waste',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    note: 'Test first as cashier (no button), then confirm as admin (button visible). Both logins needed.',
  },

  steps: [
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Supervisor → Inventory Reports.',
      hint: 'The cashier may not see the Inventory Reports link at all depending on their nav. If the page is not accessible, record that as the pass condition and skip to step 5.',
    },
    {
      instruction: 'If the page loads, scroll to the Stock Levels & Valuation table.',
    },
    {
      instruction: `Find the "${PRODUCT.name}" row. Verify there is NO "Write Off" button in the rightmost column.`,
    },
    {
      instruction: 'Log out and log back in as the admin.',
      copyable: { label: 'Admin email', value: QA_ACCOUNTS.ADMIN },
    },
    {
      instruction: 'Navigate to Inventory Reports → Stock Levels & Valuation.',
    },
    {
      instruction: `Find the "${PRODUCT.name}" row. Verify the "Write Off" button IS visible.`,
    },
    {
      instruction: 'Also verify: navigate to Preparation and click "Record Waste" for a batch-prepared product. Log out and log in as cashier — the "Record Waste" button should either not appear or show the permission-locked sidebar.',
    },
  ],

  expected: [
    'Cashier sees no "Write Off" button in the Stock Levels table.',
    'Admin sees the "Write Off" button for raw material products.',
    'If a cashier reaches the Record Waste sidebar, they see a lock icon and "Permission required" message, not the batch picker form.',
    'No console errors or unhandled exceptions occur.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/stock-levels.tsx',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/record-stock-waste-sidebar.tsx',
    'apps/web/src/routes/(private)/(dashboard)/preparation/-components/record-waste-sidebar.tsx',
    'packages/platform/lib/authorization/permission-keys.ts',
    'packages/platform/lib/authorization/role-permissions.ts',
  ],
}
