// Reusable chart components for workout statistics
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { ProgressDataPoint, formatChartDate } from '../../utils/exerciseStats';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#8B9BDE',
  success: '#10B981',
  danger: '#EF4444',
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
};

interface ProgressLineChartProps {
  data: ProgressDataPoint[];
  title: string;
  color?: string;
  suffix?: string;
}

export const ProgressLineChart: React.FC<ProgressLineChartProps> = ({
  data,
  title,
  color = COLORS.primary,
  suffix = ''
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: data.map(d => formatChartDate(d.date)),
    datasets: [
      {
        data: data.map(d => d.value),
        color: (opacity = 1) => color,
        strokeWidth: 3
      }
    ]
  };

  // Show max 7 labels to avoid overcrowding
  if (chartData.labels.length > 7) {
    const step = Math.ceil(chartData.labels.length / 7);
    chartData.labels = chartData.labels.map((label, i) =>
      i % step === 0 ? label : ''
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={chartData}
        width={width - 60}
        height={200}
        chartConfig={{
          backgroundColor: COLORS.cardBg,
          backgroundGradientFrom: COLORS.cardBg,
          backgroundGradientTo: COLORS.cardBg,
          decimalPlaces: 1,
          color: (opacity = 1) => color,
          labelColor: (opacity = 1) => COLORS.textSecondary,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: color
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: COLORS.border,
            strokeWidth: 1
          }
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withDots={true}
        withShadow={false}
        fromZero={false}
      />
    </View>
  );
};

interface ProgressBarChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
}

export const ProgressBarChart: React.FC<ProgressBarChartProps> = ({
  data,
  title,
  color = COLORS.success
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.value)
      }
    ]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <BarChart
        data={chartData}
        width={width - 60}
        height={200}
        chartConfig={{
          backgroundColor: COLORS.cardBg,
          backgroundGradientFrom: COLORS.cardBg,
          backgroundGradientTo: COLORS.cardBg,
          decimalPlaces: 0,
          color: (opacity = 1) => color,
          labelColor: (opacity = 1) => COLORS.textSecondary,
          style: {
            borderRadius: 16
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: COLORS.border,
            strokeWidth: 1
          }
        }}
        style={styles.chart}
        withInnerLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={true}
        showValuesOnTopOfBars={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  }
});
