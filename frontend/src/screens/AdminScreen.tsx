import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { useTheme } from '../contexts/ThemeContext';
import Container from '../components/Container';

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const { modules, loading } = useModules();
  const { colors } = useTheme();

  const allMenuItems = [
    {
      title: 'Brukeradministrasjon',
      icon: 'people',
      color: colors.primary,
      screen: 'UserManagement',
      description: 'Administrer brukere og roller',
      show: true, // Core feature - always shown
    },
    {
      title: 'Produktadministrasjon',
      icon: 'pricetag',
      color: colors.success,
      screen: 'ProductsManagement',
      description: 'Administrer produkter og priser',
      show: modules.shop,
    },
    {
      title: 'Bestillingsadministrasjon',
      icon: 'receipt',
      color: colors.warning,
      screen: 'OrdersManagement',
      description: 'Håndter bestillinger og levering',
      show: modules.shop,
    },
    {
      title: 'Anmeldelsesadministrasjon',
      icon: 'star',
      color: colors.warning,
      screen: 'ReviewManagement',
      description: 'Godkjenn og moderer produktanmeldelser',
      show: modules.shop,
    },
    {
      title: 'Betalingsadministrasjon',
      icon: 'card-outline',
      color: colors.accent,
      screen: 'PaymentManagement',
      description: 'Konfigurer Vipps og betalingsmetoder',
      show: modules.shop,
    },
    {
      title: 'Klasseadministrasjon',
      icon: 'calendar',
      color: colors.accent,
      screen: 'ClassManagement',
      description: 'Administrer klasser og bookinger',
      show: modules.classes,
    },
    {
      title: 'PT-administrasjon',
      icon: 'barbell',
      color: colors.accent,
      screen: 'PTManagement',
      description: 'Administrer PT-økter og kreditter',
      show: modules.pt,
    },
    {
      title: 'Treningsprogramadministrasjon',
      icon: 'fitness',
      color: colors.danger,
      screen: 'WorkoutTemplateManagement',
      description: 'Administrer treningsprogrammaler',
      show: modules.workout,
    },
    {
      title: 'Øvelsesadministrasjon',
      icon: 'barbell-outline',
      color: colors.warning,
      screen: 'ExerciseManagement',
      description: 'Administrer øvelser med bilder og beskrivelser',
      show: modules.workout,
    },
    {
      title: 'Medlemskapsstyring',
      icon: 'card',
      color: colors.success,
      screen: 'MembershipManagement',
      description: 'Administrer medlemskap og betalinger',
      show: modules.membership,
    },
    {
      title: 'Dørstyring',
      icon: 'lock-closed',
      color: colors.accent,
      screen: 'DoorManagement',
      description: 'Administrer dører og tilgangskontroll',
      show: modules.doorAccess,
    },
    {
      title: 'Tilgangslogger',
      icon: 'reader',
      color: colors.primary,
      screen: 'AccessLogs',
      description: 'Se dør-tilgangslogger og statistikk',
      show: modules.doorAccess,
    },
    {
      title: 'Rapporter & Analyse',
      icon: 'stats-chart',
      color: colors.primary,
      screen: 'Analytics',
      description: 'Se statistikk og rapporter',
      show: true, // Core feature - always shown
    },
    {
      title: 'Aktivitetslogger',
      icon: 'list',
      color: colors.warning,
      screen: 'ActivityLogs',
      description: 'Se brukeraktivitet og systemlogger',
      show: true, // Core feature - always shown
    },
    {
      title: 'Innstillinger',
      icon: 'settings',
      color: colors.textSecondary,
      screen: 'Settings',
      description: 'System- og tenant-innstillinger',
      show: true, // Core feature - always shown
    },
  ];

  const menuItems = allMenuItems.filter(item => item.show);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Laster funksjoner...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Container>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Administrasjon</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Innlogget som {user?.firstName} {user?.lastName}
          </Text>
        </View>

        <View style={[styles.roleCard, { backgroundColor: colors.cardBg }]}>
          <View style={[styles.roleIcon, { backgroundColor: colors.successLight + '33' }]}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>Din rolle</Text>
            <Text style={[styles.roleValue, { color: colors.text }]}>
              {user?.role === 'SUPER_ADMIN' ? 'Superadministrator' :
               user?.role === 'ADMIN' ? 'Administrator' : 'Trener'}
            </Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.cardBg }]}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View
                style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}
              >
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Rask oversikt</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>24</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aktive brukere</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>15</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nye bestillinger</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>8</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Kommende klasser</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PT-økter i dag</Text>
            </View>
          </View>
        </View>
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  roleValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuGrid: {
    gap: 12,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
  },
  quickStats: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
});
