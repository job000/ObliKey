# ObliKey Testing Guide

Comprehensive testing guide for developers working on the ObliKey platform.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

ObliKey uses **Jest** and **Supertest** for backend testing. Our test suite includes:

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test API endpoints and database interactions
- **Security Tests**: Test authentication, authorization, and input validation

### Test Philosophy

- **Comprehensive Coverage**: Aim for >70% code coverage
- **Real-World Scenarios**: Test actual user workflows
- **Security First**: Every endpoint must have security tests
- **Fast Execution**: Tests should run quickly for rapid feedback
- **Isolated Tests**: Each test should be independent and idempotent

---

## Test Structure

```
backend/
├── tests/
│   ├── unit/              # Unit tests
│   │   └── auth.test.ts
│   ├── integration/       # Integration tests
│   │   ├── booking.test.ts
│   │   ├── classes.test.ts
│   │   ├── chat.test.ts
│   │   └── pt.test.ts
│   └── setup.ts          # Test setup/teardown (optional)
```

### Test File Naming

- Unit tests: `[module].test.ts`
- Integration tests: `[feature].test.ts`
- Place tests in appropriate directories

---

## Running Tests

### All Tests

```bash
cd backend
npm test
```

### With Coverage Report

```bash
npm test -- --coverage
```

### Watch Mode (Auto-rerun on changes)

```bash
npm run test:watch
```

### Run Specific Test Suite

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Specific file
npm test -- auth.test.ts

# Specific test
npm test -- -t "should register a new user"
```

### Verbose Output

```bash
npm test -- --verbose
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('Feature Name', () => {
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Setup: Create test data
    tenantId = 'test-tenant-' + Date.now();

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId
      });

    authToken = response.body.data.token;
  });

  describe('Endpoint Group', () => {
    test('should do something successfully', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should fail with invalid input', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Authentication Tests

```typescript
describe('POST /api/auth/register', () => {
  test('should register a new user successfully', async () => {
    const userData = {
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      tenantId: 'test-tenant'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.token).toBeDefined();
  });

  test('should fail with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 'test-tenant'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
```

### Security Tests

Every endpoint should have security tests:

```typescript
describe('Security Tests', () => {
  test('should sanitize XSS attempts', async () => {
    const xssData = {
      name: '<script>alert("XSS")</script>',
      // other fields...
    };

    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send(xssData);

    if (response.status === 201) {
      expect(response.body.data.name).not.toContain('<script>');
    }
  });

  test('should prevent SQL injection', async () => {
    const sqlInjection = {
      email: "admin'--",
      password: 'Test123!'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(sqlInjection);

    expect(response.body.success).toBe(false);
  });

  test('should require authentication', async () => {
    await request(app)
      .get('/api/protected-endpoint')
      .expect(401);
  });

  test('should reject invalid tokens', async () => {
    await request(app)
      .get('/api/protected-endpoint')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
test('should complete full booking lifecycle', async () => {
  // 1. Book a class
  const bookingResponse = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ classId })
    .expect(201);

  const bookingId = bookingResponse.body.data.id;

  // 2. Get my bookings
  const myBookings = await request(app)
    .get('/api/bookings/my-bookings')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  expect(myBookings.body.data).toHaveLength(1);

  // 3. Cancel the booking
  await request(app)
    .patch(`/api/bookings/${bookingId}/cancel`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ reason: 'Changed plans' })
    .expect(200);

  // 4. Verify cancellation
  const updatedBookings = await request(app)
    .get('/api/bookings/my-bookings')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  const cancelledBooking = updatedBookings.body.data.find(
    (b: any) => b.id === bookingId
  );
  expect(cancelledBooking.status).toBe('CANCELLED');
});
```

### Validation Tests

Test all validation rules:

```typescript
describe('Validation', () => {
  test('should fail with missing required fields', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Incomplete' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should fail with invalid data types', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Class',
        capacity: 'not-a-number', // Invalid
        duration: 60,
        startTime: new Date().toISOString()
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should fail with invalid business logic', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Past Class',
        capacity: 10,
        duration: 60,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      .expect(400);

    expect(response.body.error).toContain('past');
  });
});
```

---

## Test Coverage

### Viewing Coverage

```bash
npm test -- --coverage
```

Coverage report will be generated in `coverage/` directory.

### Coverage Thresholds

Current thresholds (defined in `package.json`):

```json
"coverageThreshold": {
  "global": {
    "branches": 70,
    "functions": 70,
    "lines": 70,
    "statements": 70
  }
}
```

### Coverage Requirements

- **Branches**: 70% - All conditional paths tested
- **Functions**: 70% - All functions called
- **Lines**: 70% - All code lines executed
- **Statements**: 70% - All statements executed

### Improving Coverage

1. Identify uncovered code:
   ```bash
   npm test -- --coverage --verbose
   ```

2. Open HTML report:
   ```bash
   open coverage/lcov-report/index.html
   ```

3. Write tests for uncovered areas:
   - Red lines = not covered
   - Yellow lines = partially covered
   - Green lines = fully covered

---

## Best Practices

### 1. Use Descriptive Test Names

✅ **Good**:
```typescript
test('should prevent booking when class is at full capacity', async () => {
  // ...
});
```

❌ **Bad**:
```typescript
test('booking test', async () => {
  // ...
});
```

### 2. Test One Thing Per Test

✅ **Good**:
```typescript
test('should create a new user', async () => {
  // Only tests user creation
});

test('should return created user data', async () => {
  // Only tests response data
});
```

❌ **Bad**:
```typescript
test('should create user and login and book class', async () => {
  // Tests too many things
});
```

### 3. Use Unique Test Data

Always use unique identifiers to avoid conflicts:

```typescript
const email = `test${Date.now()}@example.com`;
const tenantId = 'test-tenant-' + Date.now();
```

### 4. Clean Up After Tests

```typescript
afterAll(async () => {
  // Clean up test data if needed
  await prisma.user.deleteMany({ where: { tenantId } });
});
```

### 5. Test Error Cases

Don't just test happy paths:

```typescript
describe('Error Handling', () => {
  test('should handle database errors gracefully', async () => {
    // Test error scenarios
  });

  test('should validate input before processing', async () => {
    // Test validation errors
  });

  test('should handle missing resources', async () => {
    const response = await request(app)
      .get('/api/classes/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
```

### 6. Use Proper Assertions

```typescript
// Be specific
expect(response.body.data.id).toBeDefined();
expect(response.body.data.email).toBe(userData.email);
expect(response.body.data.items).toHaveLength(5);

// Not just truthy/falsy
expect(response.body.success).toBe(true); // Good
expect(response.body.success).toBeTruthy(); // Less specific
```

### 7. Test Authorization

```typescript
test('should not allow regular user to delete', async () => {
  const response = await request(app)
    .delete(`/api/classes/${classId}`)
    .set('Authorization', `Bearer ${regularUserToken}`)
    .expect(403);

  expect(response.body.success).toBe(false);
});
```

---

## Troubleshooting

### Tests Failing Randomly

**Problem**: Tests pass sometimes, fail other times

**Solutions**:
- Use unique test data (timestamps, UUIDs)
- Clean up data between tests
- Avoid shared state between tests
- Use `beforeEach` instead of `beforeAll` if needed

### Database Connection Issues

**Problem**: Cannot connect to test database

**Solutions**:
```bash
# Ensure .env.test exists
cp .env.example .env.test

# Update DATABASE_URL for testing
DATABASE_URL="postgresql://user:password@localhost:5432/oblikey_test"

# Run migrations
npx prisma migrate dev
```

### Timeout Errors

**Problem**: Tests timing out

**Solutions**:
```typescript
// Increase timeout for specific test
test('slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout

// Or in describe block
describe('Slow tests', () => {
  jest.setTimeout(10000);

  test('test 1', async () => {
    // ...
  });
});
```

### Authentication Token Issues

**Problem**: 401 errors in tests

**Solutions**:
```typescript
// Ensure token is properly set
beforeAll(async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send(userData);

  authToken = response.body.data.token;

  // Verify token was received
  expect(authToken).toBeDefined();
  expect(authToken).toBeTruthy();
});
```

### Rate Limiting in Tests

**Problem**: Tests fail due to rate limiting

**Solutions**:
- Set `NODE_ENV=test` to disable rate limiting in tests
- Or adjust rate limits for test environment:

```typescript
// middleware/security.ts
const rateLimitMiddleware = rateLimiterMiddleware({
  points: process.env.NODE_ENV === 'test' ? 1000 : 100,
  duration: 15 * 60
});
```

---

## Quick Reference

### Common Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Run specific file
npm test -- auth.test.ts

# Run specific test
npm test -- -t "should register"

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(10);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });
```

### HTTP Status Codes

```typescript
.expect(200)  // OK
.expect(201)  // Created
.expect(400)  // Bad Request
.expect(401)  // Unauthorized
.expect(403)  // Forbidden
.expect(404)  // Not Found
.expect(500)  // Internal Server Error
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

**Happy Testing! 🧪**

For questions or issues, please contact the development team or create an issue in the project repository.
