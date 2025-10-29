# ObliKey Multi-Tenant Security Audit Report
**Date:** 2025-10-29
**Auditor:** Claude Code
**Scope:** Tenant Data Isolation Verification

## Executive Summary

A comprehensive security audit was conducted on the ObliKey multi-tenant SaaS application to verify that products, PT sessions, classes, and all other resources are properly isolated per tenant. The audit examined 10 controllers and associated services.

### Key Findings:
- ✅ **7 controllers properly isolated** with robust tenant filtering
- ⚠️ **3 controllers have critical security vulnerabilities** allowing cross-tenant data access
- 🔴 **HIGH PRIORITY**: Fix cart.controller.ts, user.controller.ts, and tenant.controller.ts immediately

---

## Detailed Findings

### ✅ SECURE CONTROLLERS (Properly Isolated)

#### 1. product.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 10, 36-43, 51-53, 94, 100+
- Extracts tenantId from req.tenantId
- All queries filter by tenantId
- Creates products WITH tenantId
- Uses composite unique constraints (tenantId_slug)

#### 2. class.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 11, 19-25, 36, 77, 86
- Properly filters all class queries by tenantId
- Verifies trainers belong to same tenant
- Role-based filtering (customers see published only, admins see all)

#### 3. pt.controller.ts (PT Sessions)
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 14, 50
- Creates PT sessions WITH tenantId
- Role-based logic for trainer/customer assignment

#### 4. booking.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 11, 17, 141
- Uses transitive isolation (verifies class belongs to tenant first)
- All subsequent operations implicitly tenant-scoped

#### 5. order.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 10, 32, 76, 83, 140, 206, 247, 287, 327, 377, 564
- Consistently filters all operations by tenantId
- Role-based access: customers/trainers see own orders, admins see all within tenant
- Properly isolates related entities (PT credits, accounting transactions)

#### 6. membership.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Lines 13, 35, 56, 88, 92, 122, 125, 166, 174, 221, 230, 272, 280, 289, 317, 340+
- Excellent tenant isolation throughout
- All membership plans, memberships, payments filtered by tenantId
- Role-based access control implemented

#### 7. door.service.ts & access.controller.ts
**Status:** ✅ SECURE
**Tenant Filtering:** Service lines 37, 74, 154, 206, 224, 266, 311, 356, 388, 397
- **Best practice pattern**: Verifies door ownership BEFORE every operation
- All access logs created WITH tenantId
- Controller properly passes tenantId to all service methods
- Excellent role-based security: CUSTOMER/TRAINER can only view own logs

---

## 🔴 CRITICAL SECURITY VULNERABILITIES

### 1. cart.controller.ts
**Status:** 🔴 CRITICAL VULNERABILITY
**Severity:** HIGH
**Impact:** Cross-tenant product access

#### Issues Found:

**Issue #1: Product verification without tenant filter (Line 100-102)**
```typescript
// VULNERABLE CODE
const product = await prisma.product.findUnique({
  where: { id: productId }  // ❌ NO TENANT FILTER!
});
```
**Risk:** User from Tenant A can add products from Tenant B to their cart

**Issue #2: Fetching cart products without tenant filter (Lines 39-41)**
```typescript
// VULNERABLE CODE
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },  // ❌ NO TENANT FILTER!
  include: { images: true }
});
```
**Risk:** Cart could display products from other tenants if cart was previously corrupted

**Issue #3: Update item stock check without tenant filter (Lines 202-204)**
```typescript
// VULNERABLE CODE
const product = await prisma.product.findUnique({
  where: { id: item.productId }  // ❌ NO TENANT FILTER!
});
```

#### Recommended Fix:
```typescript
// SECURE CODE
// In addItem (line 100-102)
const product = await prisma.product.findFirst({
  where: {
    id: productId,
    tenantId  // ✅ Add tenant filter
  }
});

// In getCart (lines 39-41)
const products = await prisma.product.findMany({
  where: {
    id: { in: productIds },
    tenantId  // ✅ Add tenant filter
  },
  include: { images: true }
});

// In updateItem (lines 202-204)
const product = await prisma.product.findFirst({
  where: {
    id: item.productId,
    tenantId: req.tenantId!  // ✅ Add tenant filter
  }
});
```

---

### 2. user.controller.ts
**Status:** 🔴 CRITICAL VULNERABILITY
**Severity:** HIGH
**Impact:** Cross-tenant user manipulation

#### Issues Found:

All user update operations lack tenant verification:

**Vulnerable Methods:**
1. `updateUser` (line 145) - Updates user by ID only
2. `updateUsername` (lines 201, 246) - Gets and updates without tenant filter
3. `deactivateUser` (line 292) - No tenant verification
4. `activateUser` (line 308) - No tenant verification
5. `updateUserRole` (line 372) - No tenant verification
6. `updateAvatar` (line 415) - No tenant verification
7. `removeAvatar` (line 461) - No tenant verification

**Example Vulnerable Code (updateUser at line 145):**
```typescript
// VULNERABLE CODE
const user = await prisma.user.update({
  where: { id },  // ❌ NO TENANT FILTER!
  data: {
    firstName,
    lastName,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    avatar
  }
});
```

**Risk:** Admin from Tenant A can modify users from Tenant B if they know the user ID

**Good Example (deleteUser - line 326-328):**
```typescript
// SECURE CODE ✅
const user = await prisma.user.findFirst({
  where: { id, tenantId }  // Verifies tenant BEFORE delete
});

if (!user) {
  throw new AppError('Bruker ikke funnet', 404);
}

await prisma.user.delete({ where: { id } });
```

#### Recommended Fix:
Add tenant verification before ALL update operations. Pattern:
```typescript
// SECURE CODE
async updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const tenantId = req.tenantId!;
  const { firstName, lastName, phone, dateOfBirth, avatar } = req.body;

  // ✅ Verify user belongs to tenant FIRST
  const existingUser = await prisma.user.findFirst({
    where: { id, tenantId }
  });

  if (!existingUser) {
    throw new AppError('Bruker ikke funnet', 404);
  }

  // Now safe to update
  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, phone, dateOfBirth, avatar }
  });

  // ... rest of code
}
```

---

### 3. tenant.controller.ts
**Status:** ⚠️ SECURITY ISSUE
**Severity:** MEDIUM
**Impact:** Cross-tenant settings manipulation

#### Issue Found:

**updateSettings method (lines 183-184):**
```typescript
// VULNERABLE CODE
async updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;  // Tenant ID from URL
  const settings = req.body;

  const updatedSettings = await prisma.tenantSettings.update({
    where: { tenantId: id },  // ❌ No verification that req.user.tenantId === id
    data: settings
  });

  // ...
}
```

**Risk:** Admin from Tenant A can update settings for Tenant B if they know the tenant ID

#### Recommended Fix:
```typescript
// SECURE CODE
async updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const settings = req.body;
  const userTenantId = req.user!.tenantId;
  const userRole = req.user!.role;

  // ✅ Verify user can update this tenant's settings
  if (userRole !== 'SUPER_ADMIN' && userTenantId !== id) {
    throw new AppError('Ingen tilgang', 403);
  }

  const updatedSettings = await prisma.tenantSettings.update({
    where: { tenantId: id },
    data: settings
  });

  // ...
}
```

---

## Security Best Practices Observed

### ✅ Excellent Patterns Found:

1. **Verify-Then-Execute Pattern** (door.service.ts)
   ```typescript
   // First verify ownership
   const existingDoor = await prisma.door.findFirst({
     where: { id: doorId, tenantId }
   });

   if (!existingDoor) {
     throw new Error('Door not found');
   }

   // Then perform operation
   await prisma.door.update({ where: { id: doorId }, data: {...} });
   ```

2. **Role-Based Filtering** (access.controller.ts lines 193-197)
   ```typescript
   // CUSTOMER and TRAINER can only see their own logs
   let effectiveUserId = userId as string;
   if (currentUserRole === 'CUSTOMER' || currentUserRole === 'TRAINER') {
     effectiveUserId = currentUserId; // Force to own logs
   }
   ```

3. **Composite Unique Constraints** (schema.prisma)
   ```typescript
   @@unique([tenantId, email])
   @@unique([tenantId, slug])
   ```

---

## Database Schema Verification

✅ **All models have tenantId field**
✅ **All models have tenant relation with onDelete: Cascade**
✅ **Composite unique constraints ensure per-tenant uniqueness**

**Example from schema.prisma:**
```typescript
model Product {
  id       String @id @default(uuid())
  tenantId String  // ✅ Present
  // ... other fields
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([tenantId, slug])  // ✅ Per-tenant uniqueness
}
```

---

## Recommendations

### Immediate Actions (HIGH PRIORITY)

1. **Fix cart.controller.ts** (Est. 15 minutes)
   - Add tenantId filter to product queries at lines 100, 39-41, 202-204
   - Test: Attempt to add product from different tenant

2. **Fix user.controller.ts** (Est. 30 minutes)
   - Add tenant verification to all 7 update methods
   - Follow the deleteUser pattern (lines 326-328)
   - Test: Attempt to update user from different tenant

3. **Fix tenant.controller.ts** (Est. 10 minutes)
   - Add tenant ownership check to updateSettings
   - Allow SUPER_ADMIN to update any tenant
   - Test: Attempt to update settings for different tenant

### Testing Checklist

Create integration tests for:
- [ ] Product isolation (user from Tenant A cannot access products from Tenant B)
- [ ] Cart isolation (cannot add products from other tenants)
- [ ] User management isolation (cannot modify users from other tenants)
- [ ] PT session isolation
- [ ] Class isolation
- [ ] Booking isolation
- [ ] Order isolation
- [ ] Membership isolation
- [ ] Door access isolation
- [ ] Settings isolation

### Code Review Process

Before deploying any controller:
1. ✅ Extract `tenantId` from `req.tenantId!`
2. ✅ Include `tenantId` in WHERE clause for ALL queries
3. ✅ Include `tenantId` in data when creating new records
4. ✅ Verify related entities belong to same tenant
5. ✅ Test with users from different tenants

---

## Conclusion

The audit identified **3 critical vulnerabilities** that must be fixed immediately to prevent cross-tenant data access. The majority of controllers (7 out of 10) demonstrate proper tenant isolation patterns.

### Summary Statistics:
- **Total Controllers Audited:** 10
- **Secure Controllers:** 7 (70%)
- **Vulnerable Controllers:** 3 (30%)
- **Critical Issues:** 3
- **Estimated Fix Time:** ~1 hour

### User's Original Question:
> "Er varene å butikkene per tenant kun unik til den tenant? Det må vi sørge for at varene/produktene, pt-økter, klassene er kun tilgjengelig per tenant nivå"

**Answer:**
- ✅ Products are properly isolated per tenant (product.controller.ts)
- ✅ PT sessions are properly isolated per tenant (pt.controller.ts)
- ✅ Classes are properly isolated per tenant (class.controller.ts)
- ⚠️ **BUT**: Cart operations allow cross-tenant product access (MUST FIX)

Once the 3 vulnerabilities are fixed, all resources will be properly isolated per tenant with no data leakage.

---

## Next Steps

1. Fix the 3 vulnerable controllers (cart, user, tenant)
2. Run comprehensive integration tests
3. Consider implementing automated tenant isolation tests
4. Add middleware to automatically verify tenant ownership
5. Audit remaining controllers not covered in this report
