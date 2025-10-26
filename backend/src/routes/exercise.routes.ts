import { Router } from 'express';
import { ExerciseController } from '../controllers/exercise.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const exerciseController = new ExerciseController();

// All routes require authentication
router.use(authenticate);

// Public routes (all authenticated users can read)
router.get('/', (req, res) => exerciseController.getExercises(req, res));
router.get('/:id', (req, res) => exerciseController.getExercise(req, res));

// Trainer and Admin can create
router.post('/', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => exerciseController.createExercise(req, res));

// Creator or Admin can update
router.patch('/:id', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => exerciseController.updateExercise(req, res));

// Creator or Admin can delete
router.delete('/:id', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => exerciseController.deleteExercise(req, res));

// Admin only - publish/unpublish
router.post('/:id/publish', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => exerciseController.publishExercise(req, res));
router.post('/:id/unpublish', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => exerciseController.unpublishExercise(req, res));

export default router;
