# ObliKey Mobile App - Feature Documentation

## Overview

This mobile application is built with a modular architecture that allows features to be easily enabled, disabled, added, or removed based on business requirements.

## Feature Configuration

All features are configured in `src/config/features.ts`. This central configuration file controls:
- Which features are enabled/disabled
- Role-based access control
- Feature descriptions and labels

### How to Enable/Disable Features

1. Open `src/config/features.ts`
2. Find the feature you want to modify
3. Set `enabled: true` or `enabled: false`
4. The feature will automatically be hidden from navigation and disabled in the app

**Example:**
```typescript
accounting: {
  enabled: false, // Set to true to enable
  label: 'Accounting',
  description: 'Full accounting module',
  requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
}
```

## Implemented Features

### ✅ Core Features (Always Available)
- **Authentication** - Login, registration, password reset
- **Dashboard** - Main dashboard for all users
- **Profile** - User profile management

### ✅ Customer Features
- **Shop** - Product catalog with filtering and search
- **Cart** - Shopping cart with checkout
- **Classes** - Browse and book group classes
- **PT Sessions** - View and book personal training sessions
- **Purchase History** - Order history and tracking
- **Chat** - Messaging with trainers and support

### ✅ Admin Features
- **User Management** - Manage users, roles, and permissions
  - Create, edit, delete users
  - Change user roles
  - Activate/deactivate accounts
  - Search and filter users

- **Class Management** - Manage group classes
  - Create/edit/delete classes
  - Manage capacity and bookings
  - Cancel classes
  - View attendance statistics

- **PT Management** - Manage personal training
  - Schedule PT sessions
  - Update session status
  - Track completion rates
  - Client assignment

- **Product Management** - Manage shop products
  - Create/edit/delete products
  - Manage inventory
  - Set prices and categories
  - Upload product images

- **Order Management** - Process customer orders
  - View all orders
  - Update order status
  - Manage shipping and delivery
  - Track revenue

- **Analytics** - Business analytics and reporting
  - Revenue tracking
  - User growth metrics
  - Class and PT session statistics
  - Time-based filtering

- **Settings** - System configuration
  - Business information
  - Access control settings
  - System preferences
  - Currency and timezone

## 🚧 Features Not Yet Implemented

### High Priority (Web Features to Port)
- **Training Programs** - Personalized training program management
- **Activity Logs** - System activity and audit logs
- **Product Analytics** - Detailed product performance metrics
- **Reset Password Screen** - Direct password reset flow

### Medium Priority (Optional Modules)
- **Accounting Module** - Full accounting with invoices, transactions, reports
- **Inventory Management** - Advanced stock tracking
- **Push Notifications** - Mobile push notification system
- **Advanced Reports** - Customizable business reports

### Low Priority
- **Landing Page CMS** - Not applicable for mobile app
- **Third-party Integrations** - Payment gateways, accounting software, etc.

## How to Add a New Feature

### 1. Define the Feature

Add configuration to `src/config/features.ts`:
```typescript
myNewFeature: {
  enabled: true,
  label: 'My New Feature',
  description: 'Description of what this feature does',
  requiredRoles: ['ADMIN'], // Optional: restrict by role
}
```

### 2. Create the Screen

Create a new screen file in `src/screens/`:
```typescript
// src/screens/MyNewFeatureScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import Container from '../components/Container';

export default function MyNewFeatureScreen() {
  return (
    <Container>
      <Text>My New Feature</Text>
    </Container>
  );
}
```

### 3. Add Navigation Route

Update `src/navigation/AppNavigator.tsx`:
```typescript
import MyNewFeatureScreen from '../screens/MyNewFeatureScreen';

// In the Stack.Navigator
<Stack.Screen
  name="MyNewFeature"
  component={MyNewFeatureScreen}
/>
```

### 4. Add to Admin Menu (if applicable)

Update `src/screens/AdminScreen.tsx`:
```typescript
import { isFeatureEnabled } from '../config/features';

// Add menu item
{isFeatureEnabled('myNewFeature') && (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('MyNewFeature')}
  >
    <Ionicons name="icon-name" size={24} color="#3B82F6" />
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>My New Feature</Text>
      <Text style={styles.menuDescription}>Feature description</Text>
    </View>
  </TouchableOpacity>
)}
```

