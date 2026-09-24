/**
 * Roadmap data shared between product-intro and features pages
 * This ensures consistency across all roadmap sections
 */

export interface RoadmapItem {
  id: string
  icon: string
  title: string
  tagline: string
  description: string
  bullets: string[]
  plan: string
  planVariant: string
  capabilities: string[]
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: 'loyalty',
    icon: '⭐',
    title: 'Loyalty Points',
    plan: 'Premium+',
    planVariant: 'orange',
    tagline: 'Keep regulars coming back with points they can actually spend.',
    description: 'A native loyalty programme — no third-party app required. Customers earn points on every purchase and redeem them for discounts. Currently in development.',
    bullets: [
      'Points earned per transaction, configurable earn rate per plan',
      'Redeemable at checkout for a discount on the next purchase',
      'Customer-facing points balance visible at checkout',
      'Points history per customer profile',
      'Expiry rules for points to encourage timely redemption',
    ],
    capabilities: ['LOYALTY_POINTS'],
  },
  {
    id: 'kds',
    icon: '🖥️',
    title: 'Kitchen Display System',
    plan: 'Enterprise+',
    planVariant: 'orange',
    tagline: 'Incoming orders, straight to the kitchen screen.',
    description: 'A dedicated kitchen display that shows every order the moment it\'s placed. Keeps front-of-house and kitchen in sync without paper tickets.',
    bullets: [
      'Real-time order display on a separate kitchen screen or tablet',
      'Order status updates visible to both kitchen and front-of-house',
      'Filter by station — hot food, cold prep, drinks',
      'Audio alert on new order arrival',
    ],
    capabilities: ['KITCHEN_DISPLAY'],
  },
  {
    id: 'delivery',
    icon: '🚚',
    title: 'Delivery Management',
    plan: 'Enterprise+',
    planVariant: 'orange',
    tagline: 'Coordinate deliveries without switching apps.',
    description: 'Assign delivery orders to drivers, track delivery status, and manage delivery zones from inside Start POS.',
    bullets: [
      'Delivery order type at checkout with address capture',
      'Driver assignment and status tracking',
      'Delivery zone management',
      'Integration with the order queue',
    ],
    capabilities: ['DELIVERY_MANAGEMENT'],
  },
]