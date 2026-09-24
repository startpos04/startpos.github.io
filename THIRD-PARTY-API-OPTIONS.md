# Third-Party API Options for Product Catalog Seeding

## Overview
This document evaluates open and commercial APIs that can be used to seed our product template database with real-world product data across different industries.

---

## 🌟 Recommended APIs by Industry

### 1. Food & Beverage (Restaurant/Cafe/Supermarket)

#### **Open Food Facts** ⭐ HIGHLY RECOMMENDED
- **Website**: [openfoodfacts.org](https://world.openfoodfacts.org/)
- **API Docs**: [openfoodfacts.github.io/documentation](https://openfoodfacts.github.io/documentation/docs/)
- **License**: Open Database License (ODbL) - **FREE & OPEN**
- **Coverage**: 3M+ food products from around the world
- **Data Available**:
  - Product name, brand, category
  - Images
  - Ingredients list
  - Nutritional values
  - Allergen information
  - Barcodes (UPC/EAN)
  - Countries where sold
  - Nutri-Score, Eco-Score

**API Examples:**
```bash
# Search for products
GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=coffee&json=1

# Get product by barcode
GET https://world.openfoodfacts.org/api/v2/product/3017620422003

# Search by category
GET https://world.openfoodfacts.org/category/beverages.json
```

**Use Cases:**
- Seed supermarket/grocery product templates
- Restaurant ingredients database
- Cafe beverage templates
- Nutritional information for menu items

**Pros:**
✅ Completely free and open
✅ Massive database (3M+ products)
✅ Community-maintained and growing
✅ Rich nutritional data
✅ Good international coverage
✅ No API key required for basic usage

**Cons:**
❌ Quality varies (community-sourced)
❌ Not all products have complete data
❌ More focused on packaged goods than fresh produce

---

#### **Spoonacular API** 💰 COMMERCIAL (with free tier)
- **Website**: [spoonacular.com/food-api](https://spoonacular.com/food-api)
- **Pricing**: Free tier (150 requests/day), Paid tiers start at $49/month
- **Coverage**: 380K+ recipes, 100K+ menu items, 800K+ food products
- **Data Available**:
  - Recipes with ingredients
  - Restaurant menu items (Burger King, McDonald's, etc.)
  - Food products
  - Nutritional information
  - Wine pairings
  - Meal planning data

**API Examples:**
```bash
# Search menu items
GET https://api.spoonacular.com/food/menuItems/search?query=burger&apiKey=YOUR_KEY

# Get menu item by ID
GET https://api.spoonacular.com/food/menuItems/424571?apiKey=YOUR_KEY

# Search recipes
GET https://api.spoonacular.com/recipes/complexSearch?query=pasta&apiKey=YOUR_KEY
```

**Use Cases:**
- Restaurant menu templates
- Recipe-based product creation
- Chain restaurant menu items

**Pros:**
✅ High-quality curated data
✅ Restaurant-specific menu items
✅ Recipe suggestions with ingredients
✅ Free tier available

**Cons:**
❌ Paid API (after 150 requests/day)
❌ API key required
❌ Rate limits on free tier

---

### 2. Retail Products (General Merchandise)

#### **Barcode Lookup APIs** ⚠️ MIXED

Multiple services available, all commercial:

1. **Go-UPC**
   - Coverage: 1B+ products
   - Pricing: Pay-per-use
   - Good for: Multi-category retail

2. **UPCItemDB**
   - Free tier available
   - Rate limits apply
   - Basic product info

3. **Barcode Lookup (barcodelookup.com)**
   - Commercial API
   - Comprehensive product database
   - Pricing on request

**Use Cases:**
- Retail product templates
- Electronics, fashion, home goods
- Barcode-based product imports

**Pros:**
✅ Broad product coverage
✅ Barcode integration capability

**Cons:**
❌ All require payment for significant usage
❌ Data quality varies by provider
❌ Not industry-specific

---

### 3. Pharmacy/Medicine

#### **Open FDA** ⭐ RECOMMENDED (US-focused)
- **Website**: [open.fda.gov](https://open.fda.gov/)
- **API Docs**: [open.fda.gov/apis/drug/drugsfda](https://open.fda.gov/apis/drug/drugsfda/)
- **License**: Public domain - **FREE**
- **Coverage**: Drugs approved since 1939 (mostly post-1998)
- **Data Available**:
  - Drug names (brand and generic)
  - Active ingredients
  - Dosage forms
  - Route of administration
  - Manufacturer info
  - Approval dates
  - Patient information

**API Examples:**
```bash
# Search drugs
GET https://api.fda.gov/drug/drugsfda.json?search=brand_name:Lipitor

# Search by active ingredient
GET https://api.fda.gov/drug/drugsfda.json?search=active_ingredients:acetaminophen
```

**Use Cases:**
- Pharmacy product templates
- Medicine inventory setup
- Drug information display

**Pros:**
✅ Completely free
✅ Official FDA data
✅ No API key required
✅ Comprehensive US drug database

**Cons:**
❌ US-focused (limited international coverage)
❌ Medical terminology (needs translation)
❌ Complex data structure

---

#### **DrugBank** 💰 COMMERCIAL
- **Website**: [drugbank.com](https://www.drugbank.com/)
- **Pricing**: Enterprise pricing (contact sales)
- **Coverage**: Comprehensive drug database
- **Data Available**:
  - Drug information
  - Interactions
  - Dosing guidelines
  - International coverage

**Pros:**
✅ High-quality medical data
✅ International coverage
✅ Drug interaction checker

**Cons:**
❌ Expensive (enterprise-only)
❌ Not suitable for small-scale seeding

---

### 4. Multi-Industry Options

#### **Wikidata** ⭐ OPEN & VERSATILE
- **Website**: [wikidata.org](https://www.wikidata.org/)
- **API**: SPARQL endpoint
- **License**: CC0 - **FREE & OPEN**
- **Coverage**: Millions of structured items across all categories

**Query Example (SPARQL):**
```sparql
SELECT ?item ?itemLabel ?categoryLabel WHERE {
  ?item wdt:P31 wd:Q2095 # Instance of: Food
  ?item wdt:P361 ?category
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 100
```

**Use Cases:**
- General product templates
- Cross-industry seeding
- Common items (coffee, bread, milk, etc.)

**Pros:**
✅ Completely free
✅ Covers all industries
✅ Structured data

**Cons:**
❌ Requires SPARQL knowledge
❌ Data quality varies
❌ Not product-focused (general knowledge)

---

## 💡 Recommended Strategy

### Phase 1: Core Seeding (Free Sources)
Use **Open Food Facts** + **Wikidata** + manual curation to seed initial templates:

1. **Restaurant/Cafe** (100 templates)
   - Coffee drinks from Wikidata + manual recipes
   - Common ingredients from Open Food Facts
   - Standard menu items (burger, pizza, pasta) - manual

2. **Supermarket** (200 templates)
   - Packaged goods from Open Food Facts
   - Fresh produce - manual curation
   - Common categories (dairy, beverages, snacks)

3. **Pharmacy** (50 templates)
   - Common OTC medicines from Open FDA
   - Basic medical supplies - manual
   - Personal care items from Open Food Facts

4. **Retail** (50 templates)
   - Common retail items - manual curation
   - Generic categories (clothing, electronics, home)

### Phase 2: Enhanced Data (Paid APIs - Optional)
If budget allows, enhance with:
- **Spoonacular** for restaurant menu items (150/day free tier)
- **Barcode APIs** for retail product scanning feature
- **DrugBank** for pharmacy-specific advanced features

---

## 🛠️ Implementation Approach

### Option A: One-Time Seeding (Recommended for MVP)
```typescript
// scripts/seed-templates-from-apis.ts

import { rootPrisma } from '@/lib/prisma-client'

async function seedFromOpenFoodFacts() {
  const categories = ['beverages', 'dairy', 'snacks', 'breakfast']
  
  for (const category of categories) {
    const response = await fetch(
      `https://world.openfoodfacts.org/category/${category}.json?page_size=50`
    )
    const data = await response.json()
    
    for (const product of data.products) {
      await rootPrisma.productTemplate.create({
        data: {
          name: product.product_name,
          description: product.generic_name,
          image: product.image_url,
          industryType: 'SUPERMARKET',
          categoryName: category,
          baseUnitName: 'Piece',
          tags: product.categories_tags || [],
          suggestedPrice: null, // Set manually or use ML
          suggestedCost: null,
        }
      })
    }
  }
}

async function seedFromWikidata() {
  // Use SPARQL queries to fetch common items
  // Transform and insert into productTemplate table
}

async function seedManualTemplates() {
  // Curated list of common products for each industry
  const restaurantTemplates = [
    {
      name: 'Cappuccino',
      industryType: 'RESTAURANT',
      categoryName: 'Hot Beverages',
      baseUnitName: 'Cup',
      variants: [
        { name: 'Small', suggestedPrice: 300 },
        { name: 'Medium', suggestedPrice: 350 },
        { name: 'Large', suggestedPrice: 450 },
      ],
      ingredients: [
        { ingredientName: 'Espresso Shot', quantity: 1, unitName: 'shot' },
        { ingredientName: 'Milk', quantity: 150, unitName: 'ml' },
      ]
    },
    // ... more templates
  ]
  
  for (const template of restaurantTemplates) {
    await rootPrisma.productTemplate.create({
      data: {
        ...template,
        variants: {
          create: template.variants
        },
        ingredients: {
          create: template.ingredients
        }
      }
    })
  }
}

// Run all seeders
await seedManualTemplates()
await seedFromOpenFoodFacts()
await seedFromWikidata()
```

### Option B: Live API Integration (Future Enhancement)
```typescript
// lib/queries/fetch-product-suggestions.ts

export async function fetchProductSuggestions(query: string) {
  // Search both local templates AND external APIs
  const [localResults, apiResults] = await Promise.all([
    searchLocalTemplates(query),
    searchOpenFoodFacts(query),
  ])
  
  return {
    local: localResults,
    external: apiResults.map(transformToTemplate),
  }
}
```

---

## 📊 Data Quality Considerations

### Open Food Facts Quality Issues
1. **Missing Data**: Not all products have complete information
2. **User-Generated**: Quality varies by contributor
3. **Language Mixing**: Some products have mixed language data
4. **Duplicates**: Same product may exist multiple times

**Solutions:**
- Filter by completion score (`completeness > 0.7`)
- Prefer products with images
- Deduplicate by name/barcode
- Manual review of high-popularity items

### Pricing Strategy
APIs typically don't include retail prices. Options:
1. **Manual Curation**: Research and set suggested prices
2. **Regional Pricing**: Different prices by country
3. **User Override**: Always allow customization
4. **ML Model**: Train on user-provided prices over time

---

## 🔐 Legal & Compliance

### Open Food Facts
- **License**: ODbL (Open Database License)
- **Attribution Required**: Yes (in app footer or about page)
- **Commercial Use**: ✅ Allowed
- **Derivative Works**: ✅ Allowed (must share-alike)

**Attribution Example:**
```
Product data from Open Food Facts (openfoodfacts.org)
Licensed under ODbL. Product images © respective manufacturers.
```

### Open FDA
- **License**: Public Domain
- **Attribution**: Not required but recommended
- **Commercial Use**: ✅ Allowed
- **Restrictions**: None

### Spoonacular
- **License**: Commercial API
- **Terms**: Subject to API agreement
- **Attribution**: Required per terms
- **Data Ownership**: Belongs to Spoonacular

---

## 💰 Cost Analysis

### Free Approach (Recommended for MVP)
- **Open Food Facts**: Free
- **Open FDA**: Free
- **Wikidata**: Free
- **Manual Curation**: Time investment only
- **Total Cost**: $0/month

**Coverage Estimate:**
- 400-500 high-quality templates across industries
- Sufficient for V1 launch

### Paid Approach (Future Enhancement)
- **Spoonacular**: $49-$149/month
- **Barcode APIs**: $20-$100/month
- **DrugBank**: $1000+/month (enterprise)
- **Total Cost**: $69-$1249+/month

**Additional Coverage:**
- Restaurant menu items: +1000 templates
- Retail products: +5000 templates
- Pharmacy: +2000 templates

---

## 🎯 Final Recommendation

### For V1 Launch: **Hybrid Approach**

1. **Manual Curation** (300 templates)
   - Restaurant: 100 items (coffee, food, desserts)
   - Retail: 50 items (common categories)
   - Pharmacy: 50 items (OTC medicines)
   - Supermarket: 100 items (produce, dairy, packaged goods)

2. **Open Food Facts** (100 templates)
   - Packaged food products
   - Beverages
   - Snacks and pantry items

3. **Open FDA** (50 templates)
   - Common OTC medications
   - Popular prescriptions (generics)

**Total: 450 curated templates across all industries**

### For Future: **Enhanced Integration**

Once we have user traction and revenue:
- Add Spoonacular for restaurant features
- Add barcode scanning with commercial APIs
- Build ML model to suggest prices based on user data
- Allow community-contributed templates

---

## 📝 Next Steps

1. ✅ Review this document with team
2. ⬜ Decide on initial template count per industry
3. ⬜ Create manual template data (CSV/JSON format)
4. ⬜ Build Open Food Facts integration script
5. ⬜ Build Open FDA integration script
6. ⬜ Test data quality and completeness
7. ⬜ Seed development database
8. ⬜ Add attribution to app footer
9. ⬜ Document data sources in admin panel

---

**Last Updated**: 2026-09-19  
**Owner**: Development Team  
**Status**: Awaiting Review
