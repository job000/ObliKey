import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';
import { prisma } from '../utils/prisma';

interface ExerciseDataPoint {
  date: Date;
  weight: number;
  reps: number;
  volume: number;
  oneRepMax: number;
}

interface PredictionResult {
  prediction: number;
  confidence: number;
  errorBound: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface OptimalSetsResult {
  recommendedSets: number;
  recommendedReps: number;
  estimatedWeight: number;
  confidence: number;
  reasoning: string;
}

interface OptimalTimeResult {
  bestHour: number;
  bestDayOfWeek: number;
  averagePerformanceByHour: { hour: number; avgVolume: number; count: number }[];
  confidence: number;
}

interface ProgressionAnalysis {
  velocityPerWeek: number;
  currentOneRepMax: number;
  predictedOneRepMaxIn4Weeks: number;
  predictedOneRepMaxIn8Weeks: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export class WorkoutPredictionService {
  private readonly MIN_DATA_POINTS = 5;
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Calculate one-rep max using Epley formula
   */
  private calculateOneRepMax(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(
    dataPoints: number,
    rSquared: number,
    recency: number
  ): number {
    // Data quantity score (0-1): More data = higher confidence
    const quantityScore = Math.min(dataPoints / 20, 1);

    // Model fit score (R²): How well the model fits the data
    const fitScore = Math.max(0, rSquared);

    // Recency score (0-1): More recent data = higher confidence
    const recencyScore = Math.min(recency / 30, 1);

    // Weighted average
    return (quantityScore * 0.3 + fitScore * 0.5 + recencyScore * 0.2);
  }

  /**
   * Prepare exercise data from database records
   */
  private async prepareExerciseData(
    customExerciseId: string,
    userId: string,
    tenantId: string
  ): Promise<ExerciseDataPoint[]> {
    // Fetch exercise logs with sets
    const exerciseLogs = await prisma.workoutExerciseLog.findMany({
      where: {
        customExerciseId,
        session: {
          userId,
          tenantId,
          completedAt: { not: null }
        }
      },
      include: {
        setLogs: {
          orderBy: { setNumber: 'asc' }
        },
        session: {
          select: {
            completedAt: true
          }
        }
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    // Transform to data points
    const dataPoints: ExerciseDataPoint[] = [];

    for (const log of exerciseLogs) {
      const completedAt = log.session.completedAt;
      if (!completedAt || log.setLogs.length === 0) continue;

      // Calculate metrics from all sets
      let totalVolume = 0;
      let maxOneRepMax = 0;
      let totalReps = 0;
      let avgWeight = 0;
      let validSets = 0;

      for (const set of log.setLogs) {
        if (set.weight && set.reps && set.completed) {
          const weight = set.weight;
          const reps = set.reps;

          totalVolume += weight * reps;
          totalReps += reps;
          avgWeight += weight;
          validSets++;

          const oneRepMax = this.calculateOneRepMax(weight, reps);
          if (oneRepMax > maxOneRepMax) {
            maxOneRepMax = oneRepMax;
          }
        }
      }

      if (validSets > 0) {
        dataPoints.push({
          date: completedAt,
          weight: avgWeight / validSets,
          reps: Math.round(totalReps / validSets),
          volume: totalVolume,
          oneRepMax: maxOneRepMax
        });
      }
    }

    return dataPoints;
  }

  /**
   * Predict maximum lift (1RM) progression
   */
  async predictMaxLift(
    customExerciseId: string,
    userId: string,
    tenantId: string
  ): Promise<PredictionResult | null> {
    const dataPoints = await this.prepareExerciseData(
      customExerciseId,
      userId,
      tenantId
    );

    if (dataPoints.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Prepare data for regression (days since first workout, 1RM)
    const firstDate = dataPoints[0].date.getTime();
    const x = dataPoints.map(dp =>
      (dp.date.getTime() - firstDate) / (1000 * 60 * 60 * 24) // days
    );
    const y = dataPoints.map(dp => dp.oneRepMax);

    // Try both linear and polynomial regression, use best fit
    const linearModel = new SimpleLinearRegression(x, y);
    const polyModel = new PolynomialRegression(x, y, 2);

    const linearR2 = linearModel.score(x, y).r2;
    const polyR2 = polyModel.score(x, y).r2;

    const useLinear = linearR2 > polyR2 || polyR2 < 0.5;
    const model = useLinear ? linearModel : polyModel;
    const rSquared = useLinear ? linearR2 : polyR2;

    // Predict 4 weeks from now
    const lastDate = dataPoints[dataPoints.length - 1].date.getTime();
    const daysSinceFirst = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const predictDays = daysSinceFirst + 28; // 4 weeks

    const prediction = model.predict(predictDays);

    // Calculate recency (days since last workout)
    const recency = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);

    const confidence = this.calculateConfidence(
      dataPoints.length,
      rSquared,
      30 - recency
    );

    // Calculate error bound (standard deviation of residuals)
    const predictions = x.map(xi => model.predict(xi));
    const residuals = y.map((yi, i) => yi - predictions[i]);
    const stdDev = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
    );
    const errorBound = stdDev * 1.96; // 95% confidence interval

    // Determine trend
    const recentData = dataPoints.slice(-5);
    const trend = recentData.length >= 2
      ? recentData[recentData.length - 1].oneRepMax > recentData[0].oneRepMax
        ? 'increasing'
        : recentData[recentData.length - 1].oneRepMax < recentData[0].oneRepMax
        ? 'decreasing'
        : 'stable'
      : 'stable';

    return {
      prediction: Math.max(0, prediction),
      confidence,
      errorBound,
      trend: trend as 'increasing' | 'decreasing' | 'stable'
    };
  }

  /**
   * Predict optimal sets and reps based on historical performance
   */
  async predictOptimalSets(
    customExerciseId: string,
    userId: string,
    tenantId: string
  ): Promise<OptimalSetsResult | null> {
    const dataPoints = await this.prepareExerciseData(
      customExerciseId,
      userId,
      tenantId
    );

    if (dataPoints.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Analyze volume trends
    const recentWorkouts = dataPoints.slice(-10);

    // Calculate average sets from exercise logs
    const exerciseLogs = await prisma.workoutExerciseLog.findMany({
      where: {
        customExerciseId,
        session: {
          userId,
          tenantId,
          completedAt: { not: null }
        }
      },
      include: {
        setLogs: {
          where: { completed: true }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 10
    });

    const setSizes = exerciseLogs.map(log => log.setLogs.length).filter(s => s > 0);
    const avgSets = setSizes.length > 0
      ? Math.round(setSizes.reduce((a, b) => a + b, 0) / setSizes.length)
      : 3;

    // Find optimal rep range (where they perform best)
    const repRanges: { [key: string]: { volume: number; count: number } } = {};
    for (const dp of recentWorkouts) {
      const range = dp.reps <= 5 ? '1-5' : dp.reps <= 8 ? '6-8' : dp.reps <= 12 ? '9-12' : '13+';
      if (!repRanges[range]) {
        repRanges[range] = { volume: 0, count: 0 };
      }
      repRanges[range].volume += dp.volume;
      repRanges[range].count++;
    }

    let bestRange = '9-12';
    let bestAvgVolume = 0;
    for (const [range, data] of Object.entries(repRanges)) {
      const avgVolume = data.volume / data.count;
      if (avgVolume > bestAvgVolume) {
        bestAvgVolume = avgVolume;
        bestRange = range;
      }
    }

    const recommendedReps = bestRange === '1-5' ? 5 : bestRange === '6-8' ? 8 : bestRange === '9-12' ? 10 : 15;

    // Estimate weight based on recent performance
    const recentAvgWeight = recentWorkouts.reduce((sum, dp) => sum + dp.weight, 0) / recentWorkouts.length;
    const estimatedWeight = Math.round(recentAvgWeight * 2) / 2; // Round to nearest 0.5

    const confidence = Math.min(dataPoints.length / 15, 1) * 0.85;

    return {
      recommendedSets: avgSets,
      recommendedReps,
      estimatedWeight,
      confidence,
      reasoning: `Based on ${dataPoints.length} workouts, you perform best with ${recommendedReps} reps (${bestRange} range). Average sets: ${avgSets}.`
    };
  }

  /**
   * Analyze best training times based on performance
   */
  async predictOptimalTrainingTime(
    userId: string,
    tenantId: string
  ): Promise<OptimalTimeResult | null> {
    // Fetch all completed sessions
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        tenantId,
        completedAt: { not: null }
      },
      include: {
        exerciseLogs: {
          include: {
            setLogs: {
              where: { completed: true }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 100
    });

    if (sessions.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Group by hour of day
    const hourlyPerformance: { [hour: number]: { totalVolume: number; count: number } } = {};
    const dailyPerformance: { [day: number]: { totalVolume: number; count: number } } = {};

    for (const session of sessions) {
      if (!session.completedAt) continue;

      const hour = session.completedAt.getHours();
      const dayOfWeek = session.completedAt.getDay();

      // Calculate total volume for session
      let sessionVolume = 0;
      for (const exerciseLog of session.exerciseLogs) {
        for (const setLog of exerciseLog.setLogs) {
          if (setLog.weight && setLog.reps) {
            sessionVolume += setLog.weight * setLog.reps;
          }
        }
      }

      // Track by hour
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { totalVolume: 0, count: 0 };
      }
      hourlyPerformance[hour].totalVolume += sessionVolume;
      hourlyPerformance[hour].count++;

      // Track by day of week
      if (!dailyPerformance[dayOfWeek]) {
        dailyPerformance[dayOfWeek] = { totalVolume: 0, count: 0 };
      }
      dailyPerformance[dayOfWeek].totalVolume += sessionVolume;
      dailyPerformance[dayOfWeek].count++;
    }

    // Find best hour
    let bestHour = 0;
    let bestHourVolume = 0;
    const performanceByHour = [];

    for (const [hour, data] of Object.entries(hourlyPerformance)) {
      const avgVolume = data.totalVolume / data.count;
      performanceByHour.push({
        hour: parseInt(hour),
        avgVolume: Math.round(avgVolume),
        count: data.count
      });

      if (avgVolume > bestHourVolume && data.count >= 2) {
        bestHourVolume = avgVolume;
        bestHour = parseInt(hour);
      }
    }

    // Find best day of week
    let bestDay = 0;
    let bestDayVolume = 0;

    for (const [day, data] of Object.entries(dailyPerformance)) {
      const avgVolume = data.totalVolume / data.count;
      if (avgVolume > bestDayVolume && data.count >= 2) {
        bestDayVolume = avgVolume;
        bestDay = parseInt(day);
      }
    }

    const confidence = Math.min(sessions.length / 30, 1) * 0.8;

    return {
      bestHour,
      bestDayOfWeek: bestDay,
      averagePerformanceByHour: performanceByHour.sort((a, b) => a.hour - b.hour),
      confidence
    };
  }

  /**
   * Analyze progression rate and velocity
   */
  async analyzeProgressionRate(
    customExerciseId: string,
    userId: string,
    tenantId: string
  ): Promise<ProgressionAnalysis | null> {
    const dataPoints = await this.prepareExerciseData(
      customExerciseId,
      userId,
      tenantId
    );

    if (dataPoints.length < this.MIN_DATA_POINTS) {
      return null;
    }

    // Prepare data for regression
    const firstDate = dataPoints[0].date.getTime();
    const x = dataPoints.map(dp =>
      (dp.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 7) // weeks
    );
    const y = dataPoints.map(dp => dp.oneRepMax);

    // Linear regression for velocity
    const model = new SimpleLinearRegression(x, y);
    const rSquared = model.score(x, y).r2;

    // Velocity is the slope (kg per week)
    const velocityPerWeek = model.slope;

    // Current 1RM
    const currentOneRepMax = dataPoints[dataPoints.length - 1].oneRepMax;

    // Predict future
    const currentWeeks = x[x.length - 1];
    const predictedIn4Weeks = model.predict(currentWeeks + 4);
    const predictedIn8Weeks = model.predict(currentWeeks + 8);

    // Calculate confidence
    const lastDate = dataPoints[dataPoints.length - 1].date.getTime();
    const recency = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
    const confidence = this.calculateConfidence(
      dataPoints.length,
      rSquared,
      30 - recency
    );

    // Determine trend
    const trend = velocityPerWeek > 0.5 ? 'increasing'
      : velocityPerWeek < -0.5 ? 'decreasing'
      : 'stable';

    return {
      velocityPerWeek: Math.round(velocityPerWeek * 100) / 100,
      currentOneRepMax: Math.round(currentOneRepMax * 10) / 10,
      predictedOneRepMaxIn4Weeks: Math.max(0, Math.round(predictedIn4Weeks * 10) / 10),
      predictedOneRepMaxIn8Weeks: Math.max(0, Math.round(predictedIn8Weeks * 10) / 10),
      confidence,
      trend: trend as 'increasing' | 'decreasing' | 'stable'
    };
  }

  /**
   * Get comprehensive exercise insights
   */
  async getExerciseInsights(
    customExerciseId: string,
    userId: string,
    tenantId: string
  ) {
    const dataPoints = await this.prepareExerciseData(
      customExerciseId,
      userId,
      tenantId
    );

    if (dataPoints.length < this.MIN_DATA_POINTS) {
      return {
        hasEnoughData: false,
        dataPointsCount: dataPoints.length,
        requiredDataPoints: this.MIN_DATA_POINTS
      };
    }

    // Get all predictions
    const [maxLiftPrediction, optimalSets, progressionAnalysis] = await Promise.all([
      this.predictMaxLift(customExerciseId, userId, tenantId),
      this.predictOptimalSets(customExerciseId, userId, tenantId),
      this.analyzeProgressionRate(customExerciseId, userId, tenantId)
    ]);

    // Calculate additional stats
    const recentData = dataPoints.slice(-5);
    const avgVolume = recentData.reduce((sum, dp) => sum + dp.volume, 0) / recentData.length;
    const totalWorkouts = dataPoints.length;
    const firstWorkout = dataPoints[0].date;
    const lastWorkout = dataPoints[dataPoints.length - 1].date;
    const totalDays = (lastWorkout.getTime() - firstWorkout.getTime()) / (1000 * 60 * 60 * 24);
    const workoutsPerWeek = (totalWorkouts / totalDays) * 7;

    return {
      hasEnoughData: true,
      dataPointsCount: totalWorkouts,
      timespan: {
        firstWorkout,
        lastWorkout,
        totalDays: Math.round(totalDays),
        workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10
      },
      performance: {
        avgRecentVolume: Math.round(avgVolume),
        currentOneRepMax: dataPoints[dataPoints.length - 1].oneRepMax,
        personalRecord: Math.max(...dataPoints.map(dp => dp.oneRepMax))
      },
      predictions: {
        maxLift: maxLiftPrediction,
        optimalSets,
        progression: progressionAnalysis
      }
    };
  }
}
