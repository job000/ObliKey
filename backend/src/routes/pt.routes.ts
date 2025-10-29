import { Router } from 'express';
import { PTController } from '../controllers/pt.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ptController = new PTController();

// All routes require authentication
router.use(authenticate);

// PT Session routes
router.post('/sessions', (req, res) => ptController.createSession(req, res)); // Customers can book their own sessions
router.get('/sessions', (req, res) => ptController.getSessions(req, res));
router.get('/sessions/:id', (req, res) => ptController.getSessionById(req, res)); // Get single session by ID
router.patch('/sessions/:id', (req, res) => ptController.updateSession(req, res)); // All authenticated users can update (with permission checks in controller)
router.delete('/sessions/:id', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.deleteSession(req, res)); // Only trainers and admins can delete
router.post('/sessions/:id/cancel', (req, res) => ptController.cancelSession(req, res)); // All users can cancel (with permission checks in controller)
router.post('/sessions/:id/approve', (req, res) => ptController.approveSession(req, res)); // Customers can approve sessions
router.post('/sessions/:id/reject', (req, res) => ptController.rejectSession(req, res)); // Customers can reject sessions

// Session Results & Feedback
router.post('/sessions/:sessionId/result', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.createSessionResult(req, res)); // Trainer adds session results
router.get('/sessions/:sessionId/result', (req, res) => ptController.getSessionResult(req, res)); // All can view results
router.post('/sessions/:sessionId/feedback', (req, res) => ptController.addClientFeedback(req, res)); // Customers can add feedback

// Training Program routes
router.post('/programs', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.createProgram(req, res));
router.get('/programs', (req, res) => ptController.getPrograms(req, res));
router.get('/programs/:id', (req, res) => ptController.getProgramById(req, res));
router.patch('/programs/:id', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.updateProgram(req, res));

// Client and trainer management
router.get('/clients', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.getClients(req, res));
router.get('/trainers', (req, res) => ptController.getTrainers(req, res)); // All authenticated users can view trainers

// PT Credits routes
router.get('/credits', (req, res) => ptController.getMyCredits(req, res)); // All users can view their credits
router.post('/credits', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => ptController.addCredits(req, res)); // Admin only

export default router;
