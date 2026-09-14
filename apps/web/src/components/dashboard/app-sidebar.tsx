import { BRAND_WEBSITE_URL } from '@constants/lib/contact'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@platform/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@platform/components/ui/sidebar'
import { useCapabilities } from '@platform/hooks/use-capability'
import { usePermissions } from '@platform/hooks/use-permission'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { APP_NAME } from '@platform/lib/constants'
import { Capabilities } from '@platform/lib/entitlement/capability-keys'
import { SubscriptionStatus } from '@platform/lib/entitlement/entitlement-types'
import { SubscriptionStatusVO } from '@platform/lib/entitlement/subscription-status-vo'
import { isNotNullish } from '@platform/lib/types'
import { cn } from '@platform/lib/utils'
import { Link, useLocation } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import {
  BarChart3,
  BookOpenIcon,
  BuildingIcon,
  ChevronRightIcon,
  ClipboardPenLine,
  CreditCardIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  Package,
  SettingsIcon,
  ShieldIcon,
} from 'lucide-react'

function BrandIcon() {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16'>
      <rect width='32' height='32' rx='8' fill='#10b981' />
      <path d='M8 6L5 10v14a2 2 0 002 2h18a2 2 0 002-2V10L24 6z' fill='none' stroke='white' strokeWidth='2' strokeLinejoin='round' />
      <line x1='5' y1='10' x2='27' y2='10' stroke='white' strokeWidth='2' />
      <path d='M20 14a4 4 0 01-8 0' fill='none' stroke='white' strokeWidth='2' strokeLinecap='round' />
    </svg>
  )
}

import { branchCollection } from '@platform/db/collections'
import { useLiveQuery } from '@tanstack/react-db'
import { BusinessType, type Role } from 'prisma/generated/prisma/enums'
import * as React from 'react'
import { authStore, getAuthenticatedUser, useAuthenticatedUser } from '@/lib/better-auth/auth-store'

interface Items {
  title: string
  url: string
  icon?: React.ReactNode
  isActive: boolean
  allowedRoles: Role[]
  external?: boolean
  items: {
    title: string
    url: string
    isActive: boolean
  }[]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthenticatedUser()
  const location = useLocation()

  // Query actual branch count from collection
  const { data: allBranches } = useLiveQuery(q => q.from({ branch: branchCollection }))
  const activeBranchCount = allBranches?.filter(b => !b.deletedAt).length ?? 1

  // Capability checks
  const caps = useCapabilities([
    Capabilities.CREATE_TASK,
    Capabilities.CREATE_PURCHASE,
    Capabilities['VIEW_SALES_REPORTS'],
    Capabilities.MANAGE_INVENTORY,
    Capabilities.VIEW_ORDER_HISTORY,
    Capabilities.BATCH_PREPARATION,
    Capabilities.MANAGE_CUSTOMERS,
    Capabilities.MANAGE_SUPPLIERS,
    Capabilities.MANAGE_BRANCHES,
  ])

  // Permission checks
  const perms = usePermissions([
    // Business
    Permissions.BUSINESS_VIEW_BILLING,
    Permissions.BUSINESS_VIEW_PROFILE,
    Permissions.BUSINESS_VIEW_CAPABILITIES,
    Permissions.BUSINESS_VIEW_BRANCHES,
    Permissions.BUSINESS_VIEW_SUPPLIERS,
    Permissions.BUSINESS_VIEW_CUSTOMERS,
    Permissions.USER_MANAGE_PERMISSIONS,
    // Branch
    Permissions.BRANCH_VIEW_EMPLOYEES,
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_VIEW_PURCHASES,
    Permissions.BRANCH_VIEW_PRODUCTION,
    Permissions.BRANCH_VIEW_SALES_REPORTS,
    Permissions.BRANCH_VIEW_INVENTORY_REPORTS,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_VIEW_SETTINGS,
    Permissions.BRANCH_VIEW_BILLING,
  ])

  // Helper to determine if a route is active
  const isRouteActive = React.useCallback(
    (itemUrl: string) => {
      if (itemUrl === '#' || !itemUrl) return false
      const currentPath = location.pathname
      if (currentPath === itemUrl) return true
      if (itemUrl === '/business') return false
      return currentPath.startsWith(`${itemUrl}/`)
    },
    [location.pathname],
  )

