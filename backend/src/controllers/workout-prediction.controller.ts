import { Response } from 'express';
import { AuthRequest } from '../types';
import { WorkoutPredictionService } from '../services/workout-prediction.service';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

export class WorkoutPredictionController {
  private predictionService: WorkoutPredictionService;

  constructor() {
    this.predictionService = new WorkoutPredictionService();
  }

  /**
   * GET /api/workouts/predictions/progression/:exerciseId
   * Get progression prediction for a specific exercise
   */
  async getProgressionPrediction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { exerciseId } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify exercise exists and belongs to user's tenant
      const exercise = await prisma.customExercise.findFirst({
        where: {
          id: exerciseId,
          tenantId,
          userId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!exercise) {
        throw new AppError('Exercise not found or access denied', 404);
      }

      // Get progression analysis
      const progression = await this.predictionService.analyzeProgressionRate(
        exerciseId,
        userId,
        tenantId
      );

      if (!progression) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Not enough data for prediction. Need at least 5 workout sessions with this exercise.'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          exercise: {
            id: exercise.id,
            name: exercise.name
          },
          progression
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get progression prediction error:', error);
        res.status(500).json({ success: false, error: 'Failed to get progression prediction' });
      }
    }
  }

  /**
   * GET /api/workouts/predictions/max-lift/:exerciseId
   * Predict future maximum lift for an exercise
   */
  async getMaxLiftPrediction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { exerciseId } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify exercise exists and belongs to user's tenant
      const exercise = await prisma.customExercise.findFirst({
        where: {
          id: exerciseId,
          tenantId,
          userId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!exercise) {
        throw new AppError('Exercise not found or access denied', 404);
      }

      // Get max lift prediction
      const prediction = await this.predictionService.predictMaxLift(
        exerciseId,
        userId,
        tenantId
      );

      if (!prediction) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Not enough data for prediction. Need at least 5 workout sessions with this exercise.'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          exercise: {
            id: exercise.id,
            name: exercise.name
          },
          prediction: {
            ...prediction,
            predictionDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
            unit: 'kg'
          }
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get max lift prediction error:', error);
        res.status(500).json({ success: false, error: 'Failed to get max lift prediction' });
      }
    }
  }

  /**
   * GET /api/workouts/predictions/optimal-sets/:exerciseId
   * Get optimal sets/reps recommendation for an exercise
   */
  async getOptimalSets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { exerciseId } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify exercise exists and belongs to user's tenant
      const exercise = await prisma.customExercise.findFirst({
        where: {
          id: exerciseId,
          tenantId,
          userId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!exercise) {
        throw new AppError('Exercise not found or access denied', 404);
      }

      // Get optimal sets recommendation
      const recommendation = await this.predictionService.predictOptimalSets(
        exerciseId,
        userId,
        tenantId
      );

      if (!recommendation) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Not enough data for recommendation. Need at least 5 workout sessions with this exercise.'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          exercise: {
            id: exercise.id,
            name: exercise.name
          },
          recommendation
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get optimal sets error:', error);
        res.status(500).json({ success: false, error: 'Failed to get optimal sets recommendation' });
      }
    }
  }

  /**
   * GET /api/workouts/predictions/optimal-time
   * Analyze optimal training times based on user's workout history
   */
  async getOptimalTrainingTime(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Get optimal time analysis
      const analysis = await this.predictionService.predictOptimalTrainingTime(
        userId,
        tenantId
      );

      if (!analysis) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Not enough workout data for analysis. Need at least 5 completed workout sessions.'
        });
        return;
      }

      // Map day of week to name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      res.json({
        success: true,
        data: {
          bestHour: analysis.bestHour,
          bestHourFormatted: `${analysis.bestHour}:00 - ${analysis.bestHour + 1}:00`,
          bestDayOfWeek: analysis.bestDayOfWeek,
          bestDayName: dayNames[analysis.bestDayOfWeek],
          performanceByHour: analysis.averagePerformanceByHour,
          confidence: analysis.confidence
        }
      });
    } catch (error) {
      console.error('Get optimal training time error:', error);
      res.status(500).json({ success: false, error: 'Failed to get optimal training time analysis' });
    }
  }

  /**
   * GET /api/workouts/predictions/insights/:exerciseId
   * Get comprehensive insights for an exercise including all predictions
   */
  async getExerciseInsights(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { exerciseId } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify exercise exists and belongs to user's tenant
      const exercise = await prisma.customExercise.findFirst({
        where: {
          id: exerciseId,
          tenantId,
          userId
        },
        select: {
          id: true,
          name: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          systemExercise: {
            select: {
              primaryMuscles: true,
              secondaryMuscles: true,
              equipment: true,
              difficulty: true
            }
          }
        }
      });

      if (!exercise) {
        throw new AppError('Exercise not found or access denied', 404);
      }

      // Get comprehensive insights
      const insights = await this.predictionService.getExerciseInsights(
        exerciseId,
        userId,
        tenantId
      );

      res.json({
        success: true,
        data: {
          exercise: {
            id: exercise.id,
            name: exercise.name,
            primaryMuscles: exercise.primaryMuscles || exercise.systemExercise?.primaryMuscles || [],
            secondaryMuscles: exercise.secondaryMuscles || exercise.systemExercise?.secondaryMuscles || [],
            equipment: exercise.equipment || exercise.systemExercise?.equipment || [],
            difficulty: exercise.systemExercise?.difficulty
          },
          insights
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get exercise insights error:', error);
        res.status(500).json({ success: false, error: 'Failed to get exercise insights' });
      }
    }
  }

  /**
   * GET /api/workouts/predictions/overview
   * Get prediction overview for all exercises
   */
  async getPredictionsOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Get user's custom exercises with recent activity
      const exercises = await prisma.customExercise.findMany({
        where: {
          tenantId,
          userId,
          exerciseLogs: {
            some: {
              session: {
                completedAt: { not: null }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          exerciseLogs: {
            where: {
              session: {
                completedAt: { not: null }
              }
            },
            select: {
              id: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      });

      // Get progression for each exercise
      const predictions = await Promise.all(
        exercises.map(async (exercise) => {
          const progression = await this.predictionService.analyzeProgressionRate(
            exercise.id,
            userId,
            tenantId
          );

          return {
            exercise: {
              id: exercise.id,
              name: exercise.name,
              workoutCount: exercise.exerciseLogs.length
            },
            progression
          };
        })
      );

      // Filter out exercises without enough data
      const validPredictions = predictions.filter(p => p.progression !== null);

      res.json({
        success: true,
        data: {
          exercises: validPredictions,
          totalExercises: exercises.length,
          exercisesWithPredictions: validPredictions.length
        }
      });
    } catch (error) {
      console.error('Get predictions overview error:', error);
      res.status(500).json({ success: false, error: 'Failed to get predictions overview' });
    }
  }

  /**
   * GET /api/workouts/predictions/volume-intensity
   * Analyze volume and intensity distribution over last 8 weeks
   */
  async getVolumeIntensityAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Get workout sessions from last 8 weeks
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const sessions = await prisma.workoutSession.findMany({
        where: {
          userId,
          tenantId,
          completedAt: {
            not: null,
            gte: eightWeeksAgo
          }
        },
        include: {
          exerciseLogs: {
            include: {
              setLogs: true
            }
          }
        },
        orderBy: {
          completedAt: 'asc'
        }
      });

      if (sessions.length === 0) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Not enough workout data. Complete at least one workout to see analysis.'
        });
        return;
      }

      // Calculate weekly volume
      const weeklyVolume: { week: string; volume: number }[] = [];
      const weekMap = new Map<string, number>();

      sessions.forEach(session => {
        if (!session.completedAt) return;

        const weekStart = new Date(session.completedAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        let totalVolume = 0;
        session.exerciseLogs.forEach(exerciseLog => {
          exerciseLog.setLogs.forEach(setLog => {
            const weight = setLog.weight || 0;
            const reps = setLog.reps || 0;
            totalVolume += weight * reps;
          });
        });

        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + totalVolume);
      });

      weekMap.forEach((volume, week) => {
        weeklyVolume.push({ week, volume: Math.round(volume) });
      });

      // Calculate intensity distribution and max weights
      const exerciseMaxWeights = new Map<string, number>();
      const intensityCounts = { light: 0, medium: 0, heavy: 0 };
      let totalSets = 0;

      // First pass: find max weights for each exercise
      sessions.forEach(session => {
        session.exerciseLogs.forEach(exerciseLog => {
          exerciseLog.setLogs.forEach(setLog => {
            const weight = setLog.weight || 0;
            const currentMax = exerciseMaxWeights.get(exerciseLog.customExerciseId) || 0;
            if (weight > currentMax) {
              exerciseMaxWeights.set(exerciseLog.customExerciseId, weight);
            }
          });
        });
      });

      // Second pass: calculate intensity distribution
      sessions.forEach(session => {
        session.exerciseLogs.forEach(exerciseLog => {
          const maxWeight = exerciseMaxWeights.get(exerciseLog.customExerciseId) || 1;
          exerciseLog.setLogs.forEach(setLog => {
            const weight = setLog.weight || 0;
            const intensity = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;

            totalSets++;
            if (intensity < 70) {
              intensityCounts.light++;
            } else if (intensity < 85) {
              intensityCounts.medium++;
            } else {
              intensityCounts.heavy++;
            }
          });
        });
      });

      const intensityDistribution = totalSets > 0 ? {
        light: Math.round((intensityCounts.light / totalSets) * 100),
        medium: Math.round((intensityCounts.medium / totalSets) * 100),
        heavy: Math.round((intensityCounts.heavy / totalSets) * 100)
      } : { light: 0, medium: 0, heavy: 0 };

      // Calculate recovery score based on rest days
      const sessionDates = sessions
        .map(s => s.completedAt!)
        .sort((a, b) => a.getTime() - b.getTime());

      let totalRestDays = 0;
      let restDayCount = 0;

      for (let i = 1; i < sessionDates.length; i++) {
        const daysDiff = Math.floor(
          (sessionDates[i].getTime() - sessionDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 0) {
          totalRestDays += daysDiff - 1; // Subtract 1 as we count days between
          restDayCount++;
        }
      }

      const avgRestDays = restDayCount > 0 ? totalRestDays / restDayCount : 0;
      // Recovery score: optimal is 1-2 days rest, score 0-100
      const recoveryScore = Math.min(100, Math.max(0,
        100 - Math.abs(1.5 - avgRestDays) * 20
      ));

      res.json({
        success: true,
        data: {
          weeklyVolume: weeklyVolume.sort((a, b) => a.week.localeCompare(b.week)),
          intensityDistribution,
          recoveryScore: Math.round(recoveryScore),
          totalSessions: sessions.length,
          averageRestDays: Math.round(avgRestDays * 10) / 10
        }
      });
    } catch (error) {
      console.error('Get volume intensity analysis error:', error);
      res.status(500).json({ success: false, error: 'Failed to get volume intensity analysis' });
    }
  }

  /**
   * GET /api/workouts/predictions/recommendations
   * Generate smart recommendations based on workout patterns
   */
  async getSmartRecommendations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Get workout sessions from last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const sessions = await prisma.workoutSession.findMany({
        where: {
          userId,
          tenantId,
          completedAt: {
            not: null,
            gte: fourWeeksAgo
          }
        },
        include: {
          exerciseLogs: {
            include: {
              setLogs: true
            }
          }
        },
        orderBy: {
          completedAt: 'asc'
        }
      });

      if (sessions.length === 0) {
        res.status(200).json({
          success: true,
          data: [],
          message: 'Not enough workout data. Complete at least one workout to get recommendations.'
        });
        return;
      }

      const recommendations: Array<{
        type: 'progression' | 'recovery' | 'frequency' | 'volume';
        title: string;
        message: string;
        priority: 'high' | 'medium' | 'low';
        icon: string;
      }> = [];

      // Analyze workout frequency
      const workoutsPerWeek = (sessions.length / 4);

      if (workoutsPerWeek < 2) {
        recommendations.push({
          type: 'frequency',
          title: 'Increase Workout Frequency',
          message: `You're averaging ${workoutsPerWeek.toFixed(1)} workouts per week. Consider training 3-4 times weekly for optimal progress.`,
          priority: 'high',
          icon: 'calendar'
        });
      } else if (workoutsPerWeek > 6) {
        recommendations.push({
          type: 'recovery',
          title: 'Consider More Rest',
          message: `You're averaging ${workoutsPerWeek.toFixed(1)} workouts per week. Ensure adequate recovery to prevent overtraining.`,
          priority: 'high',
          icon: 'alert-circle'
        });
      }

      // Analyze rest days
      const sessionDates = sessions
        .map(s => s.completedAt!)
        .sort((a, b) => a.getTime() - b.getTime());

      let hasConsecutiveDays = false;
      for (let i = 1; i < sessionDates.length; i++) {
        const daysDiff = Math.floor(
          (sessionDates[i].getTime() - sessionDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 0 || daysDiff === 1) {
          hasConsecutiveDays = true;
          break;
        }
      }

      if (hasConsecutiveDays && sessions.length >= 3) {
        recommendations.push({
          type: 'recovery',
          title: 'Recovery Optimization',
          message: 'You have consecutive training days. Consider spacing workouts with rest days for better muscle recovery.',
          priority: 'medium',
          icon: 'moon'
        });
      }

      // Analyze volume trends
      const firstHalfSessions = sessions.slice(0, Math.floor(sessions.length / 2));
      const secondHalfSessions = sessions.slice(Math.floor(sessions.length / 2));

      const calculateVolume = (sessionList: typeof sessions) => {
        return sessionList.reduce((total, session) => {
          return total + session.exerciseLogs.reduce((sessionTotal, exerciseLog) => {
            return sessionTotal + exerciseLog.setLogs.reduce((exerciseTotal, setLog) => {
              return exerciseTotal + ((setLog.weight || 0) * (setLog.reps || 0));
            }, 0);
          }, 0);
        }, 0);
      };

      const firstHalfVolume = calculateVolume(firstHalfSessions);
      const secondHalfVolume = calculateVolume(secondHalfSessions);

      if (secondHalfVolume > firstHalfVolume * 1.3) {
        recommendations.push({
          type: 'volume',
          title: 'Excellent Progress!',
          message: `Your training volume has increased by ${Math.round(((secondHalfVolume / firstHalfVolume - 1) * 100))}%. Keep up the great work!`,
          priority: 'low',
          icon: 'trending-up'
        });
      } else if (secondHalfVolume < firstHalfVolume * 0.8) {
        recommendations.push({
          type: 'volume',
          title: 'Volume Decrease Detected',
          message: 'Your training volume has decreased. Consider progressively increasing weights or reps to continue making gains.',
          priority: 'medium',
          icon: 'trending-down'
        });
      }

      // Analyze progression
      const exerciseProgress = new Map<string, { first: number; last: number }>();

      sessions.forEach((session, index) => {
        session.exerciseLogs.forEach(exerciseLog => {
          const maxWeight = Math.max(...exerciseLog.setLogs.map(s => s.weight || 0));
          const current = exerciseProgress.get(exerciseLog.customExerciseId);

          if (!current) {
            exerciseProgress.set(exerciseLog.customExerciseId, { first: maxWeight, last: maxWeight });
          } else {
            if (index < sessions.length / 2) {
              current.first = Math.max(current.first, maxWeight);
            } else {
              current.last = Math.max(current.last, maxWeight);
            }
          }
        });
      });

      let progressingExercises = 0;
      let stagnantExercises = 0;

      exerciseProgress.forEach((progress) => {
        if (progress.last > progress.first * 1.05) {
          progressingExercises++;
        } else if (progress.last <= progress.first) {
          stagnantExercises++;
        }
      });

      if (stagnantExercises > progressingExercises && exerciseProgress.size >= 3) {
        recommendations.push({
          type: 'progression',
          title: 'Try Progressive Overload',
          message: 'Several exercises show no weight progression. Try increasing weight by 2.5-5% when you can complete all sets with good form.',
          priority: 'high',
          icon: 'arrow-up'
        });
      }

      // If we have very few recommendations, add a positive one
      if (recommendations.length < 2) {
        recommendations.push({
          type: 'progression',
          title: 'Keep Training Consistent',
          message: 'Your workout routine looks balanced. Stay consistent and focus on progressive overload for continued gains.',
          priority: 'low',
          icon: 'check-circle'
        });
      }

      res.json({
        success: true,
        data: recommendations.slice(0, 5) // Limit to 5 recommendations
      });
    } catch (error) {
      console.error('Get smart recommendations error:', error);
      res.status(500).json({ success: false, error: 'Failed to get recommendations' });
    }
  }
}
