import { Router } from 'express';
import { MembershipController } from '../controllers/membership.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const membershipController = new MembershipController();

// All routes require authentication
router.use(authenticate);

// ============================================
// MEMBERSHIP PLANS (Admin only)
// ============================================
router.get(
  '/plans',
  (req, res) => membershipController.getMembershipPlans(req, res)
);
router.post(
  '/plans',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.createMembershipPlan(req, res)
);
router.patch(
  '/plans/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.updateMembershipPlan(req, res)
);
router.delete(
  '/plans/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.deleteMembershipPlan(req, res)
);

// ============================================
// MEMBERSHIPS
// ============================================
router.get(
  '/my-status',
  (req, res) => membershipController.getMyMembershipStatus(req, res)
);
router.get(
  '/active-check-in',
  (req, res) => membershipController.getActiveCheckIn(req, res)
);
router.get(
  '/',
  (req, res) => membershipController.getMemberships(req, res)
);
router.get(
  '/:id',
  (req, res) => membershipController.getMembership(req, res)
);
router.post(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.createMembership(req, res)
);

// ============================================
// MEMBERSHIP ACTIONS
// ============================================
router.post(
  '/:id/freeze',
  (req, res) => membershipController.freezeMembership(req, res)
);
router.post(
  '/:id/unfreeze',
  (req, res) => membershipController.unfreezeMembership(req, res)
);
router.post(
  '/:id/cancel',
  (req, res) => membershipController.cancelMembership(req, res)
);

// ============================================
// ADMIN ACTIONS
// ============================================
router.post(
  '/:id/suspend',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.suspendMembership(req, res)
);
router.post(
  '/:id/blacklist',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.blacklistMembership(req, res)
);
router.post(
  '/:id/reactivate',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.reactivateMembership(req, res)
);

// ============================================
// PAYMENTS
// ============================================
router.get(
  '/:membershipId/payments',
  (req, res) => membershipController.getMembershipPayments(req, res)
);
router.post(
  '/payments/:id/mark-paid',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.markPaymentPaid(req, res)
);

// ============================================
// STATISTICS (Admin only)
// ============================================
router.get(
  '/stats/overview',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.getMembershipStats(req, res)
);

// ============================================
// CHECK-IN TRACKING
// ============================================
router.post(
  '/check-in',
  (req, res) => membershipController.checkIn(req, res)
);
router.post(
  '/check-out/:checkInId',
  (req, res) => membershipController.checkOut(req, res)
);
router.get(
  '/:membershipId/check-ins',
  (req, res) => membershipController.getCheckInHistory(req, res)
);

// ============================================
// PAYMENT REMINDERS (Admin only)
// ============================================
router.post(
  '/payments/:paymentId/send-reminder',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res) => membershipController.sendPaymentReminder(req, res)
);

// ============================================
// MEMBER ACTIVITY (Admin can view all, customers their own)
// ============================================
router.get(
  '/:membershipId/activity',
  (req, res) => membershipController.getMemberActivityOverview(req, res)
);

export default router;
