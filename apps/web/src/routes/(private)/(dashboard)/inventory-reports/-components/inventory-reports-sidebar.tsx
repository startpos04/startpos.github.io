import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const INVENTORY_REPORTS_ASIDE_ID = 'inventory-reports-aside'

export const showInventoryReportsSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: INVENTORY_REPORTS_ASIDE_ID,
    target: INVENTORY_REPORTS_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeInventoryReportsSidebar = () => {
  MountManager.clear(INVENTORY_REPORTS_ASIDE_ID)
}
