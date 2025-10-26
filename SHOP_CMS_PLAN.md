# ObliKey - Shop & CMS Implementeringsplan

## 🎯 Oversikt

Dette dokumentet beskriver implementeringen av:
1. **Shop/Butikk** - Produkter, handlekurv, bestillinger
2. **Nyheter/Blog** - Artikler, kategorier
3. **CMS Homepage Builder** - Drag-and-drop side-editor

## 📦 Moduler som Skal Bygges

### 1. Shop Module

**Database Modeller:**
- `Product` - Produkter (fysiske varer, PT-tjenester, medlemskap)
- `ProductImage` - Flere bilder per produkt
- `ProductCategory` - Kategorisering
- `Order` - Bestillinger
- `OrderItem` - Produkter i bestilling
- `Cart` - Handlekurv

**Backend API:**
```
GET    /api/shop/products              # Liste produkter (public)
GET    /api/shop/products/:id          # Hent produkt (public)
POST   /api/shop/products              # Opprett produkt (ADMIN)
PATCH  /api/shop/products/:id          # Oppdater produkt (ADMIN)
DELETE /api/shop/products/:id          # Slett produkt (ADMIN)
POST   /api/shop/products/:id/images   # Last opp bilde (ADMIN)
DELETE /api/shop/images/:id            # Slett bilde (ADMIN)

GET    /api/shop/categories            # Liste kategorier
POST   /api/shop/categories            # Opprett kategori (ADMIN)

POST   /api/shop/cart                  # Legg til i handlekurv
GET    /api/shop/cart                  # Hent handlekurv
DELETE /api/shop/cart/:itemId          # Fjern fra handlekurv

POST   /api/shop/orders                # Opprett bestilling
GET    /api/shop/orders                # Liste bestillinger (mine)
GET    /api/shop/orders/:id            # Hent bestilling
```

**Frontend Sider:**
- `/shop` - Produktliste (public)
- `/shop/:slug` - Produktdetalj (public)
- `/cart` - Handlekurv
- `/checkout` - Kasse
- `/admin/products` - Produktadministrasjon (ADMIN)
- `/admin/orders` - Bestillingsadministrasjon (ADMIN)

### 2. News/Blog Module

**Database Modeller:**
- `Article` - Artikler/nyheter
- `ArticleCategory` - Kategorier

**Backend API:**
```
GET    /api/news                       # Liste artikler (public)
GET    /api/news/:slug                 # Hent artikkel (public)
POST   /api/news                       # Opprett artikkel (ADMIN)
PATCH  /api/news/:id                   # Oppdater artikkel (ADMIN)
DELETE /api/news/:id                   # Slett artikkel (ADMIN)
POST   /api/news/:id/publish           # Publiser artikkel (ADMIN)

GET    /api/news/categories            # Liste kategorier
POST   /api/news/categories            # Opprett kategori (ADMIN)
```

**Frontend Sider:**
- `/news` - Artikkelliste (public)
- `/news/:slug` - Artikkeldetalj (public)
- `/admin/news` - Nyhetsadministrasjon (ADMIN)

### 3. CMS Module

**Database Modeller:**
- `Page` - Sider
- `ContentBlock` - Innholdsblokker (drag-and-drop)
- `Media` - Mediebibliotek

**Backend API:**
```
GET    /api/cms/pages                  # Liste sider
GET    /api/cms/pages/:slug            # Hent side (public)
POST   /api/cms/pages                  # Opprett side (ADMIN)
PATCH  /api/cms/pages/:id              # Oppdater side (ADMIN)
DELETE /api/cms/pages/:id              # Slett side (ADMIN)

POST   /api/cms/media                  # Last opp media (ADMIN)
GET    /api/cms/media                  # Mediebibliotek (ADMIN)
DELETE /api/cms/media/:id              # Slett media (ADMIN)
```

**Frontend Sider:**
- `/` - Homepage (fra CMS hvis aktivert)
- `/admin/pages` - Sideadministrasjon (ADMIN)
- `/admin/pages/:id/edit` - Drag-and-drop builder (ADMIN)
- `/admin/media` - Mediebibliotek (ADMIN)

## 🗂️ Fil Struktur

```
backend/
├── prisma/
│   ├── schema.prisma (oppdatert)
│   └── schema-shop-cms.prisma (referanse)
├── src/
│   ├── controllers/
│   │   ├── shop.controller.ts
│   │   ├── product.controller.ts
│   │   ├── order.controller.ts
│   │   ├── news.controller.ts
│   │   ├── cms.controller.ts
│   │   └── media.controller.ts
│   ├── routes/
│   │   ├── shop.routes.ts
│   │   ├── news.routes.ts
│   │   └── cms.routes.ts
│   └── services/
│       ├── imageUpload.service.ts
│       └── slug.service.ts

frontend/
├── src/
│   ├── pages/
│   │   ├── public/
│   │   │   ├── PublicHomePage.tsx
│   │   │   ├── ShopPage.tsx
│   │   │   ├── ProductPage.tsx
│   │   │   ├── NewsPage.tsx
│   │   │   ├── ArticlePage.tsx
│   │   │   └── CartPage.tsx
│   │   └── admin/
│   │       ├── AdminProductsPage.tsx
│   │       ├── AdminNewsPage.tsx
│   │       ├── AdminOrdersPage.tsx
│   │       ├── AdminPagesPage.tsx
│   │       └── CMSBuilderPage.tsx
│   ├── components/
│   │   ├── shop/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ImageUploader.tsx
│   │   │   └── CartWidget.tsx
│   │   ├── news/
│   │   │   ├── ArticleCard.tsx
│   │   │   └── ArticleEditor.tsx
│   │   └── cms/
│   │       ├── ContentBlockEditor.tsx
│   │       ├── DragDropBuilder.tsx
│   │       └── MediaLibrary.tsx
│   └── services/
│       └── api.ts (utvid)
```

