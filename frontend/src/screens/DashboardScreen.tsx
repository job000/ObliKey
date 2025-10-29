import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  LinearGradient,
} from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { api } from '../services/api';
import Container from '../components/Container';
import StatCard from '../components/StatCard';
import type { Booking, PTSession, Class } from '../types';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { modules } = useModules();
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    totalSessions: 0,
    activePrograms: 0,
    weeklyProgress: 65,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<PTSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (user?.role === 'CUSTOMER') {
        const [bookingsRes, sessionsRes] = await Promise.all([
          api.getBookings(),
          api.getPTSessions(),
        ]);

        setUpcomingBookings(bookingsRes.data.slice(0, 3));
        setUpcomingSessions(sessionsRes.data.slice(0, 3));
        setStats({
          upcomingBookings: bookingsRes.data.length,
          totalSessions: sessionsRes.data.length,
          activePrograms: 2,
          weeklyProgress: 65,
        });
      } else if (user?.role === 'TRAINER' || user?.role === 'ADMIN') {
        const sessionsRes = await api.getPTSessions();
        setUpcomingSessions(sessionsRes.data.slice(0, 3));
        setStats({
          upcomingBookings: 0,
          totalSessions: sessionsRes.data.length,
          activePrograms: 0,
          weeklyProgress: 85,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'I dag';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'I morgen';
    }

    return date.toLocaleDateString('nb-NO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'God morgen';
    if (hour < 18) return 'God ettermiddag';
    return 'God kveld';
  };

  const allQuickActions = [
    {
      icon: 'barbell' as const,
      label: 'PT-Økter',
      onPress: () => navigation.navigate('PTSessions'),
      enabled: true, // PT sessions always available
    },
    {
      icon: 'calendar' as const,
      label: 'Klasser',
      onPress: () => navigation.navigate('Classes'),
      enabled: modules.classes,
    },
    {
      icon: 'storefront' as const,
      label: 'Butikk',
      onPress: () => navigation.navigate('Shop'),
      enabled: modules.shop,
    },
    {
      icon: 'fitness' as const,
      label: 'Programmer',
      onPress: () => navigation.navigate('TrainingPrograms'),
      enabled: true, // Training programs always available
    },
    {
      icon: 'chatbubbles' as const,
      label: 'Chat',
      onPress: () => navigation.navigate('Chat'),
      enabled: modules.chat,
    },
    {
      icon: 'help-circle' as const,
      label: 'Support',
      onPress: () => navigation.navigate('Support'),
      enabled: true, // Support always available
    },
  ];

  const quickActions = allQuickActions.filter(action => action.enabled);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F2937" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Gradient Header */}
      <ExpoLinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Container>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.profileAvatar}>
                <Ionicons name="person-outline" size={22} color="#6366F1" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Weekly Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Ukentlig mål</Text>
              <Text style={styles.progressValue}>5 av 7 økter</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <ExpoLinearGradient
                colors={['#FBBF24', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBar, { width: `${stats.weeklyProgress}%` }]}
              />
            </View>
          </View>
        </Container>
      </ExpoLinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Container>
          {/* Stats Cards - Vibrant Gradient Cards */}
          <View style={styles.statsGrid}>
            {modules.classes && (
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Classes')}
                activeOpacity={0.7}
              >
                <ExpoLinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
                  <Text style={styles.statLabel}>Bookinger</Text>
                </ExpoLinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('PTSessions')}
              activeOpacity={0.7}
            >
              <ExpoLinearGradient
                colors={['#EC4899', '#F43F5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="barbell" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats.totalSessions}</Text>
                <Text style={styles.statLabel}>PT-Økter</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('TrainingPrograms')}
              activeOpacity={0.7}
            >
              <ExpoLinearGradient
                colors={['#10B981', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="fitness" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats.activePrograms}</Text>
                <Text style={styles.statLabel}>Programmer</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => alert('Kalorisporing kommer snart!')}
              activeOpacity={0.7}
            >
              <ExpoLinearGradient
                colors={['#F59E0B', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="flame" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>2,847</Text>
                <Text style={styles.statLabel}>Kalorier</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Colorful Icons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hurtigvalg</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => {
                const gradientColors = [
                  ['#6366F1', '#8B5CF6'], // PT
                  ['#EC4899', '#F43F5E'], // Classes
                  ['#10B981', '#14B8A6'], // Shop
                  ['#F59E0B', '#EF4444'], // Programs
                  ['#8B5CF6', '#A855F7'], // Chat
                  ['#6366F1', '#3B82F6'], // Support
                ];
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionItem}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <ExpoLinearGradient
                      colors={gradientColors[index]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.quickActionIcon}
                    >
                      <Ionicons name={action.icon} size={24} color="#FFFFFF" />
                    </ExpoLinearGradient>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Upcoming Sessions - Clean Cards */}
          {upcomingSessions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kommende økter</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PTSessions')}>
                  <Text style={styles.seeAllText}>Se alle</Text>
                </TouchableOpacity>
              </View>

              {upcomingSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => navigation.navigate('PTSessions')}
                  activeOpacity={0.7}
                >
                  <ExpoLinearGradient
                    colors={['#EC4899', '#F43F5E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sessionIconCircle}
                  >
                    <Ionicons name="barbell" size={22} color="#FFFFFF" />
                  </ExpoLinearGradient>

                  <View style={styles.sessionContent}>
                    <Text style={styles.sessionTitle}>PT-Økt</Text>
                    <View style={styles.sessionDetails}>
                      <Ionicons name="time-outline" size={12} color="#6B7280" />
                      <Text style={styles.sessionDetailText}>
                        {session.startTime ? `${formatDate(session.startTime)} • ${formatTime(session.startTime)}` : 'Ikke planlagt'}
                      </Text>
                    </View>
                    {session.trainer && (
                      <View style={styles.sessionDetails}>
                        <Ionicons name="person-outline" size={12} color="#6B7280" />
                        <Text style={styles.sessionDetailText}>
                          {session.trainer.firstName} {session.trainer.lastName}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sessionRight}>
                    <View style={styles.sessionStatus}>
                      <Text style={styles.sessionStatusText}>{session.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Motivational Card - Vibrant Gradient */}
          <TouchableOpacity
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={['#FBBF24', '#F59E0B', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.motivationCard}
            >
              <View style={styles.motivationIcon}>
                <Ionicons name="trophy" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.motivationContent}>
                <Text style={styles.motivationTitle}>Du er på riktig vei!</Text>
                <Text style={styles.motivationSubtitle}>
                  2 økter til for å nå ditt ukentlige mål
                </Text>
              </View>
            </ExpoLinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Container>
      </ScrollView>
    </View>
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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressSection: {
    gap: 10,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64 - 12) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'flex-start',
    borderRadius: 20,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 10,
    width: (width - 64 - 24) / 3,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sessionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sessionContent: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDetailText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sessionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  motivationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  motivationContent: {
    flex: 1,
    gap: 4,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  motivationSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 18,
  },
});
