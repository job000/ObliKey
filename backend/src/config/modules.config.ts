/**
 * Module Configuration System
 *
 * This file defines all available modules in the Otico system.
 * Each module can be enabled/disabled per tenant through tenant_settings.
 *
 * To add a new module:
 * 1. Add it to the ModuleKey enum
 * 2. Add its configuration to MODULE_DEFINITIONS
 * 3. Update tenant_settings schema if needed
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
  MEMBERSHIP = 'membership',
  WORKOUT = 'workout',
}

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'business' | 'marketing' | 'admin';
  requiredRoles: string[];
  dependencies?: ModuleKey[]; // Modules that must be enabled for this to work
  defaultEnabled: boolean;
  routes?: string[];
  apiEndpoints?: string[];
}

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  [ModuleKey.DASHBOARD]: {
    key: ModuleKey.DASHBOARD,
    name: 'Dashboard',
    description: 'Hovedoversikt og statistikk',
    icon: 'Home',
    category: 'core',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    routes: ['/dashboard'],
    apiEndpoints: ['/api/dashboard/*'],
  },

  [ModuleKey.CLASSES]: {
    key: ModuleKey.CLASSES,
    name: 'Klasser',
    description: 'Gruppetimer og klasseoversikt',
    icon: 'Calendar',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    routes: ['/classes'],
    apiEndpoints: ['/api/classes/*'],
  },

  [ModuleKey.PT_SESSIONS]: {
    key: ModuleKey.PT_SESSIONS,
    name: 'PT-Økter',
    description: 'Personlig trening og PT-booking',
    icon: 'Dumbbell',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    routes: ['/pt-sessions'],
    apiEndpoints: ['/api/pt/*'],
  },

  [ModuleKey.TRAINING_PROGRAMS]: {
    key: ModuleKey.TRAINING_PROGRAMS,
    name: 'Treningsprogrammer',
    description: 'Skreddersydde treningsprogrammer',
    icon: 'FileText',
    category: 'business',
    requiredRoles: ['TRAINER', 'CUSTOMER'],
    dependencies: [ModuleKey.PT_SESSIONS],
    defaultEnabled: true,
    routes: ['/training-programs'],
    apiEndpoints: ['/api/training-programs/*'],
  },

  [ModuleKey.BOOKINGS]: {
    key: ModuleKey.BOOKINGS,
    name: 'Mine Bookinger',
    description: 'Oversikt over bookinger',
    icon: 'BookOpen',
    category: 'business',
    requiredRoles: ['CUSTOMER'],
    dependencies: [ModuleKey.CLASSES],
    defaultEnabled: true,
    routes: ['/bookings'],
    apiEndpoints: ['/api/bookings/*'],
  },

  [ModuleKey.SHOP]: {
    key: ModuleKey.SHOP,
    name: 'Butikk',
    description: 'Produktsalg og e-handel',
    icon: 'ShoppingBag',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    routes: ['/shop', '/checkout', '/admin/products', '/admin/orders'],
    apiEndpoints: ['/api/products/*', '/api/orders/*', '/api/cart/*'],
  },

  [ModuleKey.CHAT]: {
    key: ModuleKey.CHAT,
    name: 'Chat',
    description: 'Intern meldingssystem',
    icon: 'MessageSquare',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: false,
    routes: ['/chat'],
    apiEndpoints: ['/api/chat/*'],
  },

  [ModuleKey.ACCOUNTING]: {
    key: ModuleKey.ACCOUNTING,
    name: 'Regnskap',
    description: 'Regnskapssystem og bokføring',
    icon: 'Calculator',
    category: 'admin',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: false,
    routes: ['/accounting'],
    apiEndpoints: ['/api/accounting/*', '/api/invoices/*'],
  },

  [ModuleKey.LANDING_PAGE]: {
    key: ModuleKey.LANDING_PAGE,
    name: 'Landingsside',
    description: 'CMS for landingsside',
    icon: 'FileEdit',
    category: 'marketing',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: false,
    routes: ['/admin/landing-page', '/'],
    apiEndpoints: ['/api/landing-page/*'],
  },

  [ModuleKey.ADMIN]: {
    key: ModuleKey.ADMIN,
    name: 'Administrasjon',
    description: 'Systemadministrasjon',
    icon: 'Settings',
    category: 'admin',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: true,
    routes: ['/admin', '/admin/activity-logs', '/profile'],
    apiEndpoints: ['/api/users/*', '/api/tenants/*', '/api/activity-logs/*'],
  },

  [ModuleKey.MEMBERSHIP]: {
    key: ModuleKey.MEMBERSHIP,
    name: 'Medlemskap',
    description: 'Medlemskapssystem med automatisk fakturering',
    icon: 'Users',
    category: 'business',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CUSTOMER'],
    defaultEnabled: false,
    routes: ['/memberships', '/admin/memberships'],
    apiEndpoints: ['/api/memberships/*'],
  },

  [ModuleKey.WORKOUT]: {
    key: ModuleKey.WORKOUT,
    name: 'Treningsprogram',
    description: 'Personlige treningsprogram med øvelser, tracking og statistikk',
    icon: 'Activity',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: false,
    routes: ['/workout', '/workout/programs', '/workout/exercises', '/workout/sessions', '/workout/stats'],
    apiEndpoints: ['/api/workouts/*'],
  },
};

/**
 * Get all modules available for a specific role
 */