  // Helper to build menu items
  const buildMenuItem = React.useCallback(
    (config: { title: string; url: string; icon: React.ReactNode; condition: boolean; items?: Array<{ title: string; url: string } | null> }) => {
      if (!config.condition) return null
      return {
        title: config.title,
        url: config.url,
        icon: config.icon,
        allowedRoles: [] as Role[],
        items: config.items?.filter(Boolean) ?? [],
      }
    },
    [],
  )

  const { team, items } = React.useMemo((): { team: { name: string; logo: React.ReactNode; plan: string }; items: Items[] } => {
    if (!user?.business) return { team: { name: APP_NAME, logo: <BrandIcon />, plan: 'Guest' }, items: [] }

    const isSingleBranch = !caps['MANAGE_BRANCHES'] || activeBranchCount === 1
    const hasBusinessAccess =
      perms[Permissions.BUSINESS_VIEW_BILLING] || perms[Permissions.BUSINESS_VIEW_PROFILE] || perms[Permissions.BUSINESS_VIEW_CAPABILITIES]

    // PRIORITY 1: Single-branch - unified sidebar
    if (isSingleBranch) {
      const businessItems = hasBusinessAccess
        ? [
            perms[Permissions.BUSINESS_VIEW_PROFILE] ? { title: 'Overview', url: '/business' } : null,
            perms[Permissions.BUSINESS_VIEW_PROFILE] ? { title: 'Profile', url: '/business/profile' } : null,
            perms[Permissions.BUSINESS_VIEW_BRANCHES] && caps['MANAGE_BRANCHES'] ? { title: 'Branches', url: '/business/branches' } : null,
            perms[Permissions.BUSINESS_VIEW_CUSTOMERS] && caps['MANAGE_CUSTOMERS'] ? { title: 'Customers', url: '/business/customers' } : null,
            perms[Permissions.BUSINESS_VIEW_SUPPLIERS] && caps['MANAGE_SUPPLIERS'] ? { title: 'Suppliers', url: '/business/suppliers' } : null,
            perms[Permissions.BUSINESS_VIEW_CAPABILITIES] ? { title: 'Capabilities', url: '/business/capabilities' } : null,
            perms[Permissions.USER_MANAGE_PERMISSIONS] ? { title: 'Permissions', url: '/business/permissions' } : null,
            perms[Permissions.BUSINESS_VIEW_BILLING] ? { title: 'Subscription', url: '/business/subscription' } : null,
          ].filter(Boolean)
        : []

      const rawItems = [
        // Business section
        businessItems.length > 0
          ? buildMenuItem({
              title: 'Business',
              url: '#',
              icon: <BuildingIcon />,
              condition: true,
              items: businessItems,
            })
          : null,

        // Dashboard
        buildMenuItem({
          title: 'Dashboard',
          url: '/dashboard',
          icon: <LayoutDashboardIcon />,
          condition: !!(perms[Permissions.BRANCH_VIEW_SALES_REPORTS] || perms[Permissions.BRANCH_VIEW_TRANSACTIONS]),
        }),

        // POS
        buildMenuItem({
          title: 'POS',
          url: '/pos',
          icon: <BookOpenIcon />,
          condition: !!(perms[Permissions.BRANCH_CREATE_ORDER] || perms[Permissions.BRANCH_VIEW_ORDERS]),
        }),

        // Products group
        buildMenuItem({
          title: 'Products',
          url: '#',
          icon: <Package />,
          condition: !!(perms[Permissions.BRANCH_VIEW_PRODUCTS] || perms[Permissions.BRANCH_VIEW_EMPLOYEES]),
          items: [
            perms[Permissions.BRANCH_VIEW_PRODUCTS] ? { title: 'Products', url: '/products' } : null,
            user.business?.businessType === BusinessType.RESTAURANT && perms[Permissions.BRANCH_VIEW_PRODUCTS]
              ? { title: 'Ingredients', url: '/ingredients' }
              : null,
            caps['BATCH_PREPARATION'] && perms[Permissions.BRANCH_VIEW_PRODUCTION] ? { title: 'Preparation', url: '/preparation' } : null,
            caps['BATCH_PREPARATION'] && perms[Permissions.BRANCH_VIEW_PRODUCTION] ? { title: 'Waste History', url: '/preparation/waste-history' } : null,
            caps['CREATE_PURCHASE'] && perms[Permissions.BRANCH_VIEW_PURCHASES] ? { title: 'Purchases', url: '/purchases' } : null,
            perms[Permissions.BRANCH_VIEW_EMPLOYEES] ? { title: 'Employees', url: '/employees' } : null,
          ],
        }),

        // Reports group
        buildMenuItem({
          title: 'Reports',
          url: '#',
          icon: <BarChart3 />,
          condition: !!(perms[Permissions.BRANCH_VIEW_SALES_REPORTS] || perms[Permissions.BRANCH_VIEW_TRANSACTIONS] || perms[Permissions.BRANCH_VIEW_ORDERS]),
          items: [
            caps['VIEW_SALES_REPORTS'] && perms[Permissions.BRANCH_VIEW_SALES_REPORTS] ? { title: 'Sales Report', url: '/sales-reports' } : null,
            caps['MANAGE_INVENTORY'] && perms[Permissions.BRANCH_VIEW_INVENTORY_REPORTS] ? { title: 'Inventory Reports', url: '/inventory-reports' } : null,
            perms[Permissions.BRANCH_VIEW_TRANSACTIONS] ? { title: 'Transactions', url: '/transactions' } : null,
            caps['VIEW_ORDER_HISTORY'] && perms[Permissions.BRANCH_VIEW_ORDERS] ? { title: 'Order History', url: '/order-history' } : null,
          ],
        }),

        // Tasks
        buildMenuItem({
          title: 'Tasks',
          url: '/tasks',
          icon: <ClipboardPenLine />,
          condition: !!caps['CREATE_TASK'],
        }),

        // Billing
        buildMenuItem({
          title: 'Billing',
          url: '/billing',
          icon: <CreditCardIcon />,
          condition: !!perms[Permissions.BRANCH_VIEW_BILLING],
        }),

        // Settings
        buildMenuItem({
          title: 'Settings',
          url: '/settings',
          icon: <SettingsIcon />,
          condition: !!perms[Permissions.BRANCH_VIEW_SETTINGS],
        }),
      ].filter(Boolean) as Items[]

      // Support links
      const supportLinks: Items[] = [
        {
          title: 'Contact Us',
          url: '/contact-us',
          icon: <HelpCircleIcon />,
          items: [],
          isActive: isRouteActive('/contact-us'),
          allowedRoles: [] as Role[],
        },
        {
          title: 'FAQ',
          url: `${BRAND_WEBSITE_URL}/pricing#faq`,
          icon: <LifeBuoyIcon />,
          items: [],
          isActive: false,
          external: true,
          allowedRoles: [] as Role[],
        },
      ]

      // Map items to add isActive states
      const mappedItems = rawItems.map((item): Items => {
        const subItems = item.items?.map(subItem => ({
          ...subItem,
          isActive: isRouteActive(subItem.url),
        }))

        const isChildActive = !!subItems?.some(child => child.isActive)
        const isParentActive = isRouteActive(item.url)

        return {
          ...item,
          items: subItems,
          isActive: isParentActive || isChildActive,
        }
      })

      return {
        team: {
          name: APP_NAME,
          logo: <BrandIcon />,
          plan: user.role || 'Guest',
        },
        items: [...mappedItems, ...supportLinks],
      }
    }

    // PRIORITY 2: Multi-branch in business context
    const isBusinessContext = location.pathname.startsWith('/business')
    if (isBusinessContext && hasBusinessAccess) {
      return {
        team: {
          name: APP_NAME,
          logo: <BrandIcon />,
          plan: 'Business Admin',
        },
        items: [
          buildMenuItem({
            title: 'Overview',
            url: '/business',
            icon: <LayoutDashboardIcon />,
            condition: !!perms[Permissions.BUSINESS_VIEW_PROFILE],
          }),
          buildMenuItem({
            title: 'Profile',
            url: '/business/profile',
            icon: <SettingsIcon />,
            condition: !!perms[Permissions.BUSINESS_VIEW_PROFILE],
          }),
          buildMenuItem({
            title: 'Branches',
            url: '/business/branches',
            icon: <BuildingIcon />,
            condition: !!(perms[Permissions.BUSINESS_VIEW_BRANCHES] && caps['MANAGE_BRANCHES']),
          }),
          buildMenuItem({
            title: 'Customers',
            url: '/business/customers',
            icon: <BookOpenIcon />,
            condition: !!(perms[Permissions.BUSINESS_VIEW_CUSTOMERS] && caps['MANAGE_CUSTOMERS']),
          }),
          buildMenuItem({
            title: 'Suppliers',
            url: '/business/suppliers',
            icon: <ClipboardPenLine />,
            condition: !!(perms[Permissions.BUSINESS_VIEW_SUPPLIERS] && caps['MANAGE_SUPPLIERS']),
          }),
          buildMenuItem({
            title: 'Capabilities',
            url: '/business/capabilities',
            icon: <Package />,
            condition: !!perms[Permissions.BUSINESS_VIEW_CAPABILITIES],
          }),
          buildMenuItem({
            title: 'Permissions',
            url: '/business/permissions',
            icon: <ShieldIcon />,
            condition: !!perms[Permissions.USER_MANAGE_PERMISSIONS],
          }),
          buildMenuItem({
            title: 'Subscription',
            url: '/business/subscription',
            icon: <CreditCardIcon />,
            condition: !!perms[Permissions.BUSINESS_VIEW_BILLING],
          }),
        ]
          .filter(isNotNullish)
          .map(item => ({
            ...item,
            items: [],
            isActive: isRouteActive(item.url),
          })),
      }
    }

    // PRIORITY 3: Multi-branch in branch context
    const rawItems = [
      buildMenuItem({
        title: 'Dashboard',
        url: '/dashboard',
        icon: <LayoutDashboardIcon />,
        condition: !!(perms[Permissions.BRANCH_VIEW_SALES_REPORTS] || perms[Permissions.BRANCH_VIEW_TRANSACTIONS]),
      }),
      buildMenuItem({
        title: 'POS',
        url: '/pos',
        icon: <BookOpenIcon />,
        condition: !!(perms[Permissions.BRANCH_CREATE_ORDER] || perms[Permissions.BRANCH_VIEW_ORDERS]),
      }),
      buildMenuItem({
        title: 'Products',
        url: '#',
        icon: <Package />,
        condition: !!(perms[Permissions.BRANCH_VIEW_PRODUCTS] || perms[Permissions.BRANCH_VIEW_EMPLOYEES]),
        items: [
          perms[Permissions.BRANCH_VIEW_PRODUCTS] ? { title: 'Products', url: '/products' } : null,
          user.business?.businessType === BusinessType.RESTAURANT && perms[Permissions.BRANCH_VIEW_PRODUCTS]
            ? { title: 'Ingredients', url: '/ingredients' }
            : null,
          caps['BATCH_PREPARATION'] && perms[Permissions.BRANCH_VIEW_PRODUCTION] ? { title: 'Preparation', url: '/preparation' } : null,
          caps['BATCH_PREPARATION'] && perms[Permissions.BRANCH_VIEW_PRODUCTION] ? { title: 'Waste History', url: '/preparation/waste-history' } : null,
          caps['CREATE_PURCHASE'] && perms[Permissions.BRANCH_VIEW_PURCHASES] ? { title: 'Purchases', url: '/purchases' } : null,
          perms[Permissions.BRANCH_VIEW_EMPLOYEES] ? { title: 'Employees', url: '/employees' } : null,
        ],
      }),
      buildMenuItem({
        title: 'Reports',
        url: '#',
        icon: <BarChart3 />,
        condition: !!(perms[Permissions.BRANCH_VIEW_SALES_REPORTS] || perms[Permissions.BRANCH_VIEW_TRANSACTIONS] || perms[Permissions.BRANCH_VIEW_ORDERS]),
        items: [
          caps['VIEW_SALES_REPORTS'] && perms[Permissions.BRANCH_VIEW_SALES_REPORTS] ? { title: 'Sales Report', url: '/sales-reports' } : null,
          caps['MANAGE_INVENTORY'] && perms[Permissions.BRANCH_VIEW_INVENTORY_REPORTS] ? { title: 'Inventory Reports', url: '/inventory-reports' } : null,
          perms[Permissions.BRANCH_VIEW_TRANSACTIONS] ? { title: 'Transactions', url: '/transactions' } : null,
          caps['VIEW_ORDER_HISTORY'] && perms[Permissions.BRANCH_VIEW_ORDERS] ? { title: 'Order History', url: '/order-history' } : null,
        ],
      }),
      buildMenuItem({
        title: 'Tasks',
        url: '/tasks',
        icon: <ClipboardPenLine />,
        condition: !!caps['CREATE_TASK'],
      }),
      buildMenuItem({
        title: 'Billing',
        url: '/billing',
        icon: <CreditCardIcon />,
        condition: !!perms[Permissions.BRANCH_VIEW_BILLING],
      }),
      buildMenuItem({
        title: 'Settings',
        url: '/settings',
        icon: <SettingsIcon />,
        condition: !!perms[Permissions.BRANCH_VIEW_SETTINGS],
      }),
    ].filter(Boolean) as Items[]

    // Map items to add isActive states
    const mappedItems = rawItems.map(item => {
      const subItems = item.items?.map(subItem => ({
        ...subItem,
        isActive: isRouteActive(subItem.url),
      }))

      const isChildActive = !!subItems?.some(child => child.isActive)
      const isParentActive = isRouteActive(item.url)

      return {
        ...item,
        items: subItems,
        isActive: isParentActive || isChildActive,
      }
    })

    return {
      team: {
        name: APP_NAME,
        logo: <BrandIcon />,
        plan: user.role || 'Guest',
      },
      items: mappedItems,
    }
  }, [isRouteActive, user, caps, perms, location.pathname, activeBranchCount, buildMenuItem])

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <div className='flex gap-2 py-2'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>{team.logo}</div>
          <div className='grid flex-1 text-left text-sm leading-tight'>
            <span className='truncate font-medium'>{team.name}</span>
            <span className='truncate text-xs'>{team.plan}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map(item =>
              item.items && item.items.length > 0 ? (
                <Collapsible key={item.title} asChild defaultOpen={item.isActive} className='group/collapsible'>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                        {item.icon}
                        <span>{item.title}</span>
                        <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map(subItem => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                              <Link to={subItem.url as never} params={{} as never} search={prev => prev as never}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                    {item.external ? (
                      <a href={item.url} target='_blank' rel='noopener noreferrer'>
                        {item.icon}
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <Link to={item.url as never} params={{} as never} search={prev => prev as never}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SubscriptionStatusFooter />
      <SidebarRail />
    </Sidebar>
  )
}

// Subscription status footer
function SubscriptionStatusFooter() {
  const user = getAuthenticatedUser()
  const authorization = useStore(authStore, state => state.authorization)

  const canViewBilling = authorization?.permissions.includes(Permissions.BUSINESS_VIEW_BILLING) ?? false
  if (!canViewBilling) return null

  const status = user.entitlement?.status
  if (!status || status === SubscriptionStatus.ACTIVE) return null

  const severity = SubscriptionStatusVO.toBannerSeverity(status)
  const label = SubscriptionStatusVO.toLabel(status)

  const colorClass =
    severity === 'error'
      ? 'text-destructive border-destructive/30 bg-destructive/5'
      : severity === 'warning'
        ? 'text-amber-600 border-amber-300/50 bg-amber-50/50 dark:text-amber-400 dark:bg-amber-950/20'
        : 'text-blue-600 border-blue-300/50 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/20'

  return (
    <SidebarFooter className='p-2'>
      <Link
        to='/business/subscription'
        className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80', colorClass)}
      >
        <CreditCardIcon className='h-3.5 w-3.5 shrink-0' />
        <span className='truncate'>{label} — View Billing</span>
      </Link>
    </SidebarFooter>
  )
}
