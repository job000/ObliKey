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
router.patch('/sessions/:id/status', (req, res) => ptController.updateSessionStatus(req, res)); // Update session status
router.delete('/sessions/:id', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => ptController.deleteSession(req, res)); // Only trainers, admins, and super admins can delete
router.post('/sessions/:id/cancel', (req, res) => ptController.cancelSession(req, res)); // All users can cancel (with permission checks in controller)
router.post('/sessions/:id/no-show', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => ptController.markNoShow(req, res)); // Mark session as no-show
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
router.get('/clients', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => ptController.getClients(req, res));
router.get('/trainers', (req, res) => ptController.getTrainers(req, res)); // All authenticated users can view trainers

// PT Credits routes
router.get('/credits', (req, res) => ptController.getMyCredits(req, res)); // All users can view their credits
router.post('/credits', authorize('TRAINER', 'ADMIN', 'SUPER_ADMIN'), (req, res) => ptController.addCredits(req, res)); // Trainers and admins can add credits

// PT Availability routes
router.get('/availability/:trainerId?', (req, res) => ptController.getTrainerAvailability(req, res)); // Get trainer's weekly schedule
router.post('/availability', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.setTrainerAvailability(req, res)); // Set trainer availability
router.patch('/availability/:availabilityId', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.updateTrainerAvailability(req, res)); // Update availability
router.delete('/availability/:availabilityId', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.deleteTrainerAvailability(req, res)); // Delete availability

// Time blocks (blocked times or one-time availability)
router.get('/time-blocks/:trainerId?', (req, res) => ptController.getTrainerTimeBlocks(req, res)); // Get time blocks
router.post('/time-blocks/block', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.blockTimeSlot(req, res)); // Block time
router.post('/time-blocks/available', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.addOneTimeAvailability(req, res)); // Add one-time availability
router.delete('/time-blocks/:timeBlockId', authorize('TRAINER', 'ADMIN'), (req, res) => ptController.deleteTimeBlock(req, res)); // Delete time block

// Available slots (for customers to see when they can book)
router.get('/slots/:trainerId', (req, res) => ptController.getAvailableSlots(req, res)); // Get available slots for a trainer
router.get('/slots', (req, res) => ptController.getAllAvailableSlots(req, res)); // Get all available slots from all trainers

export default router;
