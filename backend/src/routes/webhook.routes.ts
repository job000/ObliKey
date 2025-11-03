import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import express from 'express';

const router = Router();
const webhookController = new WebhookController();

// Vipps webhook - no authentication required (Vipps sends these)
// Should validate using webhook secret in production
router.post('/vipps', (req, res) => webhookController.handleVippsWebhook(req, res));

// Stripe webhook - requires raw body for signature verification
// Should validate using Stripe signature in production
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => webhookController.handleStripeWebhook(req, res));

export default router;
