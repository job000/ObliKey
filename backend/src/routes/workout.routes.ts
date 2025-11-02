import { Router } from 'express';
import { WorkoutController } from '../controllers/workout.controller';
import { WorkoutPredictionController } from '../controllers/workout-prediction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const workoutController = new WorkoutController();
const predictionController = new WorkoutPredictionController();

// All routes require authentication
router.use(authenticate);

// ============================================
// SYSTEM EXERCISES (Browse library)
// ============================================
router.get(
  '/exercises/library',
  (req, res) => workoutController.getSystemExercises(req, res)
);
router.get(
  '/exercises/library/:id',
  (req, res) => workoutController.getSystemExercise(req, res)
);

// ============================================
// CUSTOM EXERCISES (User's personal exercises)
// ============================================
router.get(
  '/exercises',
  (req, res) => workoutController.getCustomExercises(req, res)
);
router.post(
  '/exercises',
  (req, res) => workoutController.createCustomExercise(req, res)
);
router.patch(
  '/exercises/:id',
  (req, res) => workoutController.updateCustomExercise(req, res)
);
router.delete(
  '/exercises/:id',
  (req, res) => workoutController.deleteCustomExercise(req, res)
);

// ============================================
// WORKOUT PROGRAMS
// ============================================
router.get(
  '/programs/templates',
  (req, res) => workoutController.getWorkoutTemplates(req, res)
);
router.get(
  '/programs',
  (req, res) => workoutController.getWorkoutPrograms(req, res)
);
router.get(
  '/programs/:id',
  (req, res) => workoutController.getWorkoutProgram(req, res)
);
router.post(
  '/programs',
  (req, res) => workoutController.createWorkoutProgram(req, res)
);
router.patch(
  '/programs/:id',
  (req, res) => workoutController.updateWorkoutProgram(req, res)
);
router.delete(
  '/programs/:id',
  (req, res) => workoutController.deleteWorkoutProgram(req, res)
);
router.post(
  '/programs/:id/save-as-template',
  (req, res) => workoutController.saveWorkoutProgramAsTemplate(req, res)
);

// ============================================
// PROGRAM EXERCISES
// ============================================
router.post(
  '/programs/:programId/exercises',
  (req, res) => workoutController.addExerciseToProgram(req, res)
);
router.patch(
  '/program-exercises/:id',
  (req, res) => workoutController.updateProgramExercise(req, res)
);
router.delete(
  '/program-exercises/:id',
  (req, res) => workoutController.removeProgramExercise(req, res)
);

// ============================================
// WORKOUT SCHEDULES
// ============================================
router.get(
  '/schedules',
  (req, res) => workoutController.getWorkoutSchedules(req, res)
);
router.post(
  '/schedules',
  (req, res) => workoutController.createWorkoutSchedule(req, res)
);
router.delete(
  '/schedules/:id',
  (req, res) => workoutController.deleteWorkoutSchedule(req, res)
);

// ============================================
// WORKOUT SESSIONS (Tracking)
// ============================================
router.get(
  '/sessions',
  (req, res) => workoutController.getWorkoutSessions(req, res)
);
router.post(
  '/sessions/start',
  (req, res) => workoutController.startWorkoutSession(req, res)
);
router.post(
  '/sessions/:id/complete',
  (req, res) => workoutController.completeWorkoutSession(req, res)
);
router.post(
  '/sessions/:sessionId/exercises',
  (req, res) => workoutController.logExercise(req, res)
);

// ============================================
// STATISTICS & PROGRESS
// ============================================
router.get(
  '/stats',
  (req, res) => workoutController.getWorkoutStats(req, res)
);
router.get(
  '/exercises/:customExerciseId/progress',
  (req, res) => workoutController.getExerciseProgress(req, res)
);

// ============================================
// ML PREDICTIONS & INSIGHTS
// ============================================
router.get(
  '/predictions/overview',
  (req, res) => predictionController.getPredictionsOverview(req, res)
);
router.get(
  '/predictions/optimal-time',
  (req, res) => predictionController.getOptimalTrainingTime(req, res)
);
router.get(
  '/predictions/progression/:exerciseId',
  (req, res) => predictionController.getProgressionPrediction(req, res)
);
router.get(
  '/predictions/max-lift/:exerciseId',
  (req, res) => predictionController.getMaxLiftPrediction(req, res)
);
router.get(
  '/predictions/optimal-sets/:exerciseId',
  (req, res) => predictionController.getOptimalSets(req, res)
);
router.get(
  '/predictions/insights/:exerciseId',
  (req, res) => predictionController.getExerciseInsights(req, res)
);
router.get(
  '/predictions/volume-intensity',
  (req, res) => predictionController.getVolumeIntensityAnalysis(req, res)
);
router.get(
  '/predictions/recommendations',
  (req, res) => predictionController.getSmartRecommendations(req, res)
);

export default router;
