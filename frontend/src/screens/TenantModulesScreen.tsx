import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface RouteParams {
  tenantId: string;
  tenantName: string;
}

interface ModuleStatuses {
  [key: string]: boolean;
}

// Module definitions based on backend config
enum ModuleKey {
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

interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'business' | 'marketing' | 'admin';
  requiredRoles: string[];
  dependencies?: ModuleKey[];
  defaultEnabled: boolean;
  routes?: string[];
  apiEndpoints?: string[];
}

const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
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
    defaultEnabled: true,
    routes: ['/workout', '/workout/programs', '/workout/exercises', '/workout/sessions', '/workout/stats'],
    apiEndpoints: ['/api/workouts/*'],
  },
};

export default function TenantModulesScreen({ route, navigation }: any) {
  const { tenantId, tenantName } = route.params as RouteParams;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatuses>({});

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadModuleStatuses();
  }, [tenantId]);

  const loadModuleStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAllModuleStatuses();
      setModuleStatuses(response.data || {});
      console.log('Loaded module statuses:', response.data);
    } catch (err: any) {
      console.error('Failed to load module statuses:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke laste modulstatus';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (iconName: string): any => {
    const iconMap: { [key: string]: any } = {
      Home: 'home',
      Calendar: 'calendar',
      Dumbbell: 'barbell',
      FileText: 'document-text',
      BookOpen: 'book',
      ShoppingBag: 'bag',
      MessageSquare: 'chatbubbles',
      Calculator: 'calculator',
      FileEdit: 'create',
      Settings: 'settings',
      Users: 'people',
      Activity: 'pulse',
    };
    return iconMap[iconName] || 'cube';
  };

  const getModuleKeyForBackend = (moduleKey: ModuleKey): string => {
    // Map frontend ModuleKey to backend API module names
    const keyMap: { [key: string]: string } = {
      [ModuleKey.DASHBOARD]: 'dashboard',
      [ModuleKey.CLASSES]: 'classes',
      [ModuleKey.PT_SESSIONS]: 'pt',
      [ModuleKey.TRAINING_PROGRAMS]: 'trainingPrograms',
      [ModuleKey.BOOKINGS]: 'bookings',
      [ModuleKey.SHOP]: 'shop',
      [ModuleKey.CHAT]: 'chat',
      [ModuleKey.ACCOUNTING]: 'accounting',
      [ModuleKey.LANDING_PAGE]: 'landingPage',
      [ModuleKey.ADMIN]: 'admin',
      [ModuleKey.MEMBERSHIP]: 'membership',
      [ModuleKey.WORKOUT]: 'workout',
    };
    return keyMap[moduleKey] || moduleKey;
  };

  const getModuleStatusKey = (moduleKey: ModuleKey): string => {
    // Map ModuleKey to the key used in moduleStatuses response
    const statusKeyMap: { [key: string]: string } = {
      [ModuleKey.DASHBOARD]: 'dashboard',
      [ModuleKey.CLASSES]: 'classes',
      [ModuleKey.PT_SESSIONS]: 'pt',
      [ModuleKey.TRAINING_PROGRAMS]: 'trainingPrograms',
      [ModuleKey.BOOKINGS]: 'bookings',
      [ModuleKey.SHOP]: 'shop',
      [ModuleKey.CHAT]: 'chat',
      [ModuleKey.ACCOUNTING]: 'accounting',
      [ModuleKey.LANDING_PAGE]: 'landingPage',
      [ModuleKey.ADMIN]: 'admin',
      [ModuleKey.MEMBERSHIP]: 'membership',
      [ModuleKey.WORKOUT]: 'workout',
    };
    return statusKeyMap[moduleKey] || moduleKey;
  };

  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    const statusKey = getModuleStatusKey(moduleKey);
    return moduleStatuses[statusKey] || false;
  };

  const handleToggleModule = async (module: ModuleDefinition) => {
    const currentlyEnabled = isModuleEnabled(module.key);
    const backendModuleKey = getModuleKeyForBackend(module.key);

    // Check if this is a critical module
    if (currentlyEnabled && (module.key === ModuleKey.DASHBOARD || module.key === ModuleKey.ADMIN)) {
      Alert.alert(
        'Kritisk modul',
        `${module.name} er en kritisk modul og bør ikke deaktiveres. Er du sikker?`,
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Deaktiver',
            style: 'destructive',
            onPress: () => performToggle(module, backendModuleKey, currentlyEnabled),
          },
        ]
      );
      return;
    }

    performToggle(module, backendModuleKey, currentlyEnabled);
  };

  const performToggle = async (module: ModuleDefinition, backendModuleKey: string, currentlyEnabled: boolean) => {
    try {
      console.log('=== Toggle Module ===');
      console.log('Module:', module.name, '(', backendModuleKey, ')');
      console.log('Currently Enabled:', currentlyEnabled);
      console.log('Will set to:', !currentlyEnabled);

      // Optimistic update
      const newEnabled = !currentlyEnabled;
      const statusKey = getModuleStatusKey(module.key);
      setModuleStatuses(prev => ({
        ...prev,
        [statusKey]: newEnabled,
      }));

      setSaving(true);

      await api.toggleModule(backendModuleKey, newEnabled);

      console.log('Toggle successful');
    } catch (err: any) {
      console.error('Failed to toggle module:', err);

      // Revert optimistic update
      const statusKey = getModuleStatusKey(module.key);
      setModuleStatuses(prev => ({
        ...prev,
        [statusKey]: currentlyEnabled,
      }));

      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke endre modul';
      Alert.alert('Feil', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const groupModulesByCategory = () => {
    const grouped: { [key: string]: ModuleDefinition[] } = {
      core: [],
      business: [],
      marketing: [],
      admin: [],
    };

    Object.values(MODULE_DEFINITIONS).forEach((module) => {
      grouped[module.category].push(module);
    });

    return grouped;
  };

  const getDependencyText = (dependencies: ModuleKey[] | undefined): string | null => {
    if (!dependencies || dependencies.length === 0) return null;
    const depNames = dependencies.map(dep => MODULE_DEFINITIONS[dep]?.name || dep);
    return `Krever: ${depNames.join(', ')}`;
  };

  const getCategoryIcon = (category: string): any => {
    const iconMap: { [key: string]: any } = {
      core: 'shield-checkmark',
      business: 'briefcase',
      marketing: 'megaphone',
      admin: 'construct',
    };
    return iconMap[category] || 'cube';
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      core: '#3B82F6',
      business: '#10B981',
      marketing: '#F59E0B',
      admin: '#8B5CF6',
    };
    return colorMap[category] || '#6B7280';
  };

  const getCategoryLabel = (category: string): string => {
    const labelMap: { [key: string]: string } = {
      core: 'Kjernemodulær',
      business: 'Forretningsmoduler',
      marketing: 'Markedsføring',
      admin: 'Administrasjon',
    };
    return labelMap[category] || category;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster moduler...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadModuleStatuses}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupedModules = groupModulesByCategory();
  const enabledCount = Object.values(moduleStatuses).filter(Boolean).length;
  const totalCount = Object.keys(MODULE_DEFINITIONS).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, isWeb && styles.webContent]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Administrer Moduler</Text>
            <Text style={styles.subtitle}>{tenantName}</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Moduladministrasjon</Text>
            <Text style={styles.infoBannerText}>
              Slå moduler på eller av for å kontrollere hvilke funksjoner som er tilgjengelige for denne tenanten.
            </Text>
          </View>
        </View>

        {/* Module Categories */}
        {Object.entries(groupedModules).map(([category, modules]) => (
          <View key={category} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={getCategoryIcon(category)} size={24} color={getCategoryColor(category)} />
              <Text style={styles.sectionTitle}>{getCategoryLabel(category)}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{modules.length}</Text>
              </View>
            </View>

            <View style={styles.modulesCard}>
              {modules.map((module) => {
                const enabled = isModuleEnabled(module.key);
                const dependencies = getDependencyText(module.dependencies);

                return (
                  <View key={module.key} style={styles.moduleItem}>
                    <View style={styles.moduleIconContainer}>
                      <Ionicons
                        name={getModuleIcon(module.icon)}
                        size={24}
                        color={enabled ? getCategoryColor(category) : '#9CA3AF'}
                      />
                    </View>
                    <View style={styles.moduleInfo}>
                      <View style={styles.moduleHeader}>
                        <Text style={[styles.moduleName, !enabled && styles.moduleNameDisabled]}>
                          {module.name}
                        </Text>
                        {module.defaultEnabled && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Standard</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.moduleDescription}>{module.description}</Text>
                      {dependencies && (
                        <View style={styles.dependencyContainer}>
                          <Ionicons name="link" size={12} color="#8B5CF6" />
                          <Text style={styles.dependencyText}>{dependencies}</Text>
                        </View>
                      )}
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => handleToggleModule(module)}
                      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                      thumbColor="#FFF"
                      disabled={saving}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="stats-chart" size={24} color="#3B82F6" />
            <Text style={styles.summaryTitle}>Oppsummering</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{enabledCount}</Text>
              <Text style={styles.summaryLabel}>Aktive Moduler</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>Totalt Tilgjengelig</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {Math.round((enabledCount / totalCount) * 100)}%
              </Text>
              <Text style={styles.summaryLabel}>Aktivert</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  webContent: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  modulesCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  moduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  moduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  moduleNameDisabled: {
    color: '#9CA3AF',
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  moduleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  dependencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  dependencyText: {
    fontSize: 11,
    color: '#6B21A8',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#DBEAFE',
  },
});