## 🔧 Feature Flags

Legg til i `TenantFeatures`:

```prisma
model TenantFeatures {
  // ... existing

  shop              Boolean @default(false)
  news              Boolean @default(false)
  customHomepage    Boolean @default(false)
  productReviews    Boolean @default(false)
}
```

**Plan Mapping:**
- **STARTER**: shop ❌, news ❌, customHomepage ❌
- **BASIC**: shop ✅, news ✅, customHomepage ❌
- **PRO**: shop ✅, news ✅, customHomepage ✅
- **ENTERPRISE**: shop ✅, news ✅, customHomepage ✅, productReviews ✅

## 📋 Implementeringsfaser

### Fase 1: Shop Grunnlag ✅ (Start her)
1. Database migration med Product, ProductImage, ProductCategory
2. Backend API for produkter (CRUD)
3. Admin side for produktadministrasjon
4. Bildeopplasting
5. Public shop-side

### Fase 2: Handlekurv & Bestilling
1. Cart API
2. Order API
3. Checkout-flyt
4. Stripe-integrasjon
5. Ordre-administrasjon

### Fase 3: Nyheter/Blog
1. Database migration med Article, ArticleCategory
2. Backend API for artikler (CRUD)
3. Admin side for nyhetsadministrasjon
4. Rich text editor
5. Public news-side

### Fase 4: CMS Homepage Builder
1. Database migration med Page, ContentBlock, Media
2. Backend API for sider (CRUD)
3. Mediebibliotek
4. Drag-and-drop builder
5. Public homepage renderer

## 🎨 Produkttyper

### 1. PHYSICAL_PRODUCT (Fysiske varer)
- Proteinpulver
- Treningsklær
- Utstyr
- Tilbehør

**Felter:**
- SKU (lagernummer)
- Stock (lagerbeholdning)
- Vekt/dimensjoner for frakt

### 2. PT_SERVICE (PT-tjenester)
- 5-timers pakke
- 10-timers pakke
- Månedsabonnement PT

**Felter:**
- sessionCount (antall timer)
- validityDays (gyldighetstid)

### 3. MEMBERSHIP (Medlemskap)
- Månedskort
- Årskort
- Student-medlemskap

**Felter:**
- validityDays (varighet)
- Gjentakende betaling (Stripe subscription)

### 4. DIGITAL (Digitale produkter)
- Treningsplaner (PDF)
- Matplaner
- Online-kurs

**Felter:**
- Downloadable file URL
- Ingen lagerstyring

## 🖼️ Bildehåndtering

### Upload Workflow
1. Admin velger bilde(r) fra disk
2. Frontend sender til `/api/shop/products/:id/images`
3. Backend lagrer til:
   - Lokal: `/uploads/products/`
   - Cloud: AWS S3 / Cloudinary (produksjon)
4. Database lagrer URL i `ProductImage`

### Multiple Images
- Første bilde merkes `isPrimary: true`
- Drag-and-drop for å endre rekkefølge (`sortOrder`)
- Lightbox/gallery på produktside

## 📝 Content Blocks (CMS)

### Block Typer

```typescript
enum ContentBlockType {
  HERO          // Hero section med bakgrunnsbilde
  TEXT          // Rich text content
  IMAGE         // Enkelt bilde
  GALLERY       // Bildegalleri
  VIDEO         // YouTube/Vimeo embed
  CTA           // Call-to-action knapp
  TESTIMONIALS  // Kundevurderinger
  FEATURES      // Feature grid (3-4 kolonner)
  PRICING       // Pristabell
  FAQ           // Ofte stilte spørsmål
  CUSTOM_HTML   // Custom HTML/CSS
}
```

### Block Structure (JSON)

```json
{
  "type": "HERO",
  "content": {
    "title": "Velkommen til ObliKey Fitness",
    "subtitle": "Din vei til bedre helse",
    "backgroundImage": "https://...",
    "ctaText": "Bli Medlem Nå",
    "ctaLink": "/shop/membership"
  },
  "styling": {
    "background": "#000000",
    "textColor": "#FFFFFF",
    "padding": "80px 20px"
  }
}
```

## 🔐 Sikkerhet & Validering

### Bildeopplasting
- Max størrelse: 5MB
- Tillatte typer: JPG, PNG, WebP
- Automatisk resize/komprimering
- Virus-scanning (produksjon)

### Produkt-validering
- Navn: 3-200 tegn
- Pris: > 0
- Stock: >= 0 (hvis trackInventory)
- Slug: auto-generert fra navn, unik per tenant

### Bestilling-sikkerhet
- Valider stock før checkout
- Bekreft priser (ikke stol på frontend)
- Stripe webhook for betalingsbekreftelse
- Send ordre-bekreftelse på e-post

## 🚀 Neste Steg

Jeg kommer til å implementere:
1. ✅ Database schema (ferdig)
2. ⏳ Backend Product API (neste)
3. ⏳ Admin Products Page
4. ⏳ Public Shop Page
5. ... (fortsetter etter testing)

Dette er en **stor implementering**, så jeg leverer fungerende deler gradvis!
