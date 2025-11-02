// Muscle Group Analytics Component
// Shows volume distribution and balance across muscle groups

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBarChart } from './ProgressChart';
import { identifyMuscleGroup, calculateSetVolume, ExerciseLog } from '../../utils/exerciseStats';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#8B9BDE',
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

const MUSCLE_GROUP_COLORS: { [key: string]: string } = {
  chest: '#EF4444',
  back: '#10B981',
  legs: '#8B9BDE',
  shoulders: '#F59E0B',
  arms: '#8B5CF6',
  core: '#EC4899',
  other: '#6B7280',
};

const MUSCLE_GROUP_ICONS: { [key: string]: any } = {
  chest: 'body-outline',
  back: 'fitness-outline',
  legs: 'walk-outline',
  shoulders: 'barbell-outline',
  arms: 'hand-left-outline',
  core: 'star-outline',
  other: 'ellipsis-horizontal-outline',
};

interface MuscleGroupData {
  muscleGroup: string;
  totalVolume: number;
  sessions: number;
  exercises: Set<string>;
  percentage: number;
}

interface MuscleGroupAnalyticsProps {
  exerciseLogs: { [exerciseId: string]: { name: string; logs: ExerciseLog[] } };
  timeRange?: 'week' | 'month' | 'all';
}

export const MuscleGroupAnalytics: React.FC<MuscleGroupAnalyticsProps> = ({
  exerciseLogs,
  timeRange = 'month'
}) => {
  // Calculate cutoff date based on time range
  const getCutoffDate = () => {
    const now = new Date();
    if (timeRange === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return new Date(0); // All time
  };

  const cutoffDate = getCutoffDate();

  // Aggregate data by muscle group
  const muscleGroupMap = new Map<string, MuscleGroupData>();

  Object.entries(exerciseLogs).forEach(([exerciseId, { name, logs }]) => {
    const muscleGroup = identifyMuscleGroup(name);

    // Filter logs by time range
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.session?.startedAt || log.completedAt);
      return logDate >= cutoffDate;
    });

    if (filteredLogs.length === 0) return;

    // Calculate total volume for this exercise
    const totalVolume = filteredLogs.reduce((sum, log) => {
      return sum + log.setLogs.reduce((setSum, set) => setSum + calculateSetVolume(set), 0);
    }, 0);

    if (!muscleGroupMap.has(muscleGroup)) {
      muscleGroupMap.set(muscleGroup, {
        muscleGroup,
        totalVolume: 0,
        sessions: 0,
        exercises: new Set(),
        percentage: 0,
      });
    }

    const data = muscleGroupMap.get(muscleGroup)!;
    data.totalVolume += totalVolume;
    data.sessions += filteredLogs.length;
    data.exercises.add(name);
  });

  // Convert to array and calculate percentages
  const muscleGroupData = Array.from(muscleGroupMap.values());
  const totalVolume = muscleGroupData.reduce((sum, data) => sum + data.totalVolume, 0);

  muscleGroupData.forEach(data => {
    data.percentage = totalVolume > 0 ? (data.totalVolume / totalVolume) * 100 : 0;
  });

  // Sort by volume
  muscleGroupData.sort((a, b) => b.totalVolume - a.totalVolume);

  // Check for muscle imbalances
  const getMuscleBalanceInsights = (): string[] => {
    const insights: string[] = [];

    const chestData = muscleGroupData.find(d => d.muscleGroup === 'chest');
    const backData = muscleGroupData.find(d => d.muscleGroup === 'back');

    if (chestData && backData) {
      const ratio = chestData.totalVolume / backData.totalVolume;
      if (ratio > 1.5) {
        insights.push('Chest volume is significantly higher than back - consider more back work for balance');
      } else if (ratio < 0.67) {
        insights.push('Back volume is significantly higher than chest - consider more chest work for balance');
      }
    }

    const legsData = muscleGroupData.find(d => d.muscleGroup === 'legs');
    const upperBodyVolume = muscleGroupData
      .filter(d => ['chest', 'back', 'shoulders', 'arms'].includes(d.muscleGroup))
      .reduce((sum, d) => sum + d.totalVolume, 0);

    if (legsData && upperBodyVolume > 0) {
      const legRatio = legsData.totalVolume / upperBodyVolume;
      if (legRatio < 0.3) {
        insights.push('Leg volume is low compared to upper body - never skip leg day!');
      }
    }

    // Find dominant muscle group
    if (muscleGroupData.length > 0 && muscleGroupData[0].percentage > 40) {
      insights.push(`${muscleGroupData[0].muscleGroup.charAt(0).toUpperCase() + muscleGroupData[0].muscleGroup.slice(1)} dominant (${muscleGroupData[0].percentage.toFixed(0)}%) - diversify for balanced development`);
    }

    if (insights.length === 0) {
      insights.push('Muscle groups are well balanced - great programming!');
    }

    return insights;
  };

  const balanceInsights = getMuscleBalanceInsights();

  if (muscleGroupData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.emptyText}>No workout data in this period</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Balance Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Balance Insights</Text>
        </View>
        {balanceInsights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <Ionicons
              name={insight.includes('balance') || insight.includes('well') ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={insight.includes('balance') || insight.includes('well') ? COLORS.success : COLORS.warning}
            />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>

      {/* Muscle Group Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Volume Distribution</Text>
        </View>

        {muscleGroupData.map((data, index) => {
          const color = MUSCLE_GROUP_COLORS[data.muscleGroup] || COLORS.textSecondary;
          const icon = MUSCLE_GROUP_ICONS[data.muscleGroup] || 'ellipsis-horizontal-outline';

          return (
            <View key={index} style={styles.muscleGroupCard}>
              <View style={styles.muscleGroupHeader}>
                <View style={styles.muscleGroupTitleContainer}>
                  <View style={[styles.muscleGroupIcon, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <Text style={styles.muscleGroupName}>
                    {data.muscleGroup.charAt(0).toUpperCase() + data.muscleGroup.slice(1)}
                  </Text>
                </View>
                <Text style={styles.muscleGroupPercentage}>{data.percentage.toFixed(0)}%</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${data.percentage}%`, backgroundColor: color }]} />
              </View>

              {/* Stats */}
              <View style={styles.muscleGroupStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Volume</Text>
                  <Text style={styles.statValue}>{(data.totalVolume / 1000).toFixed(1)}k kg</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sessions</Text>
                  <Text style={styles.statValue}>{data.sessions}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Exercises</Text>
                  <Text style={styles.statValue}>{data.exercises.size}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Weekly Comparison Chart */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={COLORS.success} />
          <Text style={styles.sectionTitle}>Volume by Muscle Group</Text>
        </View>
        <ProgressBarChart
          data={muscleGroupData.slice(0, 6).map(d => ({
            label: d.muscleGroup.substring(0, 4).toUpperCase(),
            value: d.totalVolume
          }))}
          title=""
          color={COLORS.primary}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  muscleGroupCard: {
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  muscleGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  muscleGroupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muscleGroupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  muscleGroupPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  muscleGroupStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
});
