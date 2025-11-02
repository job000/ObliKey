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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { api } from '../services/api';
import Container from '../components/Container';
import { theme } from '../styles/theme';
import type { Booking, PTSession, Class } from '../types';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { modules } = useModules();
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    totalSessions: 0,
    activePrograms: 0,
  });
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
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

        // Combine upcoming bookings and sessions
        const upcomingBookings = bookingsRes.data
          .filter((b: Booking) => new Date(b.class.startTime) > new Date())
          .slice(0, 3)
          .map((b: Booking) => ({
            id: b.id,
            type: 'class',
            title: b.class.name,
            startTime: b.class.startTime,
            instructor: b.class.instructor,
            status: b.status,
          }));

        const upcomingSessions = sessionsRes.data
          .filter((s: PTSession) => s.startTime && new Date(s.startTime) > new Date())
          .slice(0, 3)
          .map((s: PTSession) => ({
            id: s.id,
            type: 'pt',
            title: 'PT-Økt',
            startTime: s.startTime,
            trainer: s.trainer,
            status: s.status,
          }));

        // Merge and sort by startTime
        const combined = [...upcomingBookings, ...upcomingSessions]
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 3);

        setUpcomingActivities(combined);
        setStats({
          upcomingBookings: bookingsRes.data.filter((b: Booking) =>
            new Date(b.class.startTime) > new Date()
          ).length,
          totalSessions: sessionsRes.data.filter((s: PTSession) =>
            s.startTime && new Date(s.startTime) > new Date()
          ).length,
          activePrograms: 0, // TODO: Fetch real data when training programs API is ready
        });
      } else if (user?.role === 'TRAINER' || user?.role === 'ADMIN') {
        const sessionsRes = await api.getPTSessions();
        const upcomingSessions = sessionsRes.data
          .filter((s: PTSession) => s.startTime && new Date(s.startTime) > new Date())
          .slice(0, 3)
          .map((s: PTSession) => ({
            id: s.id,
            type: 'pt',
            title: 'PT-Økt',
            startTime: s.startTime,
            trainer: s.trainer,
            status: s.status,
          }));

        setUpcomingActivities(upcomingSessions);
        setStats({
          upcomingBookings: 0,
          totalSessions: sessionsRes.data.filter((s: PTSession) =>
            s.startTime && new Date(s.startTime) > new Date()
          ).length,
          activePrograms: 0,
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
      enabled: modules.pt,
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
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        <Container>
          {/* Simple Header */}
          <View style={styles.header}>
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
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.gray[600]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards - Clean Metric Cards */}
          <View style={styles.statsGrid}>
            {modules.classes && (
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('Classes')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.primary[500]}
                  />
                </View>
                <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
                <Text style={styles.statLabel}>Bookinger</Text>
              </TouchableOpacity>
            )}

            {modules.pt && (
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('PTSessions')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="barbell-outline"
                    size={20}
                    color={theme.colors.accent.purple}
                  />
                </View>
                <Text style={styles.statValue}>{stats.totalSessions}</Text>
                <Text style={styles.statLabel}>PT-Økter</Text>
              </TouchableOpacity>
            )}

            {stats.activePrograms > 0 && (
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => navigation.navigate('TrainingPrograms')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="fitness-outline"
                    size={20}
                    color={theme.colors.success}
                  />
                </View>
                <Text style={styles.statValue}>{stats.activePrograms}</Text>
                <Text style={styles.statLabel}>Programmer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Activities - This Week Section */}
          {upcomingActivities.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Denne uken</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      modules.pt ? 'PTSessions' : 'Classes'
                    )
                  }
                >
                  <Text style={styles.seeAllText}>Se alle</Text>
                </TouchableOpacity>
              </View>

              {upcomingActivities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  onPress={() =>
                    navigation.navigate(
                      activity.type === 'pt' ? 'PTSessions' : 'Classes'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.activityIconCircle,
                      {
                        backgroundColor:
                          activity.type === 'pt'
                            ? theme.colors.accent.purple + '15'
                            : theme.colors.primary[500] + '15',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        activity.type === 'pt'
                          ? 'barbell-outline'
                          : 'calendar-outline'
                      }
                      size={20}
                      color={
                        activity.type === 'pt'
                          ? theme.colors.accent.purple
                          : theme.colors.primary[500]
                      }
                    />
                  </View>

                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <View style={styles.activityDetails}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={theme.colors.gray[500]}
                      />
                      <Text style={styles.activityDetailText}>
                        {formatDate(activity.startTime)} • {formatTime(activity.startTime)}
                      </Text>
                    </View>
                    {(activity.trainer || activity.instructor) && (
                      <View style={styles.activityDetails}>
                        <Ionicons
                          name="person-outline"
                          size={13}
                          color={theme.colors.gray[500]}
                        />
                        <Text style={styles.activityDetailText}>
                          {activity.trainer
                            ? `${activity.trainer.firstName} ${activity.trainer.lastName}`
                            : `${activity.instructor.firstName} ${activity.instructor.lastName}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.gray[400]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Actions - Clean Button Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hurtigvalg</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionButton}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={theme.colors.gray[700]}
                  />
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </Container>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 64 - 12) / 2,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    ...theme.shadows.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[500],
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
    gap: 5,
  },
  activityTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  activityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityDetailText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.text.secondary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    ...theme.shadows.sm,
  },
  quickActionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
});
