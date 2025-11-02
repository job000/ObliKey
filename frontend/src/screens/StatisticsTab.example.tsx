// Example Statistics Tab Component
// This can be added as a new tab in WorkoutScreen or used as a standalone screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ExerciseStatisticsModal } from '../components/workout/ExerciseStatisticsModal';
import { MuscleGroupAnalytics } from '../components/workout/MuscleGroupAnalytics';
import { ProgressLineChart } from '../components/workout/ProgressChart';
import { api } from '../services/api';
import { ExerciseLog, getVolumeProgression, calculateTrend } from '../utils/exerciseStats';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#8B9BDE',
  primaryLight: '#A8B8E6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
};

export const StatisticsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [customExercises, setCustomExercises] = useState<any[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('month');

  // Statistics modal state
  const [showExerciseStats, setShowExerciseStats] = useState(false);
  const [selectedExerciseForStats, setSelectedExerciseForStats] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [exerciseStatsLogs, setExerciseStatsLogs] = useState<ExerciseLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedTimeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, exercisesRes] = await Promise.all([
        api.getWorkoutSessions(),
        api.getCustomExercises(),
      ]);

      if (sessionsRes.success) {
        setSessions(sessionsRes.data || []);
      }
      if (exercisesRes.success) {
        setCustomExercises(exercisesRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const openExerciseStats = async (exerciseId: string, exerciseName: string) => {
    try {
      setSelectedExerciseForStats({ id: exerciseId, name: exerciseName });
      setShowExerciseStats(true);
      setStatsLoading(true);

      const response = await api.getExerciseProgress(exerciseId);
      if (response.success) {
        setExerciseStatsLogs(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load exercise stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const closeExerciseStats = () => {
    setShowExerciseStats(false);
    setSelectedExerciseForStats(null);
    setExerciseStatsLogs([]);
  };

  // Transform sessions into muscle group analytics format
  const transformedExerciseLogs = () => {
    const logsByExercise: { [exerciseId: string]: { name: string; logs: ExerciseLog[] } } = {};

    sessions.forEach(session => {
      session.exerciseLogs?.forEach((log: any) => {
        const exerciseId = log.customExerciseId;
        const exerciseName = log.customExercise?.name || 'Unknown';

        if (!logsByExercise[exerciseId]) {
          logsByExercise[exerciseId] = {
            name: exerciseName,
            logs: []
          };
        }

        logsByExercise[exerciseId].logs.push({
          id: log.id,
          customExerciseId: exerciseId,
          completedAt: log.completedAt,
          setLogs: log.setLogs || [],
          session: {
            startedAt: session.startedAt,
            completedAt: session.completedAt
          }
        });
      });
    });

    return logsByExercise;
  };

  // Calculate overall statistics
  const calculateOverallStats = () => {
    const completedSessions = sessions.filter(s => s.completedAt);
    const totalVolume = completedSessions.reduce((sum, session) => {
      return sum + (session.exerciseLogs?.reduce((exerciseSum: number, log: any) => {
        return exerciseSum + (log.setLogs?.reduce((setSum: number, set: any) => {
          return setSum + ((set.weight || 0) * (set.reps || 0));
        }, 0) || 0);
      }, 0) || 0);
    }, 0);

    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;

    return {
      totalSessions: completedSessions.length,
      totalVolume,
      avgDuration: Math.floor(avgDuration / 60), // Convert to minutes
      totalExercises: customExercises.length
    };
  };

  const stats = calculateOverallStats();
  const exerciseLogs = transformedExerciseLogs();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Workout Statistics</Text>
        <Text style={styles.headerSubtitle}>Track your progress and insights</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['week', 'month', 'all'] as const).map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                selectedTimeRange === range && styles.timeRangeButtonActive
              ]}
              onPress={() => setSelectedTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                selectedTimeRange === range && styles.timeRangeTextActive
              ]}>
                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="barbell" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{(stats.totalVolume / 1000).toFixed(1)}k</Text>
            <Text style={styles.statLabel}>Total Volume (kg)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.avgDuration}</Text>
            <Text style={styles.statLabel}>Avg Duration (min)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="fitness" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.statValue}>{stats.totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Muscle Group Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Muscle Group Distribution</Text>
          </View>
          <MuscleGroupAnalytics
            exerciseLogs={exerciseLogs}
            timeRange={selectedTimeRange}
          />
        </View>

        {/* Top Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Your Exercises</Text>
          </View>
          {customExercises.slice(0, 10).map((exercise) => {
            const exerciseLogs = sessions
              .flatMap(s => s.exerciseLogs || [])
              .filter((log: any) => log.customExerciseId === exercise.id);

            const totalSessions = exerciseLogs.length;
            const totalVolume = exerciseLogs.reduce((sum: number, log: any) => {
              return sum + (log.setLogs?.reduce((setSum: number, set: any) => {
                return setSum + ((set.weight || 0) * (set.reps || 0));
              }, 0) || 0);
            }, 0);

            return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => openExerciseStats(exercise.id, exercise.name)}
              >
                <View style={styles.exerciseIconContainer}>
                  <Ionicons name="barbell-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseStats}>
                    <Text style={styles.exerciseStat}>{totalSessions} sessions</Text>
                    <Text style={styles.exerciseStat}>•</Text>
                    <Text style={styles.exerciseStat}>{(totalVolume / 1000).toFixed(1)}k kg</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Exercise Statistics Modal */}
      <ExerciseStatisticsModal
        visible={showExerciseStats}
        onClose={closeExerciseStats}
        exerciseId={selectedExerciseForStats?.id || ''}
        exerciseName={selectedExerciseForStats?.name || ''}
        exerciseLogs={exerciseStatsLogs}
        loading={statsLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRangeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseStat: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
