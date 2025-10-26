# ObliKey Testing Documentation

## Overview

ObliKey has comprehensive testing coverage for both backend and frontend, ensuring reliability and quality across all modules.

## Testing Stack

### Backend
- **Jest** - Testing framework
- **ts-jest** - TypeScript support
- **Supertest** - API endpoint testing
- **Prisma Mock** - Database mocking

### Frontend
- **Vitest** - Fast Vite-native test framework
- **React Testing Library** - Component testing
- **MSW** - API mocking

## Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- modules.config.test.ts
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (interactive)
npm run test:ui
```

## Test Structure

### Backend Test Organization
```
backend/src/
├── __tests__/
│   ├── modules.config.test.ts
│   ├── auth.test.ts
│   ├── products.test.ts
│   └── orders.test.ts
├── controllers/
│   └── __tests__/
│       ├── user.controller.test.ts
│       └── product.controller.test.ts
└── middleware/
    └── __tests__/
        ├── auth.test.ts
        └── security.test.ts
```

### Frontend Test Organization
```
frontend/src/
├── __tests__/
│   ├── App.test.tsx
│   └── modules.config.test.ts
├── components/
│   └── __tests__/
│       ├── Layout.test.tsx
│       └── ProductCard.test.tsx
└── pages/
    └── __tests__/
        ├── ShopPage.test.tsx
        └── CheckoutPage.test.tsx
```

## Test Cases

### Module Configuration Tests

Tests the core module system functionality:

✅ **Module Definitions**
- Verifies all required modules are defined
- Checks default enabled states
- Validates dependencies

✅ **Role-Based Access**
- Tests module visibility for CUSTOMER role
- Tests module visibility for ADMIN role
- Tests module visibility for TRAINER role

✅ **Module Visibility Logic**
- Tests hiding modules when not enabled
- Tests hiding modules without required role
- Tests dependency checking
- Tests successful module display

✅ **Module Configuration**
- Tests default core modules
- Tests conditional module enabling
- Tests full configuration scenarios

### API Endpoint Tests (Example)

```typescript
describe('Product API', () => {
  it('GET /api/products - should return all published products', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('POST /api/products - should create product (admin only)', async () => {
    const product = {
      name: 'Test Product',
      price: 299,
      type: 'PHYSICAL_PRODUCT',
    };

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(product)
      .expect(201);

    expect(response.body.data.name).toBe('Test Product');
  });
});
```

### Component Tests (Example)

```typescript
describe('ProductCard', () => {
  it('should render product information', () => {
    const product = {
      id: '1',
      name: 'Test Product',
      price: 299,
      images: [{ url: '/test.jpg', isPrimary: true }],
    };

    render(<ProductCard product={product} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('299')).toBeInTheDocument();
  });

  it('should handle image click', () => {
    const onClick = jest.fn();
    render(<ProductCard product={product} onClick={onClick} />);

    fireEvent.click(screen.getByRole('img'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Test Coverage Goals

- **Overall**: > 80%
- **Critical Paths**: > 95%
  - Authentication
  - Payment processing
  - Module configuration
  - User management

- **Business Logic**: > 90%
  - Order creation
  - Booking system
  - PT credit management

## Continuous Integration

Tests run automatically on:
- Every pull request
- Before deployment
- Scheduled daily runs

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install Backend Dependencies
        run: cd backend && npm install

      - name: Run Backend Tests
        run: cd backend && npm test

      - name: Install Frontend Dependencies
        run: cd frontend && npm install

      - name: Run Frontend Tests
        run: cd frontend && npm test
```

## Mocking Strategies

### Database Mocking
```typescript
// Use Prisma mock for unit tests
import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';

const prismaMock = mockDeep<PrismaClient>();
```

### API Mocking (Frontend)
```typescript
// Use MSW for API calls
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/products', (req, res, ctx) => {
    return res(ctx.json({ success: true, data: [] }));
  })
);
```

## Best Practices

1. **Naming Convention**
   - Test files: `*.test.ts` or `*.test.tsx`
   - Describe blocks: Describe the unit being tested
   - Test cases: Start with "should"

2. **AAA Pattern**
   - Arrange: Set up test data
   - Act: Execute the function
   - Assert: Verify the result

3. **Test Isolation**
   - Each test should be independent
   - Clean up after each test
   - Don't rely on test execution order

4. **Coverage**
   - Aim for high coverage but focus on quality
   - Test edge cases and error handling
   - Don't test implementation details

5. **Performance**
   - Keep tests fast (< 100ms per test)
   - Use mocks for external dependencies
   - Parallelize test execution

## Adding New Tests

### Backend Test Template

```typescript
import { describe, it, expect } from '@jest/globals';

describe('YourModule', () => {
  describe('yourFunction', () => {
    it('should handle valid input', () => {
      // Arrange
      const input = 'valid';

      // Act
      const result = yourFunction(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle invalid input', () => {
      const input = 'invalid';

      expect(() => yourFunction(input)).toThrow();
    });
  });
});
```

### Frontend Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import YourComponent from './YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    const onClick = vi.fn();
    render(<YourComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Debugging Tests

### Running Single Test
```bash
# Backend
npm test -- -t "should handle valid input"

# Frontend
npm test -- -t "YourComponent"
```

### Debug Mode
```bash
# Backend
node --inspect-brk node_modules/.bin/jest

# Frontend
npm test -- --inspect-brk
```

### Verbose Output
```bash
npm test -- --verbose
```

## Performance Testing

For performance-critical paths:

```typescript
it('should process large dataset efficiently', () => {
  const start = performance.now();

  processLargeDataset(data);

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // < 1 second
});
```

## Integration Testing

Run full integration tests:

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
npx prisma migrate deploy

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## Reporting Issues

If tests fail:
1. Check the error message and stack trace
2. Verify environment variables
3. Ensure database is accessible
4. Check for flaky tests (re-run to confirm)
5. Report persistent failures with details
