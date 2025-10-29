import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const feedbackController = new FeedbackController();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', (req, res) => feedbackController.createFeedback(req, res));
router.get('/my-feedback', (req, res) => feedbackController.getMyFeedback(req, res));

// Public reviews (read-only)
router.get('/class/:classId/reviews', (req, res) => feedbackController.getClassReviews(req, res));
router.get('/trainer/:trainerId/reviews', (req, res) => feedbackController.getTrainerReviews(req, res));

// Submit feedback for a specific class (requires attendance)
router.post('/class/:classId', (req, res) => feedbackController.submitClassFeedback(req, res));

// Admin routes
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => feedbackController.getAllFeedback(req, res));
router.patch('/:id/respond', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => feedbackController.respondToFeedback(req, res));

export default router;
