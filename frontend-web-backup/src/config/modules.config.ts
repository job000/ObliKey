/**
 * Frontend Module Configuration
 * Mirrors the backend module system for consistent behavior
 */

export enum ModuleKey {
  DASHBOARD = 'dashboard',
  CLASSES = 'classes',
  PT_SESSIONS = 'ptSessions',
  TRAINING_PROGRAMS = 'trainingPrograms',
  BOOKINGS = 'bookings',
  SHOP = 'shop',
  CHAT = 'chat',
  ACCOUNTING = 'accounting',
  LANDING_PAGE = 'landingPage',
  ADMIN = 'admin',
}

export interface ModuleConfig {
  key: ModuleKey;
  name: string;
  path: string;
  icon: string;
  category: 'core' | 'business' | 'marketing' | 'admin';
  roles: string[];
  dependencies?: ModuleKey[];
}

export const MODULES: Record<ModuleKey, ModuleConfig> = {
  [ModuleKey.DASHBOARD]: {
    key: ModuleKey.DASHBOARD,
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'Home',
    category: 'core',
    roles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
  },

  [ModuleKey.CLASSES]: {
    key: ModuleKey.CLASSES,
    name: 'Klasser',
    path: '/classes',
    icon: 'Calendar',
    category: 'business',
    roles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
  },

  [ModuleKey.PT_SESSIONS]: {
    key: ModuleKey.PT_SESSIONS,
    name: 'PT-Økter',
    path: '/pt-sessions',
    icon: 'Dumbbell',
    category: 'business',
    roles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
  },

  [ModuleKey.TRAINING_PROGRAMS]: {
    key: ModuleKey.TRAINING_PROGRAMS,
    name: 'Treningsprogrammer',
    path: '/training-programs',
    icon: 'FileText',
    category: 'business',
    roles: ['TRAINER', 'CUSTOMER'],
    dependencies: [ModuleKey.PT_SESSIONS],
  },

  [ModuleKey.BOOKINGS]: {
    key: ModuleKey.BOOKINGS,
    name: 'Mine Bookinger',
    path: '/bookings',
    icon: 'BookOpen',
    category: 'business',
    roles: ['CUSTOMER'],
    dependencies: [ModuleKey.CLASSES],
  },

  [ModuleKey.SHOP]: {
    key: ModuleKey.SHOP,
    name: 'Butikk',
    path: '/shop',
    icon: 'ShoppingBag',
    category: 'business',
    roles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
  },

  [ModuleKey.CHAT]: {
    key: ModuleKey.CHAT,
    name: 'Chat',
    path: '/chat',
    icon: 'MessageSquare',
    category: 'business',
    roles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
  },

  [ModuleKey.ACCOUNTING]: {
    key: ModuleKey.ACCOUNTING,
    name: 'Regnskap',
    path: '/accounting',
    icon: 'Calculator',
    category: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },

  [ModuleKey.LANDING_PAGE]: {
    key: ModuleKey.LANDING_PAGE,
    name: 'Landingsside',
    path: '/admin/landing-page',
    icon: 'FileEdit',
    category: 'marketing',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },

  [ModuleKey.ADMIN]: {
    key: ModuleKey.ADMIN,
    name: 'Admin',
    path: '/admin',
    icon: 'Settings',
    category: 'admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
};

/**
 * Check if module is enabled for user
 */
export function isModuleEnabled(
  moduleKey: ModuleKey,
  userRole: string,
  enabledModules: Set<ModuleKey>
): boolean {
  const module = MODULES[moduleKey];

  // Check role
  if (!module.roles.includes(userRole)) {
    return false;
  }

  // Check if enabled
  if (!enabledModules.has(moduleKey)) {
    return false;
  }

  // Check dependencies
  if (module.dependencies) {
    return module.dependencies.every(dep => enabledModules.has(dep));
  }

  return true;
}

/**
 * Parse module settings from API response
 */
export function parseModuleSettings(settings: any): Set<ModuleKey> {
  const enabled = new Set<ModuleKey>();

  // Core modules always enabled
  enabled.add(ModuleKey.DASHBOARD);
  enabled.add(ModuleKey.ADMIN);

  // Business modules
  enabled.add(ModuleKey.PT_SESSIONS);
  enabled.add(ModuleKey.TRAINING_PROGRAMS);
  enabled.add(ModuleKey.SHOP);

  // Conditional modules
  if (settings.classesEnabled) {
    enabled.add(ModuleKey.CLASSES);
    enabled.add(ModuleKey.BOOKINGS);
  }

  if (settings.chatEnabled) {
    enabled.add(ModuleKey.CHAT);
  }

  if (settings.accountingEnabled) {
    enabled.add(ModuleKey.ACCOUNTING);
  }

  if (settings.landingPageEnabled) {
    enabled.add(ModuleKey.LANDING_PAGE);
  }

  return enabled;
}