export function getModulesForRole(role: string): ModuleDefinition[] {
  return Object.values(MODULE_DEFINITIONS).filter(module =>
    module.requiredRoles.includes(role)
  );
}

/**
 * Check if a module should be visible based on enabled modules and dependencies
 */
export function isModuleVisible(
  moduleKey: ModuleKey,
  enabledModules: Set<ModuleKey>,
  userRole: string
): boolean {
  const module = MODULE_DEFINITIONS[moduleKey];

  // Check if user has required role
  if (!module.requiredRoles.includes(userRole)) {
    return false;
  }

  // Check if module is enabled
  if (!enabledModules.has(moduleKey)) {
    return false;
  }

  // Check dependencies
  if (module.dependencies) {
    const allDependenciesMet = module.dependencies.every(dep =>
      enabledModules.has(dep)
    );
    if (!allDependenciesMet) {
      return false;
    }
  }

  return true;
}

/**
 * Get module configuration from tenant settings
 */
export function getModuleConfig(tenantSettings: any): Set<ModuleKey> {
  const enabledModules = new Set<ModuleKey>();

  // Map tenant_settings fields to ModuleKeys
  const settingsMap: Record<string, ModuleKey> = {
    classesEnabled: ModuleKey.CLASSES,
    chatEnabled: ModuleKey.CHAT,
    accountingEnabled: ModuleKey.ACCOUNTING,
    landingPageEnabled: ModuleKey.LANDING_PAGE,
    membershipEnabled: ModuleKey.MEMBERSHIP,
    workoutEnabled: ModuleKey.WORKOUT,
  };

  // Always enable core modules
  enabledModules.add(ModuleKey.DASHBOARD);
  enabledModules.add(ModuleKey.ADMIN);

  // Enable business modules by default (can be overridden by settings)
  if (tenantSettings.classesEnabled !== false) {
    enabledModules.add(ModuleKey.CLASSES);
    enabledModules.add(ModuleKey.BOOKINGS);
  }

  // PT Sessions and related modules
  enabledModules.add(ModuleKey.PT_SESSIONS);
  enabledModules.add(ModuleKey.TRAINING_PROGRAMS);

  // Shop module (always enabled for now)
  enabledModules.add(ModuleKey.SHOP);

  // Optional modules based on settings
  for (const [setting, moduleKey] of Object.entries(settingsMap)) {
    if (tenantSettings[setting] === true) {
      enabledModules.add(moduleKey);
    }
  }

  return enabledModules;
}

/**
 * Default module configuration for new tenants
 */
export const DEFAULT_MODULE_CONFIG = {
  classesEnabled: true,
  chatEnabled: false,
  accountingEnabled: false,
  landingPageEnabled: false,
  membershipEnabled: false,
  workoutEnabled: true, // Enabled by default with pre-seeded templates
};
