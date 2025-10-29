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

// Template routes
router.get('/templates', authorize('ADMIN', 'TRAINER'), (req, res) => classController.getTemplates(req, res));
router.patch('/:id/save-as-template', authorize('ADMIN', 'TRAINER'), (req, res) => classController.saveAsTemplate(req, res));
router.post('/from-template/:templateId', authorize('ADMIN', 'TRAINER'), (req, res) => classController.createFromTemplate(req, res));

// Class routes
router.post('/', authorize('ADMIN', 'TRAINER'), (req, res) => classController.createClass(req, res));
router.get('/', (req, res) => classController.getClasses(req, res));
router.get('/:id', (req, res) => classController.getClassById(req, res));
router.patch('/:id', authorize('ADMIN', 'TRAINER'), (req, res) => classController.updateClass(req, res));
router.delete('/:id', authorize('ADMIN', 'TRAINER'), (req, res) => classController.deleteClass(req, res));

// Publish/Unpublish routes
router.post('/:id/publish', authorize('ADMIN', 'TRAINER'), (req, res) => classController.publishClass(req, res));
router.post('/:id/unpublish', authorize('ADMIN', 'TRAINER'), (req, res) => classController.unpublishClass(req, res));

// Cancel class route
router.post('/:id/cancel', authorize('ADMIN', 'TRAINER'), (req, res) => classController.cancelClass(req, res));

export default router;
