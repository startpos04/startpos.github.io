/**
 * waste.ts
 *
 * Shared waste management constants.
 * Single source of truth for waste reasons used across:
 *   - RecordWasteSidebar (preparation module)
 *   - WASTE_DISPOSAL task form (tasks module)
 *   - Any future waste entry points
 */

export const WASTE_REASONS = [
  'Past Shelf Life',
  'Expired',
  'Spoiled',
  'Damaged',
  'Failed Preparation',
  'Quality Issue',
  'Other',
] as const

export type WasteReason = (typeof WASTE_REASONS)[number]
