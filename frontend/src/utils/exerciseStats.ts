// Exercise Statistics Utilities
// Data analyst-level calculations for workout progress tracking

export interface SetLog {
  setNumber: number;
  reps?: number;
  weight?: number;
  weightUnit: string;
  duration?: number;
  distance?: number;
  completed: boolean;
  createdAt?: string;
}

export interface ExerciseLog {
  id: string;
  customExerciseId: string;
  completedAt: string;
  setLogs: SetLog[];
  session?: {
    startedAt: string;
    completedAt?: string;
  };
}

export interface ProgressDataPoint {
  date: Date;
  value: number;
  label: string;
}

export interface PersonalRecord {
  date: Date;
  weight: number;
  reps: number;
  volume: number;
  oneRepMax: number;
}

export interface TrendIndicator {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  label: string;
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  totalVolume: number;
  sessions: number;
  exercises: string[];
}

// Calculate 1RM using Epley formula: weight × (1 + reps/30)
export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

// Calculate total volume (weight × reps) for a set
export const calculateSetVolume = (set: SetLog): number => {
  if (!set.weight || !set.reps) return 0;
  return set.weight * set.reps;
};

// Get weight progression data points
export const getWeightProgression = (logs: ExerciseLog[]): ProgressDataPoint[] => {
  return logs
    .map(log => {
      const maxWeight = Math.max(...log.setLogs.map(set => set.weight || 0));
      return {
        date: new Date(log.session?.startedAt || log.completedAt),
        value: maxWeight,
        label: maxWeight.toFixed(1) + ' kg'
      };
    })
    .reverse();
};

// Get volume progression (weight × reps total)
export const getVolumeProgression = (logs: ExerciseLog[]): ProgressDataPoint[] => {
  return logs
    .map(log => {
      const totalVolume = log.setLogs.reduce((sum, set) => sum + calculateSetVolume(set), 0);
      return {
        date: new Date(log.session?.startedAt || log.completedAt),
        value: totalVolume,
        label: totalVolume.toFixed(0) + ' kg'
      };
    })
    .reverse();
};

// Get personal records over time
export const getPersonalRecords = (logs: ExerciseLog[]): PersonalRecord[] => {
  const records: PersonalRecord[] = [];
  let maxOneRM = 0;

  logs.forEach(log => {
    log.setLogs.forEach(set => {
      if (set.weight && set.reps) {
        const oneRM = calculateOneRepMax(set.weight, set.reps);
        if (oneRM > maxOneRM) {
          maxOneRM = oneRM;
          records.push({
            date: new Date(log.session?.startedAt || log.completedAt),
            weight: set.weight,
            reps: set.reps,
            volume: calculateSetVolume(set),
            oneRepMax: oneRM
          });
        }
      }
    });
  });

  return records;
};

// Calculate trend indicator (comparing recent vs previous period)
export const calculateTrend = (
  dataPoints: ProgressDataPoint[],
  recentPeriod: number = 5
): TrendIndicator => {
  if (dataPoints.length < 2) {
    return { direction: 'stable', percentage: 0, label: 'Not enough data' };
  }

  const recent = dataPoints.slice(-recentPeriod);
  const previous = dataPoints.slice(-(recentPeriod * 2), -recentPeriod);

  if (previous.length === 0) {
    return { direction: 'stable', percentage: 0, label: 'Tracking...' };
  }

  const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
  const previousAvg = previous.reduce((sum, p) => sum + p.value, 0) / previous.length;

  const change = ((recentAvg - previousAvg) / previousAvg) * 100;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(change) < 2) direction = 'stable';
  else if (change > 0) direction = 'up';
  else direction = 'down';

  return {
    direction,
    percentage: Math.abs(change),
    label: `${direction === 'up' ? '+' : direction === 'down' ? '-' : ''}${Math.abs(change).toFixed(1)}%`
  };
};

// Calculate growth metrics
export const calculateGrowthMetrics = (logs: ExerciseLog[]) => {
  if (logs.length < 2) return null;

  const first = logs[logs.length - 1]; // Oldest
  const last = logs[0]; // Most recent

  const firstMaxWeight = Math.max(...first.setLogs.map(s => s.weight || 0));
  const lastMaxWeight = Math.max(...last.setLogs.map(s => s.weight || 0));

  const firstVolume = first.setLogs.reduce((sum, s) => sum + calculateSetVolume(s), 0);
  const lastVolume = last.setLogs.reduce((sum, s) => sum + calculateSetVolume(s), 0);

  const weightGain = lastMaxWeight - firstMaxWeight;
  const weightGainPercent = firstMaxWeight > 0 ? (weightGain / firstMaxWeight) * 100 : 0;

  const volumeGain = lastVolume - firstVolume;
  const volumeGainPercent = firstVolume > 0 ? (volumeGain / firstVolume) * 100 : 0;

  return {
    totalWeightGain: weightGain,
    weightGainPercent,
    totalVolumeGain: volumeGain,
    volumeGainPercent,
    totalSessions: logs.length
  };
};

