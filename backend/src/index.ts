import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { activityLogger } from './middleware/activityLogger';
import {
  corsOptions,
  rateLimitMiddleware,
  sanitizeInput,
  preventSQLInjection,
  securityHeaders
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import tenantSettingsRoutes from './routes/tenantSettings.routes';
import userRoutes from './routes/user.routes';
import classRoutes from './routes/class.routes';
import bookingRoutes from './routes/booking.routes';
import ptRoutes from './routes/pt.routes';
import paymentRoutes from './routes/payment.routes';
import chatRoutes from './routes/chat.routes';
import platformRoutes from './routes/platform.routes';
import feedbackRoutes from './routes/feedback.routes';
import productRoutes from './routes/product.routes';
import uploadRoutes from './routes/upload.routes';
import exerciseRoutes from './routes/exercise.routes';
import accountingRoutes from './routes/accounting.routes';
import invoiceRoutes from './routes/invoice.routes';
import programRoutes from './routes/program.routes';
import orderRoutes from './routes/order.routes';
import landingPageRoutes from './routes/landingPage.routes';
import activityLogRoutes from './routes/activityLog.routes';
import passwordResetRoutes from './routes/passwordReset.routes';
import cartRoutes from './routes/cart.routes';
import productAnalyticsRoutes from './routes/productAnalytics.routes';
import analyticsRoutes from './routes/analytics.routes';
import ecommerceRoutes from './routes/ecommerce.routes';
import notificationRoutes from './routes/notification.routes';
import membershipRoutes from './routes/membership.routes';
import doorRoutes from './routes/door.routes';
import accessRoutes from './routes/access.routes';
import doorAccessRuleRoutes from './routes/door-access-rule.routes';
import superAdminRoutes from './routes/super-admin.routes';

// Import scheduler
import { initScheduler } from './services/scheduler.service';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // CORS with configuration
app.use(securityHeaders); // Additional security headers
app.use(rateLimitMiddleware); // Rate limiting
app.use(express.json({ limit: '10mb' })); // Body parser with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput); // Input sanitization
app.use(preventSQLInjection); // SQL injection prevention
app.use(requestLogger); // Request logging
app.use(activityLogger); // Activity logging

// Trust proxy (for rate limiting with correct IP)
app.set('trust proxy', 1);

// ============================================
// STATIC FILES
// ============================================
// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/tenant-settings', tenantSettingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pt', ptRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-analytics', productAnalyticsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/landing-page', landingPageRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/door-access/doors', doorRoutes);
app.use('/api/door-access', accessRoutes);
app.use('/api/door-access', doorAccessRuleRoutes);
app.use('/api/super-admin', superAdminRoutes);

// ============================================
// ERROR HANDLING
// ============================================
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔗 Network: http://10.0.0.57:${PORT}/api`);

  // Initialize scheduled tasks
  initScheduler();
});

export default app;
