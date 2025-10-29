/**
 * Feature Configuration
 *
 * This file allows you to easily enable/disable features in the application.
 * Set a feature to `false` to hide it from the UI and disable its functionality.
 */

export interface FeatureConfig {
  enabled: boolean;
  label: string;
  description: string;
  requiredRoles?: string[];
}

export interface Features {
  // Core Features
  authentication: FeatureConfig;
  dashboard: FeatureConfig;
  profile: FeatureConfig;

  // Customer Features
  shop: FeatureConfig;
  cart: FeatureConfig;
  classes: FeatureConfig;
  ptSessions: FeatureConfig;
  bookings: FeatureConfig;
  purchaseHistory: FeatureConfig;
  chat: FeatureConfig;
  support: FeatureConfig;
  trainingPrograms: FeatureConfig;

  // Admin Features
  adminDashboard: FeatureConfig;
  userManagement: FeatureConfig;
  classManagement: FeatureConfig;
  ptManagement: FeatureConfig;
  productManagement: FeatureConfig;
  orderManagement: FeatureConfig;
  analytics: FeatureConfig;
  settings: FeatureConfig;
  activityLogs: FeatureConfig;
  productAnalytics: FeatureConfig;

  // Optional Modules
  accounting: FeatureConfig;
  landingPageCMS: FeatureConfig;
  inventory: FeatureConfig;
  notifications: FeatureConfig;
  reports: FeatureConfig;
  integrations: FeatureConfig;
}

export const features: Features = {
  // Core Features (always enabled)
  authentication: {
    enabled: true,
    label: 'Authentication',
    description: 'User login, registration, and password reset',
  },
  dashboard: {
    enabled: true,
    label: 'Dashboard',
    description: 'Main dashboard for all users',
  },
  profile: {
    enabled: true,
    label: 'Profile',
    description: 'User profile management',
  },

  // Customer Features
  shop: {
    enabled: true,
    label: 'Shop',
    description: 'Product catalog and shopping',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  cart: {
    enabled: true,
    label: 'Cart',
    description: 'Shopping cart functionality',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  classes: {
    enabled: true,
    label: 'Classes',
    description: 'Group class scheduling and booking',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  ptSessions: {
    enabled: true,
    label: 'PT Sessions',
    description: 'Personal training sessions',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  bookings: {
    enabled: true,
    label: 'Bookings',
    description: 'Class and session bookings',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  purchaseHistory: {
    enabled: true,
    label: 'Purchase History',
    description: 'Order history and tracking',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  chat: {
    enabled: true,
    label: 'Chat',
    description: 'Messaging between users and trainers',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  support: {
    enabled: true,
    label: 'Support',
    description: 'Help center and customer support',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  trainingPrograms: {
    enabled: true,
    label: 'Training Programs',
    description: 'Personalized training programs',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },

  // Admin Features
  adminDashboard: {
    enabled: true,
    label: 'Admin Dashboard',
    description: 'Admin control panel',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  userManagement: {
    enabled: true,
    label: 'User Management',
    description: 'Manage users, roles, and permissions',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  classManagement: {
    enabled: true,
    label: 'Class Management',
    description: 'Create and manage group classes',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'TRAINER'],
  },
  ptManagement: {
    enabled: true,
    label: 'PT Management',
    description: 'Manage personal training sessions',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'TRAINER'],
  },
  productManagement: {
    enabled: true,
    label: 'Product Management',
    description: 'Manage shop products and inventory',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  orderManagement: {
    enabled: true,
    label: 'Order Management',
    description: 'Process and manage customer orders',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  analytics: {
    enabled: true,
    label: 'Analytics',
    description: 'Business analytics and reporting',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  settings: {
    enabled: true,
    label: 'Settings',
    description: 'System and tenant settings',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  activityLogs: {
    enabled: true,
    label: 'Activity Logs',
    description: 'System activity and audit logs',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  productAnalytics: {
    enabled: true,
    label: 'Product Analytics',
    description: 'Detailed product performance analytics',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },

  // Optional Modules (can be enabled/disabled based on tenant needs)
  accounting: {
    enabled: false, // Not yet implemented in mobile
    label: 'Accounting',
    description: 'Full accounting module with invoices, transactions, and reports',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  landingPageCMS: {
    enabled: false, // Not applicable for mobile app
    label: 'Landing Page CMS',
    description: 'Content management for public landing page',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  inventory: {
    enabled: false, // Not yet implemented
    label: 'Inventory Management',
    description: 'Advanced inventory tracking and management',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  notifications: {
    enabled: false, // Not yet implemented
    label: 'Push Notifications',
    description: 'Push notification system for mobile',
    requiredRoles: ['CUSTOMER', 'TRAINER', 'ADMIN', 'SUPER_ADMIN'],
  },
  reports: {
    enabled: false, // Not yet implemented
    label: 'Advanced Reports',
    description: 'Customizable business reports',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  integrations: {
    enabled: false, // Not yet implemented
    label: 'Third-party Integrations',
    description: 'Integrations with external services (payment, accounting, etc.)',
    requiredRoles: ['SUPER_ADMIN'],
  },
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (featureName: keyof Features): boolean => {
  return features[featureName]?.enabled ?? false;
};

/**
 * Check if user has access to a feature
 */
export const hasFeatureAccess = (
  featureName: keyof Features,
  userRole?: string
): boolean => {
  const feature = features[featureName];
  if (!feature || !feature.enabled) return false;

  if (!feature.requiredRoles || feature.requiredRoles.length === 0) {
    return true;
  }

  if (!userRole) return false;

  return feature.requiredRoles.includes(userRole);
};

/**
 * Get all enabled features for a specific role
 */
export const getEnabledFeaturesForRole = (
  userRole?: string
): Partial<Features> => {
  const enabledFeatures: Partial<Features> = {};

  Object.entries(features).forEach(([key, config]) => {
    if (hasFeatureAccess(key as keyof Features, userRole)) {
      enabledFeatures[key as keyof Features] = config;
    }
  });

  return enabledFeatures;
};

/**
 * Get list of features that are not yet implemented
 */
export const getNotImplementedFeatures = (): Array<{
  name: string;
  config: FeatureConfig;
}> => {
  return Object.entries(features)
    .filter(([_, config]) => !config.enabled)
    .map(([name, config]) => ({ name, config }));
};
