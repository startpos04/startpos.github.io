# Product Dictionary Implementation Plan

## Overview
Implement a platform-level product catalog/dictionary that provides pre-configured product templates to help users quickly set up their stores with autocomplete suggestions during product creation.

---

## 1. Problem Statement

**Current State:**
- Users must manually create every product from scratch
- No suggestions or templates available
- Time-consuming setup process for new businesses
- Inconsistent product naming and categorization

**Desired State:**
- Users can search and select from a curated product catalog
- Autocomplete suggestions during product creation
- One-click product import with pre-filled data
- Industry-specific product templates (Restaurant, Retail, Pharmacy, etc.)
- Users can still customize or create products from scratch

---

## 2. Data Architecture

### 2.1 New Platform Models (Platform-scoped, no businessId)

```prisma
// Platform-level product catalog
model ProductTemplate {
  id          String   @id @default(cuid())
  name        String   // e.g. "Cappuccino", "Paracetamol 500mg"
  description String?  // Brief description
  image       String?  // Default product image URL
  
  // Product Properties
  type            ResourceType @default(PHYSICAL_GOOD)
  suggestedPrice  Int?         @db.Integer // Suggested retail price in cents
  suggestedCost   Int?         @db.Integer // Suggested cost price in cents
  
  // Classification
  industryType    IndustryType // RESTAURANT, RETAIL, PHARMACY, etc.
  categoryName    String       // "Beverages", "Hot Drinks", "Medicine"
  baseUnitName    String       // "Cup", "Piece", "Tablet"
  
  // Metadata
  tags            String[]     // ["coffee", "espresso", "hot beverage"]
  popularity      Int          @default(0) // Usage count for ranking
  isActive        Boolean      @default(true)
  
  // Relations
  variants        ProductTemplateVariant[]
  ingredients     ProductTemplateIngredient[]
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@index([industryType, isActive])
  @@index([categoryName])
  @@map("product_templates")
}

// Variants for templates
model ProductTemplateVariant {
  id         String @id @default(cuid())
  templateId String
  template   ProductTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  name              String?              // "Small", "Medium", "Large"
  attributeType     VariantAttributeType @default(SIZE)
  suggestedPrice    Int?                 @db.Integer
  suggestedCost     Int?                 @db.Integer
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("product_template_variants")
}

// Recipe/ingredients for templates
model ProductTemplateIngredient {
  id         String @id @default(cuid())
  templateId String
  template   ProductTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  ingredientName String  // "Espresso Shot", "Milk", "Sugar"
  quantity       Float   // 1.0, 200.0
  unitName       String  // "shot", "ml", "tsp"
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("product_template_ingredients")
}

// Track which templates users have imported
model BusinessProductImport {
  id          String @id @default(cuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id])
  
  templateId  String
  productId   String  // The actual product created
  
  createdAt   DateTime @default(now())
  
  @@unique([businessId, templateId])
  @@index([businessId])
  @@map("business_product_imports")
}

// Add to existing Business model
// business.prisma: productImports BusinessProductImport[]
```

### 2.2 Add IndustryType Enum

```prisma
enum IndustryType {
  RESTAURANT
  CAFE
  BAKERY
  RETAIL
  PHARMACY
  SUPERMARKET
  SALON_SPA
  GYM_FITNESS
  AUTOMOTIVE
  ELECTRONICS
  FASHION
  GENERAL
}
```

---

## 3. API Layer

### 3.1 Core API (Platform-level reads - no auth required)

```typescript
// lib/prisma-client/core-api.ts
// Add to PLATFORM_MODELS whitelist:
// 'productTemplate', 'productTemplateVariant', 'productTemplateIngredient', 'businessProductImport'

// Usage:
const result = await coreAPI.productTemplate('findMany', {
  where: { 
    industryType: 'RESTAURANT',
    isActive: true 
  },
  include: { 
    variants: true, 
    ingredients: true 
  },
  orderBy: { popularity: 'desc' },
  take: 50
})
```

### 3.2 Query Functions

```typescript
// lib/queries/fetch-product-templates.ts
export const fetchProductTemplates = async (input: {
  search?: string
  industryType?: IndustryType
  categoryName?: string
  limit?: number
}) => {
  const result = await coreAPI.productTemplate('findMany', {
    where: {
      isActive: true,
      ...(input.industryType && { industryType: input.industryType }),
      ...(input.categoryName && { categoryName: input.categoryName }),
      ...(input.search && {
        OR: [
          { name: { contains: input.search, mode: 'insensitive' } },
          { tags: { hasSome: [input.search.toLowerCase()] } },
        ]
      })
    },
    include: { variants: true, ingredients: true },
    orderBy: { popularity: 'desc' },
    take: input.limit ?? 50,
  })
  
  if (result.isErr()) throw new Error(result.error)
  return result.value
}

// lib/queries/import-product-template.ts
export const importProductTemplate = async (input: {
  templateId: string
  customizations?: {
    name?: string
    price?: number
    categoryId?: string
  }
}) => {
  // 1. Fetch template from coreAPI
  // 2. Create actual product using dbTransaction
  // 3. Map template data to product/variant structure
  // 4. Record import in BusinessProductImport
  // 5. Increment template popularity
}
```

---

## 4. UI Components

### 4.1 Product Template Search Modal

```typescript
// components/custom/product-template-search.tsx
interface ProductTemplateSearchProps {
  onSelect: (template: ProductTemplate) => void
  industryType?: IndustryType
}

export function ProductTemplateSearch({ onSelect, industryType }: ProductTemplateSearchProps) {
  // Features:
  // - Search input with debounce
  // - Filter by category
  // - Display as cards with image, name, price
  // - "Import" button per template
  // - "Already imported" badge for imported templates
  // - Preview modal showing full template details
}
```

### 4.2 Template Preview Modal

```typescript
// components/custom/product-template-preview.tsx
interface ProductTemplatePreviewProps {
  template: ProductTemplate
  onImport: (template: ProductTemplate) => void
  onCustomizeAndImport: (template: ProductTemplate) => void
}

export function ProductTemplatePreview({ template, onImport, onCustomizeAndImport }: ProductTemplatePreviewProps) {
  // Features:
  // - Show full template details (image, description, variants, ingredients)
  // - Display suggested prices
  // - "Import As-Is" button
  // - "Customize & Import" button (opens create-product form with pre-filled data)
  // - Show which category/unit will be created if they don't exist
}
```

### 4.3 Enhanced Product Creation

```typescript
// routes/(private)/(dashboard)/products/create/-create-product.tsx
// Add new features:

// 1. "Browse Templates" button at top
<Button onClick={() => MountManager.show(ProductTemplateSearch, { onSelect: handleTemplateSelect })}>
  <Search /> Browse Product Templates
</Button>

// 2. Autocomplete in name field
<TextInput 
  field={field} 
  label='Name' 
  placeholder='e.g. Latte'
  suggestions={productTemplates} // Filtered as user types
  onSuggestionSelect={handleTemplateSelect}
/>

// 3. Template indicator when form is pre-filled
{selectedTemplate && (
  <div className='flex items-center gap-2 p-2 bg-blue-50 rounded'>
    <Info className='w-4 h-4' />
    <span className='text-xs'>Based on template: {selectedTemplate.name}</span>
    <Button onClick={clearTemplate}>Clear</Button>
  </div>
)}
```

---

## 5. Seeding Strategy

### 5.1 Template Categories by Industry

**Restaurant/Cafe:**
- Beverages: Coffee, Tea, Juices, Sodas
- Hot Drinks: Espresso, Cappuccino, Latte, Mocha
- Cold Drinks: Iced Coffee, Smoothies, Milkshakes
- Food: Sandwiches, Burgers, Pasta, Pizza
- Desserts: Cakes, Ice Cream, Pastries

**Pharmacy:**
- Medicines: Common painkillers, antibiotics, vitamins
- Personal Care: Soap, Shampoo, Toothpaste
- Medical Supplies: Bandages, Thermometers

**Retail:**
- Clothing: T-shirts, Jeans, Shoes
- Electronics: Headphones, Chargers, Cases
- Home Goods: Kitchenware, Decor

**Supermarket:**
- Fresh Produce: Fruits, Vegetables
- Dairy: Milk, Cheese, Yogurt
- Pantry: Rice, Pasta, Canned Goods

### 5.2 Seed Script

