import { Router } from 'express';
import { LandingPageController } from '../controllers/landingPage.controller';
import { authenticate, authorize, requireLandingPageModule } from '../middleware/auth';

const router = Router();
const landingPageController = new LandingPageController();

// Public route - get active content
router.get('/content', (req, res) => landingPageController.getContent(req, res));

// Public route - get content by section
router.get('/content/:section', (req, res) => landingPageController.getContentBySection(req, res));

// Module status - accessible to all authenticated users
router.get('/module-status', authenticate, (req, res) => landingPageController.getModuleStatus(req, res));

// Toggle module - SUPER_ADMIN only
router.post('/toggle-module', authenticate, authorize('SUPER_ADMIN'), (req, res) => landingPageController.toggleLandingPageModule(req, res));

// Admin routes - require authentication and admin role (no module requirement for editing)
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

// Get all content (including inactive)
router.get('/admin/content', (req, res) => landingPageController.getAllContent(req, res));

// Create content
router.post('/admin/content', (req, res) => landingPageController.createContent(req, res));

// Update content
router.patch('/admin/content/:id', (req, res) => landingPageController.updateContent(req, res));

// Delete content
router.delete('/admin/content/:id', (req, res) => landingPageController.deleteContent(req, res));

// Initialize default content
router.post('/admin/content/initialize', (req, res) => landingPageController.initializeDefaultContent(req, res));

export default router;
