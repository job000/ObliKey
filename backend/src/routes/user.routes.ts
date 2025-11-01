import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// Module status endpoint (must be before /:id to avoid route conflicts)
router.get('/module-status/door-access', (req, res) => userController.getDoorAccessModuleStatus(req, res));

// Routes
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => userController.createUser(req, res));
router.get('/', authorize('ADMIN', 'TRAINER', 'SUPER_ADMIN'), (req, res) => userController.getUsers(req, res));
router.get('/search', (req, res) => userController.searchUsers(req, res)); // Must be before /:id

// Profile update routes (for logged-in user to update their own profile)
router.put('/profile', (req, res) => userController.updateOwnProfile(req, res));
router.put('/password', (req, res) => userController.updateOwnPassword(req, res));

router.get('/:id', (req, res) => userController.getUserById(req, res));
router.patch('/:id', (req, res) => userController.updateUser(req, res));
router.patch('/:id/username', (req, res) => userController.updateUsername(req, res));
router.patch('/:id/avatar', (req, res) => userController.updateAvatar(req, res));
router.delete('/:id/avatar', (req, res) => userController.removeAvatar(req, res));
router.patch('/:id/deactivate', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => userController.deactivateUser(req, res));
router.patch('/:id/activate', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => userController.activateUser(req, res));
router.patch('/:id/role', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => userController.updateUserRole(req, res));
router.patch('/:id/transfer-tenant', authorize('SUPER_ADMIN'), (req, res) => userController.transferUserToTenant(req, res));
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), (req, res) => userController.deleteUser(req, res));

// Rate limit management (admin only)
router.post('/reset-rate-limits', authorize('ADMIN'), (req, res) => userController.resetRateLimits(req, res));
router.post('/reset-user-rate-limit', authorize('ADMIN'), (req, res) => userController.resetUserRateLimit(req, res));

export default router;
