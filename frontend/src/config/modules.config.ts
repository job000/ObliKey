/**
 * Module Configuration System (Frontend)
 *
 * Frontend copy of module definitions. Must stay in sync with backend.
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
  dependencies?: ModuleKey[];
  defaultEnabled: boolean;
  apiKey: string; // Maps to backend API field (e.g., 'workout' -> 'workoutEnabled')
}

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  [ModuleKey.DASHBOARD]: {
    key: ModuleKey.DASHBOARD,
    name: 'Dashboard',
    description: 'Hovedoversikt og statistikk',
    icon: 'home',
    category: 'core',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    apiKey: 'dashboard',
  },

  [ModuleKey.CLASSES]: {
    key: ModuleKey.CLASSES,
    name: 'Klasser',
    description: 'Gruppetimer og klasseoversikt',
    icon: 'calendar',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    apiKey: 'classes',
  },

  [ModuleKey.PT_SESSIONS]: {
    key: ModuleKey.PT_SESSIONS,
    name: 'PT-Økter',
    description: 'Personlig trening og PT-booking',
    icon: 'barbell',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    apiKey: 'ptSessions',
  },

  [ModuleKey.TRAINING_PROGRAMS]: {
    key: ModuleKey.TRAINING_PROGRAMS,
    name: 'Treningsprogrammer',
    description: 'Skreddersydde treningsprogrammer',
    icon: 'document-text',
    category: 'business',
    requiredRoles: ['TRAINER', 'CUSTOMER'],
    dependencies: [ModuleKey.PT_SESSIONS],
    defaultEnabled: true,
    apiKey: 'workout', // Maps to workoutEnabled in backend
  },

  [ModuleKey.BOOKINGS]: {
    key: ModuleKey.BOOKINGS,
    name: 'Mine Bookinger',
    description: 'Oversikt over bookinger',
    icon: 'book',
    category: 'business',
    requiredRoles: ['CUSTOMER'],
    dependencies: [ModuleKey.CLASSES],
    defaultEnabled: true,
    apiKey: 'bookings',
  },

  [ModuleKey.SHOP]: {
    key: ModuleKey.SHOP,
    name: 'Butikk',
    description: 'Produktsalg og e-handel',
    icon: 'cart',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: true,
    apiKey: 'shop',
  },

  [ModuleKey.CHAT]: {
    key: ModuleKey.CHAT,
    name: 'Chat',
    description: 'Intern meldingssystem',
    icon: 'chatbubbles',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: false,
    apiKey: 'chat',
  },

  [ModuleKey.ACCOUNTING]: {
    key: ModuleKey.ACCOUNTING,
    name: 'Regnskap',
    description: 'Regnskapssystem og bokføring',
    icon: 'calculator',
    category: 'admin',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: false,
    apiKey: 'accounting',
  },

  [ModuleKey.LANDING_PAGE]: {
    key: ModuleKey.LANDING_PAGE,
    name: 'Landingsside',
    description: 'CMS for landingsside',
    icon: 'newspaper',
    category: 'marketing',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: false,
    apiKey: 'landingPage',
  },

  [ModuleKey.ADMIN]: {
    key: ModuleKey.ADMIN,
    name: 'Administrasjon',
    description: 'Systemadministrasjon',
    icon: 'settings',
    category: 'admin',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
    defaultEnabled: true,
    apiKey: 'admin',
  },

  [ModuleKey.MEMBERSHIP]: {
    key: ModuleKey.MEMBERSHIP,
    name: 'Medlemskap',
    description: 'Medlemskapssystem med automatisk fakturering',
    icon: 'people',
    category: 'business',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'CUSTOMER'],
    defaultEnabled: false,
    apiKey: 'membership',
  },

  [ModuleKey.WORKOUT]: {
    key: ModuleKey.WORKOUT,
    name: 'Treningsprogram',
    description: 'Personlige treningsprogram med øvelser, tracking, statistikk og AI-prediksjoner',
    icon: 'fitness',
    category: 'business',
    requiredRoles: ['ADMIN', 'TRAINER', 'CUSTOMER'],
    defaultEnabled: false,
    apiKey: 'workout',
  },
};

/**
 * Get modules by category
 */
export function getModulesByCategory(): Record<string, ModuleDefinition[]> {
  const grouped: Record<string, ModuleDefinition[]> = {
    core: [],
    business: [],
    marketing: [],
    admin: [],
  };

  Object.values(MODULE_DEFINITIONS).forEach(module => {
    grouped[module.category].push(module);
  });

  return grouped;
}

/**
 * Get category display info
 */
export const CATEGORY_INFO = {
  core: {
    name: 'Kjernemoduler',
    description: 'Essensielle moduler som alltid er tilgjengelige',
    color: '#3B82F6',
    icon: 'shield-checkmark',
  },
  business: {
    name: 'Forretningsmoduler',
    description: 'Moduler for daglig drift og kundeinteraksjon',
    color: '#10B981',
    icon: 'briefcase',
  },
  marketing: {
    name: 'Markedsføringsmoduler',
    description: 'Verktøy for markedsføring og kommunikasjon',
    color: '#F59E0B',
    icon: 'megaphone',
  },
  admin: {
    name: 'Administrasjonsmoduler',
    description: 'Administrative verktøy og innstillinger',
    color: '#8B5CF6',
    icon: 'construct',
  },
};
