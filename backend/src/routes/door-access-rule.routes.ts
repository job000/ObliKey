import { Router } from 'express';
import { DoorAccessRuleController } from '../controllers/door-access-rule.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const doorAccessRuleController = new DoorAccessRuleController();

// All routes require authentication and admin/trainer role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN', 'TRAINER'));

// Access Rule Management
router.get('/doors/:doorId/access-rules', (req, res) =>
  doorAccessRuleController.listAccessRules(req, res)
);

router.post('/doors/:doorId/access-rules', (req, res) =>
  doorAccessRuleController.createAccessRule(req, res)
);

router.get('/access-rules/:ruleId', (req, res) =>
  doorAccessRuleController.getAccessRule(req, res)
);

router.put('/access-rules/:ruleId', (req, res) =>
  doorAccessRuleController.updateAccessRule(req, res)
);

router.delete('/access-rules/:ruleId', (req, res) =>
  doorAccessRuleController.deleteAccessRule(req, res)
);

router.patch('/access-rules/:ruleId/toggle', (req, res) =>
  doorAccessRuleController.toggleAccessRule(req, res)
);

// User Management within Rules
router.post('/access-rules/:ruleId/add-users', (req, res) =>
  doorAccessRuleController.addUsersToRule(req, res)
);

router.post('/access-rules/:ruleId/remove-users', (req, res) =>
  doorAccessRuleController.removeUsersFromRule(req, res)
);

export default router;
