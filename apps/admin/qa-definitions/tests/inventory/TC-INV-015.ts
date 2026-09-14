/**
 * TC-INV-015 — Waste Analytics Section Reflects Waste Totals After Write-Off
 *
 * Verifies the WasteAnalytics section in Inventory Reports (/inventory-reports)
 * updates correctly after waste is recorded.
 *
 * Two cards are tested:
 *   - "Waste by Reason" — shows each reason with event count, total quantity,
 *     estimated value, and a proportional progress bar.
 *   - "Waste by Product" — shows products ranked by value lost.
 *
 * Both cards must reflect the waste events recorded in TC-INV-007 and TC-INV-008
 * (Spoiled and Damaged reasons respectively).
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_INV_015: QaTestCase = {
  id: 'TC-INV-015',
  title: 'Waste Analytics — By Reason and By Product Cards Reflect Actual Waste',
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
    prerequisiteTests: ['TC-INV-007', 'TC-INV-008'],
    note: 'TC-INV-007 records waste with reason "Spoiled". TC-INV-008 records waste with reason "Damaged". Both must be completed first so the analytics have data to display.',
  },

  steps: [
    {
      instruction: 'Ensure TC-INV-007 (Spoiled) and TC-INV-008 (Damaged) have been completed this session.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Supervisor → Inventory Reports.',
    },
    {
      instruction: 'Scroll past the Stock Levels table and Recent Movements to the bottom of the page.',
      hint: 'The Waste Analytics section is the last section on the page.',
    },
    {
      instruction: 'Verify two side-by-side cards appear: "Waste by Reason" (left) and "Waste by Product" (right).',
    },
    {
      instruction: 'In the "Waste by Reason" card, verify "Spoiled" appears as an entry.',
    },
    {
      instruction: 'Verify "Damaged" also appears as a separate entry.',
    },
    {
      instruction: 'Verify each entry shows: reason name, event count, total quantity, and a ₱ value.',
    },
    {
      instruction: 'Verify each entry has a red progress bar. The highest-value reason has the longest bar (100% width). Others are proportionally shorter.',
    },
    {
      instruction: 'Verify a "Total" row at the bottom of the card shows the combined value across all reasons.',
    },
    {
      instruction: 'In the "Waste by Product" card, verify the product from TC-INV-007 appears in the ranked list.',
    },
    {
      instruction: 'Verify each product entry shows: rank number, product name, quantity, and ₱ value with an amber progress bar.',
    },
    {
      instruction: 'Change the date range filter to a range that EXCLUDES today.',
      hint: 'Use the date picker at the top of the Inventory Reports page.',
    },
    {
      instruction: 'Verify both analytics cards now show "No data to display".',
    },
    {
      instruction: 'Reset the date range to the current month. Verify the data returns.',
    },
  ],

  expected: [
    '"Waste by Reason" card shows "Spoiled" and "Damaged" as separate entries.',
    'Each reason entry shows correct event count, quantity, and ₱ value.',
    'Progress bars are proportional — highest-value reason has full-width bar.',
    'Total row at the bottom of the card sums all values correctly.',
    '"Waste by Product" card shows the wasted product(s) ranked by value lost.',
    'Filtering to a date that excludes today shows "No data to display" in both cards.',
    'Resetting the date filter restores the data.',
    'Both cards respond to the same date range filter used for the rest of the page.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/-components/waste-analytics.tsx',
    'apps/web/src/lib/production/waste-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory-reports/index.tsx',
  ],
}