```typescript
// prisma/seeders/product-templates.ts
export async function seedProductTemplates() {
  const templates = [
    {
      name: 'Cappuccino',
      industryType: 'RESTAURANT',
      categoryName: 'Hot Beverages',
      baseUnitName: 'Cup',
      type: 'SERVICE',
      suggestedPrice: 350, // $3.50
      suggestedCost: 80,   // $0.80
      tags: ['coffee', 'espresso', 'hot', 'beverage'],
      variants: [
        { name: 'Small', attributeType: 'SIZE', suggestedPrice: 300 },
        { name: 'Medium', attributeType: 'SIZE', suggestedPrice: 350 },
        { name: 'Large', attributeType: 'SIZE', suggestedPrice: 450 },
      ],
      ingredients: [
        { ingredientName: 'Espresso Shot', quantity: 1, unitName: 'shot' },
        { ingredientName: 'Milk', quantity: 150, unitName: 'ml' },
        { ingredientName: 'Milk Foam', quantity: 50, unitName: 'ml' },
      ]
    },
    // ... more templates
  ]
  
  await rootPrisma.productTemplate.createMany({ data: templates })
}
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Prisma models (ProductTemplate, ProductTemplateVariant, ProductTemplateIngredient)
- [ ] Add IndustryType enum
- [ ] Update coreAPI whitelist
- [ ] Run migration
- [ ] Create seed data for 20-30 common products across industries
- [ ] Seed templates to database

### Phase 2: API Layer (Week 1-2)
- [ ] Implement fetchProductTemplates query
- [ ] Implement importProductTemplate mutation
- [ ] Add template search with filters
- [ ] Handle category/unit auto-creation during import
- [ ] Track imports in BusinessProductImport table

### Phase 3: UI Components (Week 2)
- [ ] Build ProductTemplateSearch modal
- [ ] Build ProductTemplatePreview modal
- [ ] Add "Browse Templates" button to product creation page
- [ ] Implement template selection and pre-fill logic
- [ ] Add template indicator UI

### Phase 4: Autocomplete (Week 2-3)
- [ ] Add real-time search suggestions in name field
- [ ] Implement fuzzy matching for template search
- [ ] Add keyboard navigation for suggestions
- [ ] Handle template selection from dropdown

### Phase 5: Polish & Testing (Week 3)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test import flow end-to-end
- [ ] Test with different industry types
- [ ] Add analytics tracking for template usage
- [ ] Update template popularity scores

### Phase 6: Admin Tools (Future)
- [ ] Admin UI to manage templates
- [ ] Bulk template upload (CSV/JSON)
- [ ] Template approval workflow
- [ ] Community-submitted templates

---

## 7. User Experience Flow

### Flow 1: Template Search & Import
```
1. User clicks "Create Product"
2. User clicks "Browse Templates" button
3. Modal opens with search + filter by category
4. User searches "coffee" → sees Latte, Cappuccino, Espresso
5. User clicks "Preview" on Cappuccino
6. Preview shows: image, description, 3 variants, 3 ingredients, suggested price
7. User clicks "Import As-Is"
8. System creates:
   - Category "Hot Beverages" (if doesn't exist)
   - Unit "Cup" (if doesn't exist)
   - Product "Cappuccino" with 3 variants and recipe
9. User is redirected to product detail page
10. Success message: "Cappuccino imported! You can customize it anytime."
```

### Flow 2: Autocomplete During Manual Creation
```
1. User clicks "Create Product"
2. User starts typing "Cap..." in name field
3. Dropdown shows: "Cappuccino ☕", "Caprese Salad 🥗"
4. User clicks "Cappuccino ☕"
5. Form auto-fills with template data
6. User can still edit any field
7. User adds their own pricing/adjustments
8. User clicks "Save"
9. Product created with customizations
```

### Flow 3: Industry-Specific Onboarding
```
1. During business registration, user selects "Restaurant"
2. After registration, onboarding wizard suggests:
   "Want to quickly add menu items? We have 50+ restaurant templates."
3. User clicks "Browse Templates"
4. User bulk-selects 10 items: Coffee, Tea, Water, Burger, Fries, etc.
5. User clicks "Import All (10)"
6. All 10 products created in seconds
7. User's store is ready to start selling
```

---

## 8. Technical Considerations

### 8.1 Offline Support
- ❌ Templates are **online-only** (acceptable per development-context.md)
- ✅ Once imported, products work offline like any other product
- Reasoning: Template browsing is infrequent setup activity, not core POS operation

### 8.2 Data Sync
- Templates are platform-level (no businessId)
- Use `coreAPI` for reads (public, no auth)
- Use `dbTransaction` for import mutations (creates tenant-scoped products)

### 8.3 Customization Strategy
- Templates provide **suggestions**, not mandates
- Users can modify everything: name, price, variants, ingredients
- Import creates a **copy**, not a reference (full ownership)
- Original template remains unchanged

### 8.4 Category/Unit Handling
- If template's `categoryName` doesn't exist → create it automatically
- If template's `baseUnitName` doesn't exist → create it automatically
- Match case-insensitive to avoid duplicates
- Log auto-created categories/units for user awareness

### 8.5 Performance
- Cache frequently accessed templates in-memory
- Paginate search results (50 per page)
- Index on industryType, categoryName, tags
- Use popularity score for ranking

---

## 9. Future Enhancements

### 9.1 Smart Recommendations
- Analyze business type and suggest relevant templates
- "Businesses like yours often add these products..."
- ML-based suggestions based on existing products

### 9.2 Community Templates
- Allow businesses to share their successful products as templates
- Approval workflow for platform team
- Rating/review system for templates

### 9.3 Multi-Language Support
- Templates in multiple languages
- User selects preferred language during search
- Template names/descriptions localized

### 9.4 Supplier Integration
- Link templates to common suppliers
- "Import this product and we'll suggest suppliers"
- Pre-filled supplier data for purchase orders

### 9.5 Industry Packs
- "Restaurant Starter Pack" (50 common items)
- "Pharmacy Essentials" (100 medicines)
- One-click bulk import for entire pack

---

## 10. Success Metrics

### Key Metrics to Track:
1. **Template Search Rate**: % of new products created via template vs manual
2. **Time to First Product**: Avg time from account creation to first product
3. **Template Popularity**: Most imported templates per industry
4. **Customization Rate**: % of templates imported as-is vs customized
5. **User Satisfaction**: Survey feedback on template usefulness

### Target Goals:
- 60%+ of products created using templates
- 50% reduction in time to first product
- 90%+ satisfaction rating for template feature

---

## 11. Open Questions

1. **Pricing Strategy**: Should templates include regional pricing (US vs Africa)?
2. **Image Licensing**: Where do we source product images? Stock photos or custom?
3. **Update Strategy**: How do we handle template updates? Notify users who imported?
4. **Bulk Import**: Should we allow CSV upload of custom templates?
5. **Template Versioning**: Track template versions for auditing?

---

## 12. Files to Create/Modify

### New Files:
- `packages/platform/prisma/models/platform/product-template.prisma`
- `packages/platform/lib/queries/fetch-product-templates.ts`
- `packages/platform/lib/queries/import-product-template.ts`
- `packages/platform/components/custom/product-template-search.tsx`
- `packages/platform/components/custom/product-template-preview.tsx`
- `packages/platform/prisma/seeders/product-templates.ts`
- `packages/platform/prisma/seeders/data/product-templates.json`

### Modified Files:
- `packages/platform/prisma/models/base/product.prisma` (add IndustryType enum)
- `packages/platform/prisma/models/base/business.prisma` (add productImports relation)
- `packages/platform/lib/prisma-client/core-api.ts` (add to PLATFORM_MODELS)
- `apps/web/src/routes/(private)/(dashboard)/products/create/-create-product.tsx`
- `apps/web/src/routes/(private)/(dashboard)/products/create/index.tsx`

---

## 13. Testing Strategy

### Unit Tests (Pattern A):
- Template search filtering logic
- Template-to-product mapping logic
- Category/unit auto-creation logic

### Integration Tests (Pattern C1):
- Template import creates correct product structure
- Import handles missing categories/units
- Import records BusinessProductImport entry
- Duplicate imports are prevented

### E2E Tests (Playwright):
- Search templates by name
- Filter templates by category
- Preview template details
- Import template creates product
- Autocomplete suggests templates

---

## Next Steps

1. **Review & Approve**: Discuss plan with team, get feedback
2. **Prioritize Features**: Decide which phases to implement first
3. **Data Collection**: Gather list of common products per industry
4. **Design Review**: UI/UX review of modal designs
5. **Start Implementation**: Begin with Phase 1 (Foundation)

---

**Estimated Effort**: 3 weeks for full implementation (Phases 1-5)  
**Priority**: Medium (Nice-to-have enhancement, not blocking V1 launch)  
**Impact**: High (Significantly improves user onboarding experience)