### 5. Add API Methods (if needed)

Update `src/services/api.ts`:
```typescript
async getMyFeatureData() {
  const response = await this.axiosInstance.get('/my-feature');
  return response.data;
}
```

### 6. Update Types (if needed)

Update `src/types/index.ts`:
```typescript
export interface MyFeatureData {
  id: string;
  name: string;
  // ... other fields
}
```

### 7. Write Tests

Create test file in `__tests__/screens/`:
```typescript
// __tests__/screens/MyNewFeatureScreen.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import MyNewFeatureScreen from '../../src/screens/MyNewFeatureScreen';

describe('MyNewFeatureScreen', () => {
  test('should render correctly', () => {
    const { getByText } = render(<MyNewFeatureScreen />);
    expect(getByText('My New Feature')).toBeTruthy();
  });
});
```

## How to Remove a Feature

### 1. Disable in Configuration
Set `enabled: false` in `src/config/features.ts`

### 2. Remove Navigation References (Optional)
If you want to completely remove the feature:
- Delete the screen file from `src/screens/`
- Remove the import and route from `AppNavigator.tsx`
- Remove menu items from `AdminScreen.tsx`
- Remove related API methods
- Remove type definitions

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- AuthScreens.test
```

### Test Coverage
```bash
npm test -- --coverage
```

## Feature Checklist

When implementing a new feature, ensure you have:

- [ ] Feature configuration in `features.ts`
- [ ] Screen component created
- [ ] Navigation route added
- [ ] Menu item added (if applicable)
- [ ] API methods implemented
- [ ] Type definitions added
- [ ] Test cases written
- [ ] Documentation updated
- [ ] Tested with different user roles
- [ ] Tested on both iOS and Android (if mobile-specific)

## Architecture Notes

### Design Patterns Used

1. **Container Component Pattern** - All screens use the `Container` component for consistent layout
2. **Context API** - Authentication state managed via AuthContext
3. **Centralized API Service** - All API calls go through `services/api.ts`
4. **Feature Flags** - Features can be toggled via configuration
5. **Role-Based Access Control** - Features restricted by user role

### File Structure
```
src/
├── config/
│   └── features.ts          # Feature configuration
├── contexts/
│   ├── AuthContext.tsx      # Authentication state
│   └── CartContext.tsx      # Shopping cart state
├── navigation/
│   └── AppNavigator.tsx     # Main navigation
├── screens/
│   ├── Auth/               # Authentication screens
│   ├── Customer/           # Customer-facing screens
│   └── Admin/              # Admin screens
├── services/
│   └── api.ts              # API service layer
├── types/
│   └── index.ts            # TypeScript types
└── components/
    └── Container.tsx       # Reusable layout component
```

## Performance Considerations

- **Lazy Loading** - Screens are loaded only when navigated to
- **Memoization** - Use React.memo for expensive components
- **FlatList** - Use for long lists instead of ScrollView
- **Image Optimization** - Optimize images before upload
- **API Caching** - Consider implementing API response caching

## Security Considerations

- **Role-Based Access** - Always check user roles before rendering admin features
- **API Authentication** - All API calls include authentication token
- **Input Validation** - Validate all user inputs
- **Secure Storage** - Use AsyncStorage for sensitive data
- **HTTPS Only** - All API calls over HTTPS

## Troubleshooting

### Feature Not Showing
1. Check `features.ts` - is it enabled?
2. Check user role - does the user have access?
3. Check navigation - is the route added?
4. Check imports - are all files imported correctly?

### TypeScript Errors
1. Run `npx tsc --noEmit` to check for errors
2. Ensure all types are properly defined in `types/index.ts`
3. Check API method signatures match the calls

### API Errors
1. Check backend is running
2. Verify API URL in `services/api.ts`
3. Check authentication token is valid
4. Review backend logs for errors

## Future Enhancements

- [ ] Offline mode support
- [ ] Real-time updates (WebSocket)
- [ ] Advanced search and filtering
- [ ] Export functionality (PDF, Excel)
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Biometric authentication
- [ ] Calendar integration
- [ ] Payment integration (Stripe/Vipps)
- [ ] QR code check-in system
