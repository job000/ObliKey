# Test Suite Documentation

## Overview

This directory contains all tests for the ObliKey mobile application. Tests are organized by type and follow industry best practices.

## Test Structure

```
__tests__/
├── components/          # Component unit tests
├── screens/            # Screen component tests
├── services/           # API service tests
├── utils/              # Utility function tests
├── integration/        # Integration and E2E tests
├── setup.ts           # Test setup and mocks
└── README.md          # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test -- AuthScreens.test
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## Test Categories

### Unit Tests
Test individual components and functions in isolation.

**Location:** `__tests__/components/`, `__tests__/utils/`

**Example:**
```typescript
test('should format currency correctly', () => {
  expect(formatCurrency(1000)).toBe('1 000 kr');
});
```

### Component Tests
Test React components with user interactions.

**Location:** `__tests__/screens/`, `__tests__/components/`

**Example:**
```typescript
test('should handle login form submission', async () => {
  const { getByText, getByPlaceholderText } = render(<LoginScreen />);

  fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
  fireEvent.press(getByText('Login'));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalled();
  });
});
```

### Integration Tests
Test complete user flows and feature interactions.

**Location:** `__tests__/integration/`

**Example:**
```typescript
test('should complete shopping flow', async () => {
  // 1. Login
  // 2. Add to cart
  // 3. Checkout
  // 4. Verify order
});
```

### API Tests
Test API service methods and responses.

**Location:** `__tests__/services/`

**Example:**
```typescript
test('should fetch products successfully', async () => {
  const products = await api.getProducts();
  expect(products).toBeDefined();
  expect(Array.isArray(products)).toBe(true);
});
```

## Writing Tests

### Test Naming Convention

Use descriptive names that explain what is being tested:

```typescript
// Good
test('should display error message when login fails', () => {});
test('should update cart total when quantity changes', () => {});

// Bad
test('login', () => {});
test('test1', () => {});
```

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
test('should add item to cart', () => {
  // Arrange - Set up test data
  const product = { id: '1', name: 'Test Product', price: 100 };

  // Act - Perform the action
  const result = addToCart(product, 2);

  // Assert - Verify the result
  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(200);
});
```

### Mocking

#### Mock API Calls
```typescript
jest.mock('../../src/services/api', () => ({
  api: {
    login: jest.fn().mockResolvedValue({ success: true }),
  },
}));
```

#### Mock Navigation
```typescript
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};
```

#### Mock Context
```typescript
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));
```

## Test Coverage Goals

- **Overall Coverage:** > 80%
- **Critical Paths:** 100% (authentication, payments, bookings)
- **UI Components:** > 70%
- **Utility Functions:** > 90%
- **API Services:** > 85%

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// Good - Tests user behavior
test('should show error when email is invalid', async () => {
  const { getByText } = render(<LoginForm />);
  fireEvent.press(getByText('Submit'));
  expect(await screen.findByText('Invalid email')).toBeTruthy();
});

// Bad - Tests implementation details
test('should call validateEmail function', () => {
  const spy = jest.spyOn(validator, 'validateEmail');
  // ...
  expect(spy).toHaveBeenCalled();
});
```

### 2. Keep Tests Simple and Focused

Each test should verify one thing:

```typescript
// Good
test('should display product name', () => {
  expect(getByText('Product Name')).toBeTruthy();
});

test('should display product price', () => {
  expect(getByText('$99.99')).toBeTruthy();
});

// Bad
test('should display product correctly', () => {
  expect(getByText('Product Name')).toBeTruthy();
  expect(getByText('$99.99')).toBeTruthy();
  expect(getByText('Add to Cart')).toBeTruthy();
  // Testing too many things
});
```

### 3. Use Data-Driven Tests for Variations

```typescript
test.each([
  ['test@email.com', true],
  ['invalid-email', false],
  ['', false],
])('should validate email %s as %s', (email, expected) => {
  expect(isValidEmail(email)).toBe(expected);
});
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});
```

### 5. Use Descriptive Test Data

```typescript
// Good
const validUser = {
  email: 'test@example.com',
  password: 'SecurePass123',
};

// Bad
const user = {
  email: 'a',
  password: 'b',
};
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should login successfully"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Update Snapshots
```bash
npm test -- -u
```

### Debug in VS Code
Add breakpoint and run in debug mode with Jest extension.

## Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Pre-commit hooks (optional)

## Common Issues

### Test Timeout
Increase timeout for slow operations:
```typescript
test('slow operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Async/Await Issues
Always use `waitFor` for async operations:
```typescript
await waitFor(() => {
  expect(getByText('Success')).toBeTruthy();
});
```

### Mock Not Working
Ensure mocks are declared before imports:
```typescript
jest.mock('./module');
import { Module } from './module'; // Must come after mock
```

## Resources

- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed
