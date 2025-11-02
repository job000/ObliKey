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
import Container from '../components/Container';

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const { modules, loading } = useModules();

  const allMenuItems = [
    {
      title: 'Brukeradministrasjon',
      icon: 'people',
      color: '#3B82F6',
      screen: 'UserManagement',
      description: 'Administrer brukere og roller',
      show: true, // Core feature - always shown
    },
    {
      title: 'Produktadministrasjon',
      icon: 'pricetag',
      color: '#10B981',
      screen: 'ProductsManagement',
      description: 'Administrer produkter og priser',
      show: modules.shop,
    },
    {
      title: 'Bestillingsadministrasjon',
      icon: 'receipt',
      color: '#F59E0B',
      screen: 'OrdersManagement',
      description: 'Håndter bestillinger og levering',
      show: modules.shop,
    },
    {
      title: 'Anmeldelsesadministrasjon',
      icon: 'star',
      color: '#EAB308',
      screen: 'ReviewManagement',
      description: 'Godkjenn og moderer produktanmeldelser',
      show: modules.shop,
    },
    {
      title: 'Klasseadministrasjon',
      icon: 'calendar',
      color: '#EC4899',
      screen: 'ClassManagement',
      description: 'Administrer klasser og bookinger',
      show: modules.classes,
    },
    {
      title: 'PT-administrasjon',
      icon: 'barbell',
      color: '#8B5CF6',
      screen: 'PTManagement',
      description: 'Administrer PT-økter og kreditter',
      show: modules.pt,
    },
    {
      title: 'Treningsprogramadministrasjon',
      icon: 'fitness',
      color: '#EF4444',
      screen: 'WorkoutTemplateManagement',
      description: 'Administrer treningsprogrammaler',
      show: modules.workout,
    },
    {
      title: 'Øvelsesadministrasjon',
      icon: 'barbell-outline',
      color: '#F59E0B',
      screen: 'ExerciseManagement',
      description: 'Administrer øvelser med bilder og beskrivelser',
      show: modules.workout,
    },
    {
      title: 'Medlemskapsstyring',
      icon: 'card',
      color: '#14B8A6',
      screen: 'MembershipManagement',
      description: 'Administrer medlemskap og betalinger',
      show: modules.membership,
    },
    {
      title: 'Dørstyring',
      icon: 'lock-closed',
      color: '#7C3AED',
      screen: 'DoorManagement',
      description: 'Administrer dører og tilgangskontroll',
      show: modules.doorAccess,
    },
    {
      title: 'Tilgangslogger',
      icon: 'reader',
      color: '#0891B2',
      screen: 'AccessLogs',
      description: 'Se dør-tilgangslogger og statistikk',
      show: modules.doorAccess,
    },
    {
      title: 'Rapporter & Analyse',
      icon: 'stats-chart',
      color: '#06B6D4',
      screen: 'Analytics',
      description: 'Se statistikk og rapporter',
      show: true, // Core feature - always shown
    },
    {
      title: 'Aktivitetslogger',
      icon: 'list',
      color: '#F97316',
      screen: 'ActivityLogs',
      description: 'Se brukeraktivitet og systemlogger',
      show: true, // Core feature - always shown
    },
    {
      title: 'Innstillinger',
      icon: 'settings',
      color: '#6B7280',
      screen: 'Settings',
      description: 'System- og tenant-innstillinger',
      show: true, // Core feature - always shown
    },
  ];

  const menuItems = allMenuItems.filter(item => item.show);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Laster funksjoner...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Container>
        <View style={styles.header}>
          <Text style={styles.title}>Administrasjon</Text>
          <Text style={styles.subtitle}>
            Innlogget som {user?.firstName} {user?.lastName}
          </Text>
        </View>

        <View style={styles.roleCard}>
          <View style={styles.roleIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleLabel}>Din rolle</Text>
            <Text style={styles.roleValue}>
              {user?.role === 'SUPER_ADMIN' ? 'Superadministrator' :
               user?.role === 'ADMIN' ? 'Administrator' : 'Trener'}
            </Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View
                style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}
              >
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.statsTitle}>Rask oversikt</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Aktive brukere</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Nye bestillinger</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Kommende klasser</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>PT-økter i dag</Text>
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  roleValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  menuGrid: {
    gap: 12,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    color: '#111827',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickStats: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
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
    backgroundColor: '#FFF',
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
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
