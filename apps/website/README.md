# Start POS Marketing Website

A conversion-focused marketing website built with **Astro** that explains what Start POS is, demonstrates its value to potential customers, and guides visitors toward a free trial or sales conversation.

**Live Site:** https://startpos04.github.io  
**Target Audience:** Small-to-medium business owners running retail shops, grocery stores, or restaurants in the Philippines and Southeast Asia.

## 🎯 Goals

- **Primary:** Convert visitors to free trial signups
- **Secondary:** Support sales presentations with rich visuals and pricing information

## 🚀 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Astro (static output) |
| Styling | Tailwind CSS v4 |
| Interactivity | Vanilla JavaScript (Astro islands) |
| Icons | Lucide (matches main app) |
| Deployment | GitHub Pages |
| Analytics | Plausible |

## 📁 Project Structure

```
src/
├── components/
│   ├── diagrams/        # Interactive product interface diagrams
│   │   ├── POSInterface.astro        # Main checkout interface
│   │   ├── RetailWorkflow.astro      # Retail business flow
│   │   ├── RestaurantWorkflow.astro  # Restaurant order management
│   │   ├── GroceryWorkflow.astro     # Grocery operations
│   │   ├── InventoryInterface.astro  # Stock management UI
│   │   └── ReportsInterface.astro    # Sales analytics dashboard
│   ├── layout/          # Header, Footer, Section wrapper
│   ├── ui/             # Button, Badge, Card, Accordion, PlanCard
│   └── sections/       # Homepage sections (Hero, Features, etc.)
├── layouts/
│   └── BaseLayout.astro # Main page template
├── pages/              # All website pages
├── styles/
│   ├── global.css      # Global styles and utilities
│   └── print.css       # Print-specific styles
└── constants.ts        # Site configuration and content
```

## 🛠️ Development

### Prerequisites

- Node.js 22.12.0+
- pnpm 10.0.0+

### Setup

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The dev server runs at `http://localhost:4321`

### Key Features Implemented

- ✅ **Responsive design** - Mobile-first approach
- ✅ **Interactive components** - Business type selector, pricing toggle, mobile menu
- ✅ **Scroll animations** - Intersection Observer-based reveal animations
- ✅ **Contact form** - Formspree integration with validation
- ✅ **SEO optimization** - Meta tags, Open Graph, structured data
- ✅ **Analytics** - Plausible tracking
- ✅ **Presentation mode** - `?present=true` for sales demos

## 📄 Pages Overview

| Page | Purpose | Status |
|------|---------|---------|
| **Home** (`/`) | Full story, hero to CTA | ✅ Complete |
| **Features** (`/features`) | Detailed feature walkthrough | ✅ Complete |
| **Pricing** (`/pricing`) | Plan comparison + FAQ | ✅ Complete |
| **Use Cases** | Business-specific stories | ✅ All 3 complete |
| **About** (`/about`) | Company story & principles | ✅ Complete |
| **Contact** (`/contact`) | Lead capture form | ✅ Complete |
| **Legal** | Privacy Policy & Terms | ✅ Complete |

## 🎨 Design System

### Colors
- **Primary:** `#10b981` (Emerald 500) - matches the app
- **Accent:** `#8b5cf6` (Violet 500) - complementary
- **Dark:** `#0f172a` (Slate 900) - hero backgrounds
- **Text:** Slate scale for hierarchy

### Typography
- **Font:** Inter (variable weight)
- **Headings:** Font-black (900) for impact
- **Body:** Regular (400) for readability

### Components
All components follow consistent patterns:
- **Buttons:** Rounded-xl, font-semibold
- **Cards:** Rounded-2xl with subtle shadows
- **Sections:** Consistent padding, max-width constraints

## 🔧 Configuration

### Key Constants (`src/constants.ts`)

```typescript
// App integration
export const APP_URL = 'https://startpos04.github.io/'

// Contact form
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpznegqy'

// Pricing
export const ANNUAL_DISCOUNT_PCT = 20
```

### Environment Variables

Currently using static configuration. All settings are in `src/constants.ts`.

## 📈 Analytics & Tracking

- **Plausible Analytics** configured for `startpos04.github.io`
- **Privacy-first** - no cookie banners needed
- **Goal tracking** - Set up goals for trial signups and contact form submissions

## 🚀 Deployment

### GitHub Pages Setup

1. **Repository:** Uses this monorepo's GitHub Pages
2. **Branch:** Deploys from `main` branch
3. **Workflow:** `.github/workflows/deploy.yml` handles build and deployment
4. **Domain:** Currently `startpos04.github.io` (configurable for custom domain)

### Deploy Process

```bash
# 1. Build locally to test
pnpm build

# 2. Push to main branch
git push origin main

# 3. GitHub Actions automatically builds and deploys
```

## 🎯 Business Features

### Presentation Mode
Add `?present=true` to any URL for fullscreen presentation mode:
- Hides header/footer
- Enables scroll-snap between sections
- Perfect for sales demos

### Contact Form Integration
- **Formspree** backend handles form submissions
- **Client-side validation** with real-time feedback
- **Automatic responses** configured in Formspree dashboard

### Interactive Elements
- **Business type selector** - Tabbed interface showcasing different industries
- **Pricing toggle** - Monthly/Annual switching with discount calculation
- **FAQ accordion** - Expandable Q&A sections
- **Mobile navigation** - Responsive hamburger menu

## 🔍 SEO Optimization

### Meta Data
- Unique titles and descriptions for each page
- Open Graph tags for social sharing
- Twitter Card support

### Structured Data
- Organization schema for company info
- Product schema for pricing information
- LocalBusiness schema for Philippines market

### Performance
- Static generation for fast loading
- Optimized images and assets
- Minimal JavaScript footprint

## 📝 Content Management

### Plan Data
Pricing plans are configured in `constants.ts`:
- Easy to update pricing without code changes
- Consistent across all components
- Annual discount calculated automatically

### FAQ Management
Questions and answers in `constants.ts`:
- Single source of truth for common questions
- Easy to add/remove/edit FAQ items
- Automatic accordion generation

## 🐛 Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Styles Not Loading:**
- Check Tailwind CSS v4 configuration in `astro.config.mjs`
- Verify `@import 'tailwindcss'` in `global.css`

**Interactive Features Not Working:**
- Check browser console for JavaScript errors
- Verify script tags are properly loaded
- Test in incognito mode to rule out extensions

## 🚀 Future Enhancements

### Phase 2 (Content)
- [ ] Real app screenshots (replace mockups)
- [ ] Customer testimonials (when available - currently hidden)
- [ ] Case studies from actual businesses

### Phase 2 (Features)
- [ ] Interactive product demo
- [ ] Live chat integration
- [ ] A/B testing setup

### Phase 3 (Advanced)
- [ ] Multi-language support (Filipino/English)
- [ ] Advanced analytics and conversion tracking
- [ ] Progressive Web App features

---

## 📧 Support

For website issues or questions:
- **Technical:** Check GitHub Issues
- **Content:** Contact marketing team
- **Bugs:** Create issue with reproduction steps

**Last Updated:** December 2024