// Format date for chart labels
export const formatChartDate = (date: Date): string => {
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
};

// Get last N sessions data for table view
export const getRecentSessionsData = (logs: ExerciseLog[], limit: number = 10) => {
  return logs.slice(0, limit).map(log => {
    const maxWeight = Math.max(...log.setLogs.map(s => s.weight || 0));
    const totalReps = log.setLogs.reduce((sum, s) => sum + (s.reps || 0), 0);
    const totalVolume = log.setLogs.reduce((sum, s) => sum + calculateSetVolume(s), 0);
    const sets = log.setLogs.length;

    return {
      date: new Date(log.session?.startedAt || log.completedAt),
      sets,
      reps: totalReps,
      maxWeight,
      volume: totalVolume,
      setLogs: log.setLogs
    };
  });
};

// Generate smart insights based on data
export const generateSmartInsights = (logs: ExerciseLog[], exerciseName: string): string[] => {
  const insights: string[] = [];

  if (logs.length === 0) {
    return ['Start logging this exercise to see insights!'];
  }

  // Growth insights
  const growth = calculateGrowthMetrics(logs);
  if (growth) {
    if (growth.weightGainPercent > 10) {
      insights.push(`${exerciseName} strength improved ${growth.weightGainPercent.toFixed(0)}% since you started!`);
    }
    if (growth.totalWeightGain > 5) {
      insights.push(`You've added ${growth.totalWeightGain.toFixed(1)}kg to your ${exerciseName}!`);
    }
  }

  // Volume trend
  const volumeData = getVolumeProgression(logs);
  const volumeTrend = calculateTrend(volumeData);
  if (volumeTrend.direction === 'up' && volumeTrend.percentage > 5) {
    insights.push(`Volume is ${volumeTrend.percentage.toFixed(0)}% higher than before - great progress!`);
  }

  // PR detection
  const prs = getPersonalRecords(logs);
  const recentPRs = prs.filter(pr => {
    const daysSince = (Date.now() - pr.date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });
  if (recentPRs.length > 0) {
    insights.push(`You hit a PR this week - ${recentPRs[0].weight}kg for ${recentPRs[0].reps} reps!`);
  }

  // Consistency
  if (logs.length >= 10) {
    insights.push(`${logs.length} sessions logged - your consistency is paying off!`);
  }

  // 1RM milestone
  const best1RM = Math.max(...prs.map(pr => pr.oneRepMax));
  if (best1RM > 100) {
    insights.push(`Estimated 1RM: ${best1RM.toFixed(0)}kg - impressive strength!`);
  }

  return insights.length > 0 ? insights : ['Keep training to unlock insights!'];
};

// Muscle group data (mapping exercises to muscle groups)
export const MUSCLE_GROUPS = {
  chest: ['Bench Press', 'Chest Press', 'Push Up', 'Dumbbell Fly', 'Cable Fly'],
  back: ['Pull Up', 'Row', 'Lat Pulldown', 'Deadlift', 'Back Extension'],
  legs: ['Squat', 'Leg Press', 'Lunge', 'Leg Curl', 'Leg Extension', 'Calf Raise'],
  shoulders: ['Shoulder Press', 'Lateral Raise', 'Front Raise', 'Reverse Fly'],
  arms: ['Bicep Curl', 'Tricep', 'Hammer Curl', 'Preacher Curl'],
  core: ['Plank', 'Crunch', 'Sit Up', 'Ab Wheel', 'Russian Twist']
};

export const identifyMuscleGroup = (exerciseName: string): string => {
  const name = exerciseName.toLowerCase();

  for (const [group, exercises] of Object.entries(MUSCLE_GROUPS)) {
    if (exercises.some(ex => name.includes(ex.toLowerCase()))) {
      return group;
    }
  }

  return 'other';
};

// Calculate rest day recommendation
export const getRestRecommendation = (recentVolume: number, avgVolume: number): string => {
  if (recentVolume > avgVolume * 1.5) {
    return 'High volume detected - consider a rest day or deload';
  } else if (recentVolume < avgVolume * 0.5) {
    return 'Volume is low - good time to push harder or add exercises';
  }
  return 'Volume is balanced - keep up the good work!';
};
