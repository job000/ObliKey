# ObliKey - Routing Integration Guide

## Adding New Pages to Routes

### 1. Shop Page (Public - All Users)

Add to your main router (e.g., `frontend/src/App.tsx` or `frontend/src/routes.tsx`):

```typescript
import { ShopPage } from './pages/ShopPage';

// In your Routes component:
<Route path="/shop" element={<ShopPage />} />
```

### 2. Admin Products Page (Admin Only)

Add to your admin routes:

```typescript
import { ProductsPage } from './pages/admin/ProductsPage';

// In your Admin Routes:
<Route
  path="/admin/products"
  element={
    <ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}>
      <ProductsPage />
    </ProtectedRoute>
  }
/>
```

---

## Navigation Menu Updates

### Main Navigation (Add Shop Link)

```typescript
// In your main navigation component
const navItems = [
  { name: 'Hjem', path: '/' },
  { name: 'Klasser', path: '/classes' },
  { name: 'Bookinger', path: '/bookings' },
  { name: 'Butikk', path: '/shop' }, // NEW
  // ... other items
];
```

### Admin Navigation (Add Products Link)

```typescript
// In your admin navigation component
const adminNavItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Brukere', path: '/admin/users', icon: Users },
  { name: 'Klasser', path: '/admin/classes', icon: Calendar },
  { name: 'Produkter', path: '/admin/products', icon: ShoppingBag }, // NEW
  // ... other items
];
```

---

## Example Full Routing Setup

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Existing pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ClassesPage } from './pages/ClassesPage';
import { BookingsPage } from './pages/BookingsPage';
import { AdminPage } from './pages/AdminPage';

// NEW pages
import { ShopPage } from './pages/ShopPage';
import { ProductsPage } from './pages/admin/ProductsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Icons to Import

If you're using lucide-react for icons:

```typescript
import {
  ShoppingBag,    // For Shop/Products navigation
  Package,        // For physical products
  Calendar,       // For PT services
  Star,           // For featured/membership
  Image,          // For digital products
} from 'lucide-react';
```

---

## Testing the Integration

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Endpoints
- Admin Products: http://localhost:5173/admin/products
- Public Shop: http://localhost:5173/shop
- API Products: http://localhost:3000/api/products
- API Upload: http://localhost:3000/api/upload/single

### 4. Test Flows

**Admin Flow**:
1. Login as ADMIN
2. Navigate to /admin/products
3. Click "Nytt produkt"
4. Fill in product details
5. Save product (creates as DRAFT)
6. Upload images
7. Click "Publiser" to publish

**Customer Flow**:
1. Login as CUSTOMER
2. Navigate to /shop
3. See published products
4. Click on a product to see details
5. View image carousel
6. See price and stock info

---

## Environment Variables

Make sure you have these in your `.env` files:

**Backend** (`.env`):
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/oblikey
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Quick Start Commands

```bash
# Backend
cd backend
npm install multer @types/multer
npx prisma migrate dev
npx prisma generate
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

### Images not loading?
- Check that uploads directory exists: `backend/uploads/products/`
- Check static file serving is enabled in `backend/src/index.ts`
- Check file permissions on uploads directory

### Products not showing?
- Check that products are PUBLISHED (not DRAFT)
- Check authentication token is valid
- Check CORS settings in backend

### Upload fails?
- Check file size (<5MB)
- Check file type (images only)
- Check user has ADMIN role
- Check multer is installed

---

## Next Steps

After integrating the routes, you can:

1. **Add navigation links** to the shop in your header/sidebar
2. **Test the admin products page** - create a product, upload images
3. **Test the public shop** - view products, see details
4. **Customize styling** to match your brand
5. **Add more features** like cart, checkout, etc.

---

## API Endpoints Reference

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (ADMIN)
- `PATCH /api/products/:id` - Update product (ADMIN)
- `DELETE /api/products/:id` - Archive product (ADMIN)
- `POST /api/products/:id/publish` - Publish product (ADMIN)

### Images
- `POST /api/products/:id/images` - Add image (ADMIN)
- `PATCH /api/products/images/:id` - Update image (ADMIN)
- `DELETE /api/products/images/:id` - Delete image (ADMIN)

### Upload
- `POST /api/upload/single` - Upload single image (ADMIN)
- `POST /api/upload/multiple` - Upload multiple images (ADMIN)

### Feedback
- `POST /api/feedback` - Create feedback
- `GET /api/feedback/my-feedback` - My feedback
- `GET /api/feedback` - All feedback (ADMIN)
- `PATCH /api/feedback/:id/respond` - Respond (ADMIN)
- `GET /api/feedback/class/:id/reviews` - Class reviews
- `GET /api/feedback/trainer/:id/reviews` - Trainer reviews
