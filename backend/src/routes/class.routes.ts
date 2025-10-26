import { Router } from 'express';
import { ClassController } from '../controllers/class.controller';
import { authenticate, authorize, requireClassesModule } from '../middleware/auth';

const router = Router();
const classController = new ClassController();

// Module status - accessible to all authenticated users (before requireClassesModule)
router.get('/module-status', authenticate, (req, res) => classController.getModuleStatus(req, res));

// Toggle module - SUPER_ADMIN only (before requireClassesModule)
router.post('/toggle-module', authenticate, authorize('SUPER_ADMIN'), (req, res) => classController.toggleClassesModule(req, res));

// All remaining routes require authentication
router.use(authenticate);

// All routes require classes module to be enabled
router.use(requireClassesModule);

// Routes
router.get('/trainers', (req, res) => classController.getTrainers(req, res));
router.post('/', authorize('ADMIN', 'TRAINER'), (req, res) => classController.createClass(req, res));
router.get('/', (req, res) => classController.getClasses(req, res));
router.get('/:id', (req, res) => classController.getClassById(req, res));
router.patch('/:id', authorize('ADMIN', 'TRAINER'), (req, res) => classController.updateClass(req, res));
router.delete('/:id', authorize('ADMIN', 'TRAINER'), (req, res) => classController.deleteClass(req, res));

export default router;
