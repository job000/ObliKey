// Comprehensive Exercise Statistics Modal
// Data analyst-level visualizations for workout progress

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressLineChart } from './ProgressChart';
import {
  ExerciseLog,
  getWeightProgression,
  getVolumeProgression,
  getPersonalRecords,
  calculateTrend,
  calculateGrowthMetrics,
  getRecentSessionsData,
  generateSmartInsights,
  calculateOneRepMax,
} from '../../utils/exerciseStats';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#8B9BDE',
  primaryLight: '#A8B8E6',
  success: '#10B981',
  successLight: '#34D399',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
};

interface ExerciseStatisticsModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  exerciseLogs: ExerciseLog[];
  loading?: boolean;
}

export const ExerciseStatisticsModal: React.FC<ExerciseStatisticsModalProps> = ({
  visible,
  onClose,
  exerciseId,
  exerciseName,
  exerciseLogs,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'records' | 'history'>('progress');

  // Calculate all statistics
  const weightData = getWeightProgression(exerciseLogs);
  const volumeData = getVolumeProgression(exerciseLogs);
  const personalRecords = getPersonalRecords(exerciseLogs);
  const growthMetrics = calculateGrowthMetrics(exerciseLogs);
  const recentSessions = getRecentSessionsData(exerciseLogs, 10);
  const insights = generateSmartInsights(exerciseLogs, exerciseName);

  const weightTrend = calculateTrend(weightData);
  const volumeTrend = calculateTrend(volumeData);

  // Calculate best 1RM
  const best1RM = personalRecords.length > 0
    ? Math.max(...personalRecords.map(pr => pr.oneRepMax))
    : 0;

  const renderTrendIndicator = (trend: { direction: string; percentage: number; label: string }) => {
    const icon = trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'remove';
    const color = trend.direction === 'up' ? COLORS.success : trend.direction === 'down' ? COLORS.danger : COLORS.textSecondary;

    return (
      <View style={styles.trendContainer}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.trendText, { color }]}>{trend.label}</Text>
      </View>
    );
  };

  const renderMetricCard = (title: string, value: string, subtitle?: string, trend?: any) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend && renderTrendIndicator(trend)}
    </View>
  );

  const renderProgressTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Smart Insights */}
      <View style={styles.insightsContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color={COLORS.warning} />
          <Text style={styles.sectionTitle}>Smart Insights</Text>
        </View>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {growthMetrics && (
          <>
            {renderMetricCard(
              'Total Weight Gain',
              `${growthMetrics.totalWeightGain > 0 ? '+' : ''}${growthMetrics.totalWeightGain.toFixed(1)} kg`,
              `${growthMetrics.weightGainPercent.toFixed(0)}% improvement`
            )}
            {renderMetricCard(
              'Volume Growth',
              `${growthMetrics.totalVolumeGain > 0 ? '+' : ''}${growthMetrics.totalVolumeGain.toFixed(0)} kg`,
              `${growthMetrics.volumeGainPercent.toFixed(0)}% increase`
            )}
          </>
        )}
        {renderMetricCard(
          'Estimated 1RM',
          `${best1RM.toFixed(0)} kg`,
          'Based on best sets'
        )}
        {renderMetricCard(
          'Total Sessions',
          `${exerciseLogs.length}`,
          'Logged workouts'
        )}
      </View>

      {/* Weight Progression Chart */}
      {weightData.length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weight Progression</Text>
            {renderTrendIndicator(weightTrend)}
          </View>
          <ProgressLineChart
            data={weightData}
            title=""
            color={COLORS.primary}
            suffix=" kg"
          />
        </View>
      )}

      {/* Volume Progression Chart */}
      {volumeData.length > 0 && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Volume Progression</Text>
            {renderTrendIndicator(volumeTrend)}
          </View>
          <ProgressLineChart
            data={volumeData}
            title=""
            color={COLORS.success}
            suffix=" kg"
          />
        </View>
      )}
    </ScrollView>
  );

  const renderRecordsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy" size={20} color={COLORS.warning} />
        <Text style={styles.sectionTitle}>Personal Records</Text>
      </View>

      {personalRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No PRs yet - keep training!</Text>
        </View>
      ) : (
        personalRecords.reverse().map((pr, index) => (
          <View key={index} style={styles.prCard}>
            <View style={styles.prIconContainer}>
              <Ionicons name="trophy" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.prContent}>
              <View style={styles.prHeader}>
                <Text style={styles.prWeight}>{pr.weight} kg × {pr.reps} reps</Text>
                <Text style={styles.prDate}>
                  {pr.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.prStats}>
                <View style={styles.prStat}>
                  <Text style={styles.prStatLabel}>Volume</Text>
                  <Text style={styles.prStatValue}>{pr.volume.toFixed(0)} kg</Text>
                </View>
                <View style={styles.prStat}>
                  <Text style={styles.prStatLabel}>Est. 1RM</Text>
                  <Text style={styles.prStatValue}>{pr.oneRepMax.toFixed(0)} kg</Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Ionicons name="list" size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Last 10 Sessions</Text>
      </View>

      {recentSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No sessions logged yet</Text>
        </View>
      ) : (
        recentSessions.map((session, index) => (
          <View key={index} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDate}>
                {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionBadgeText}>{session.sets} sets</Text>
              </View>
            </View>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Ionicons name="barbell-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.sessionStatText}>{session.maxWeight.toFixed(1)} kg</Text>
              </View>
              <View style={styles.sessionStat}>
                <Ionicons name="repeat-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.sessionStatText}>{session.reps} reps</Text>
              </View>
              <View style={styles.sessionStat}>
                <Ionicons name="trending-up-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.sessionStatText}>{session.volume.toFixed(0)} kg vol</Text>
              </View>
            </View>
            {/* Detailed sets */}
            <View style={styles.setsContainer}>
              {session.setLogs.map((set, setIndex) => (
                <View key={setIndex} style={styles.setDetail}>
                  <Text style={styles.setNumber}>Set {set.setNumber}</Text>
                  <Text style={styles.setText}>
                    {set.weight?.toFixed(1) || 0} kg × {set.reps || 0}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{exerciseName}</Text>
              <Text style={styles.headerSubtitle}>Exercise Statistics</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
            onPress={() => setActiveTab('progress')}
          >
            <Ionicons
              name="trending-up"
              size={20}
              color={activeTab === 'progress' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
              Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'records' && styles.activeTab]}
            onPress={() => setActiveTab('records')}
          >
            <Ionicons
              name="trophy"
              size={20}
              color={activeTab === 'records' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'records' && styles.activeTabText]}>
              PRs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="list"
              size={20}
              color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        ) : exerciseLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Start logging this exercise to see detailed statistics and insights!
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'progress' && renderProgressTab()}
            {activeTab === 'records' && renderRecordsTab()}
            {activeTab === 'history' && renderHistoryTab()}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerSpacer: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  insightsContainer: {
    marginBottom: 25,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prCard: {
    flexDirection: 'row',
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
  prIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  prContent: {
    flex: 1,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  prStats: {
    flexDirection: 'row',
    gap: 20,
  },
  prStat: {
    flex: 1,
  },
  prStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  prStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sessionBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  setsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 6,
  },
  setDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setNumber: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  setText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
});
