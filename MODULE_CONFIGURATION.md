# ObliKey Module Configuration System

## Overview

ObliKey uses a powerful module-based architecture that allows you to configure which features are available for each tenant. This enables you to deliver custom solutions to different customers based on their needs.

## Available Modules

### Core Modules (Always Enabled)
- **Dashboard** - Main overview and statistics
- **Admin** - System administration and user management

### Business Modules
- **Classes** - Group training and class scheduling
- **PT Sessions** - Personal training and 1-on-1 sessions
- **Training Programs** - Customized workout programs
- **Bookings** - Customer booking management
- **Shop** - E-commerce and product sales

### Optional Modules
- **Chat** - Internal messaging system
- **Accounting** - Financial management and invoicing
- **Landing Page** - CMS for landing page customization

## Configuration

### Tenant-Level Configuration

Modules are configured per tenant in the `tenant_settings` table:

```typescript
{
  classesEnabled: boolean,      // Enable/disable Classes module
  chatEnabled: boolean,          // Enable/disable Chat module
  accountingEnabled: boolean,    // Enable/disable Accounting module
  landingPageEnabled: boolean    // Enable/disable Landing Page CMS
}
```

### Database Configuration

Update tenant settings via SQL:

```sql
-- Enable all optional modules
UPDATE tenant_settings
SET
  "classesEnabled" = true,
  "chatEnabled" = true,
  "accountingEnabled" = true,
  "landingPageEnabled" = true
WHERE "tenantId" = 'your-tenant-id';

-- Minimal configuration (PT-only)
UPDATE tenant_settings
SET
  "classesEnabled" = false,
  "chatEnabled" = false,
  "accountingEnabled" = false,
  "landingPageEnabled" = false
WHERE "tenantId" = 'your-tenant-id';
```

### API Configuration

Use the Admin API to configure modules:

```typescript
// PUT /api/tenants/:id/settings
{
  "classesEnabled": true,
  "chatEnabled": false,
  "accountingEnabled": true,
  "landingPageEnabled": false
}
```

## Use Cases

### Scenario 1: PT-Only Studio
**Requirements:** Only PT sessions and bookings

```typescript
{
  classesEnabled: false,
  chatEnabled: false,
  accountingEnabled: false,
  landingPageEnabled: false
}
```

**Available features:**
- Dashboard
- PT Sessions
- Training Programs
- Shop (for PT packages)
- Admin

### Scenario 2: Full Gym with Classes
**Requirements:** Complete gym solution

```typescript
{
  classesEnabled: true,
  chatEnabled: true,
  accountingEnabled: true,
  landingPageEnabled: true
}
```

**Available features:**
- All modules enabled

### Scenario 3: Boutique Studio
**Requirements:** Classes and basic PT

```typescript
{
  classesEnabled: true,
  chatEnabled: true,
  accountingEnabled: false,
  landingPageEnabled: true
}
```

**Available features:**
- Dashboard
- Classes
- Bookings
- PT Sessions
- Training Programs
- Chat
- Shop
- Landing Page
- Admin

## Module Dependencies

Some modules depend on others:

- **Bookings** requires **Classes**
- **Training Programs** works best with **PT Sessions**

The system automatically handles dependencies and will:
1. Hide dependent modules if parent is disabled
2. Show warnings when enabling a module without its dependencies

## Adding New Modules

To add a new module:

1. **Update Backend Configuration**
```typescript
// backend/src/config/modules.config.ts
export enum ModuleKey {
  // ... existing modules
  NEW_MODULE = 'newModule',
}

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  // ... existing modules
  [ModuleKey.NEW_MODULE]: {
    key: ModuleKey.NEW_MODULE,
    name: 'New Module',
    description: 'Description of new module',
    icon: 'IconName',
    category: 'business',
    requiredRoles: ['ADMIN', 'CUSTOMER'],
    defaultEnabled: false,
    routes: ['/new-module'],
    apiEndpoints: ['/api/new-module/*'],
  },
};
```

2. **Update Frontend Configuration**
```typescript
// frontend/src/config/modules.config.ts
export const MODULES: Record<ModuleKey, ModuleConfig> = {
  // ... existing modules
  [ModuleKey.NEW_MODULE]: {
    key: ModuleKey.NEW_MODULE,
    name: 'New Module',
    path: '/new-module',
    icon: 'IconName',
    category: 'business',
    roles: ['ADMIN', 'CUSTOMER'],
  },
};
```

3. **Add to Database Schema** (if needed)
```prisma
model TenantSettings {
  // ... existing fields
  newModuleEnabled Boolean @default(false)
}
```

4. **Run Migration**
```bash
npx prisma migrate dev --name add_new_module
```

## Mobile App Support

The application is fully optimized for mobile devices and can be installed as a Progressive Web App (PWA):

### iOS Installation
1. Open Safari
2. Navigate to the app URL
3. Tap Share button
4. Select "Add to Home Screen"

### Android Installation
1. Open Chrome
2. Navigate to the app URL
3. Tap menu (3 dots)
4. Select "Add to Home Screen"

### PWA Features
- Offline support
- Push notifications (when enabled)
- Native-like app experience
- Fast loading with service worker caching
- Responsive design for all screen sizes

## Testing

### Running Tests

Backend tests:
```bash
cd backend
npm test
```

Frontend tests:
```bash
cd frontend
npm test
```

### Test Coverage

Run coverage reports:
```bash
npm run test:coverage
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oblikey"

# JWT
JWT_SECRET="your-secret-key"

# Email (optional)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER="noreply@example.com"
EMAIL_PASSWORD="password"

# Vipps (optional)
VIPPS_CLIENT_ID="your-client-id"
VIPPS_CLIENT_SECRET="your-client-secret"
VIPPS_MERCHANT_SERIAL_NUMBER="123456"
VIPPS_SUBSCRIPTION_KEY="your-subscription-key"

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## Security Best Practices

1. **Role-Based Access Control**
   - Modules respect user roles
   - API endpoints validate permissions
   - Frontend hides unauthorized modules

2. **Tenant Isolation**
   - All data is tenant-scoped
   - Users can only access their tenant's data
   - Module settings are per-tenant

3. **API Security**
   - All endpoints require authentication
   - JWT tokens expire after 7 days
   - Rate limiting on sensitive endpoints

## Performance Optimization

1. **Lazy Loading**
   - Modules load only when accessed
   - Route-based code splitting
   - Optimized bundle size

2. **Caching**
   - Service worker caches static assets
   - API responses cached when appropriate
   - Redis caching for frequently accessed data

3. **Database Optimization**
   - Proper indexes on all foreign keys
   - Query optimization with Prisma
   - Connection pooling

## Support

For issues or questions:
- GitHub: [github.com/your-repo/oblikey](https://github.com/your-repo/oblikey)
- Email: support@oblikey.no
- Documentation: [docs.oblikey.no](https://docs.oblikey.no)
