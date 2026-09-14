/**
 * TC-INV-014 — Waste History Page: All Events Listed with Correct Data
 *
 * Verifies the Waste History page (/preparation/waste-history) displays
 * all waste events for the branch with accurate data: product name, batch,
 * quantity wasted, reason, notes, who recorded it, and the timestamp.
 *
 * Also verifies the three summary cards at the top (total events, est. value
 * lost, top reason) and that the date filter narrows results correctly.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_INV_014: QaTestCase = {
  id: 'TC-INV-014',
  title: 'Waste History Page — Events Listed with Correct Data',
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
    note: 'Run TC-INV-007 and TC-INV-008 before this test to ensure at least 2 waste entries exist from different sessions. This test reads, not writes.',
    prerequisiteTests: ['TC-INV-007', 'TC-INV-008'],
  },

  steps: [
    {
      instruction: 'Ensure at least 2 waste events exist (run TC-INV-007 and TC-INV-008 first if needed).',
      manualAction: true,
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Admin → Preparation and click the "Waste Log" button in the page header.',
    },
    {
      instruction: 'Verify the page title "Waste History" appears with the branch name.',
    },
    {
      instruction: 'Check the three summary cards at the top.',
    },
    {
      instruction: 'Verify "Total Events" card shows a number ≥ 2.',
    },
    {
      instruction: 'Verify "Est. Value Lost" card shows a ₱ amount > 0.',
    },
    {
      instruction: 'Verify "Top Reason" card shows the reason used most often.',
    },
    {
      instruction: 'In the table, find the entry from TC-INV-007 (full batch write-off, reason "Spoiled").',
      hint: 'Entries are sorted newest first. Check the Date column.',
    },
    {
      instruction: 'Verify the row shows: correct product name, correct quantity, reason badge "Spoiled", and the admin user name in the "Recorded By" column.',
    },
    {
      instruction: 'Find the entry from TC-INV-008 (partial write-off, reason "Damaged", quantity 3).',
    },
    {
      instruction: 'Verify that entry shows quantity 3 and reason badge "Damaged".',
    },
    {
      instruction: 'Use the date range filter to select a date range that EXCLUDES today.',
    },
    {
      instruction: 'Verify the table shows no results and the summary cards show 0 / ₱0.00 / "—".',
    },
    {
      instruction: 'Reset the date filter to the current month. Verify results reappear.',
    },
  ],

  expected: [
    'Waste History page loads and shows the correct branch name.',
    'Summary cards show correct totals matching the waste events recorded.',
    'Each table row shows: date, product name, quantity in red with unit, colour-coded reason badge, notes, recorded-by user name, and est. value lost.',
    'Filtering by a date range that excludes today empties the table and zeroes the summary cards.',
    'Resetting the filter restores all results.',
    'Entries are sorted newest first.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/preparation/waste-history.tsx',
  ],
}
