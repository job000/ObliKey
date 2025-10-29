import { Router } from 'express';
import { ProgramController } from '../controllers/program.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const programController = new ProgramController();

// All routes require authentication
router.use(authenticate);

// Program routes - accessible to all authenticated users (customers, trainers, admins)
router.get('/', (req, res) => programController.getPrograms(req, res));
router.get('/:id', (req, res) => programController.getProgram(req, res));
router.post('/', (req, res) => programController.createProgram(req, res)); // Customers can create their own
router.patch('/:id', (req, res) => programController.updateProgram(req, res));
router.delete('/:id', (req, res) => programController.deleteProgram(req, res));

// Exercise management
router.post('/:id/exercises', (req, res) => programController.addExercise(req, res));
router.delete('/:id/exercises/:exerciseId', (req, res) => programController.removeExercise(req, res));

export default router;
