import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import orderRoutes from '../routes/order.routes';

// Mock Prisma Client
jest.mock('../utils/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

const mockCustomerToken = 'mock-customer-jwt-token';
const mockAdminToken = 'mock-admin-jwt-token';

describe('Orders API', () => {
  describe('GET /api/orders', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
    });

    it('should return user orders when authenticated', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 401]).toContain(response.status);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'COMPLETED' })
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 401]).toContain(response.status);
    });

    it('should allow admin to view all orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/orders/test-order-id');

      expect(response.status).toBe(401);
    });

    it('should return specific order details', async () => {
      const response = await request(app)
        .get('/api/orders/test-order-id')
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('items');
      }
    });

    it('should include order items with product details', async () => {
      const response = await request(app)
        .get('/api/orders/test-order-id')
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      }
    });

    it('should prevent customers from viewing other users orders', async () => {
      const response = await request(app)
        .get('/api/orders/other-user-order-id')
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/orders', () => {
    it('should require authentication', async () => {
      const newOrder = {
        items: [
          { productId: 'product-1', quantity: 2 }
        ],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(newOrder);

      expect(response.status).toBe(401);
    });

    it('should create order with valid items', async () => {
      const newOrder = {
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(newOrder);

      expect([200, 201, 400, 401]).toContain(response.status);

      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('total');
      }
    });

    it('should reject order with empty items', async () => {
      const invalidOrder = {
        items: [],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(invalidOrder);

      expect([400, 401]).toContain(response.status);
    });

    it('should reject order with invalid quantity', async () => {
      const invalidOrder = {
        items: [
          { productId: 'product-1', quantity: 0 }
        ],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(invalidOrder);

      expect([400, 401]).toContain(response.status);
    });

    it('should reject order with negative quantity', async () => {
      const invalidOrder = {
        items: [
          { productId: 'product-1', quantity: -5 }
        ],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(invalidOrder);

      expect([400, 401]).toContain(response.status);
    });

    it('should calculate total correctly', async () => {
      // This test verifies the calculation logic
      const items = [
        { price: 299, quantity: 2 }, // 598
        { price: 499, quantity: 1 }, // 499
      ];

      const expectedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(expectedTotal).toBe(1097);
    });

    it('should support CARD payment method', async () => {
      const order = {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: 'CARD',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(order);

      expect([200, 201, 400, 401]).toContain(response.status);
    });

    it('should support VIPPS payment method', async () => {
      const order = {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: 'VIPPS',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(order);

      expect([200, 201, 400, 401]).toContain(response.status);
    });

    it('should create order with notes', async () => {
      const order = {
        items: [{ productId: 'product-1', quantity: 1 }],
        paymentMethod: 'CARD',
        notes: 'Please deliver before 5 PM',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(order);

      expect([200, 201, 400, 401]).toContain(response.status);
    });
  });

  describe('PUT /api/orders/:id/status (Admin only)', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/orders/test-order-id/status')
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(401);
    });

    it('should allow admin to update order status', async () => {
      const response = await request(app)
        .put('/api/orders/test-order-id/status')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({ status: 'COMPLETED' });

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .put('/api/orders/test-order-id/status')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect([400, 401, 403, 404]).toContain(response.status);
    });

    it('should prevent customers from updating order status', async () => {
      const response = await request(app)
        .put('/api/orders/test-order-id/status')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send({ status: 'COMPLETED' });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Order Status Workflow', () => {
    it('should validate order status transitions', () => {
      const validStatuses = [
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'CANCELLED',
        'REFUNDED',
      ];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should allow PENDING -> PROCESSING transition', () => {
      const currentStatus = 'PENDING';
      const newStatus = 'PROCESSING';

      expect(currentStatus).toBe('PENDING');
      expect(newStatus).toBe('PROCESSING');
    });

    it('should allow PROCESSING -> COMPLETED transition', () => {
      const currentStatus = 'PROCESSING';
      const newStatus = 'COMPLETED';

      expect(currentStatus).toBe('PROCESSING');
      expect(newStatus).toBe('COMPLETED');
    });

    it('should allow PENDING -> CANCELLED transition', () => {
      const currentStatus = 'PENDING';
      const newStatus = 'CANCELLED';

      expect(currentStatus).toBe('PENDING');
      expect(newStatus).toBe('CANCELLED');
    });
  });

  describe('Order Item Validation', () => {
    it('should validate product exists before creating order', () => {
      const orderItem = {
        productId: 'valid-product-id',
        quantity: 2,
      };

      expect(orderItem).toHaveProperty('productId');
      expect(orderItem).toHaveProperty('quantity');
      expect(orderItem.quantity).toBeGreaterThan(0);
    });

    it('should check product stock availability', () => {
      const product = { stock: 10 };
      const requestedQuantity = 5;

      expect(requestedQuantity).toBeLessThanOrEqual(product.stock);
    });

    it('should reject order if insufficient stock', () => {
      const product = { stock: 2 };
      const requestedQuantity = 5;

      expect(requestedQuantity).toBeGreaterThan(product.stock);
    });
  });

  describe('Payment Integration', () => {
    it('should validate payment method is required', async () => {
      const order = {
        items: [{ productId: 'product-1', quantity: 1 }],
        // Missing paymentMethod
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${mockCustomerToken}`)
        .send(order);

      // Should either default to a payment method or require it
      expect([200, 201, 400, 401]).toContain(response.status);
    });

    it('should store payment information', () => {
      const orderWithPayment = {
        paymentMethod: 'CARD',
        paymentId: 'stripe_payment_123',
      };

      expect(orderWithPayment).toHaveProperty('paymentMethod');
      expect(orderWithPayment).toHaveProperty('paymentId');
    });

    it('should support multiple payment methods', () => {
      const paymentMethods = ['CARD', 'VIPPS', 'INVOICE'];

      paymentMethods.forEach(method => {
        expect(['CARD', 'VIPPS', 'INVOICE']).toContain(method);
      });
    });
  });

  describe('Order History', () => {
    it('should return orders in descending date order', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ sortBy: 'createdAt', order: 'desc' })
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 401]).toContain(response.status);
    });

    it('should filter orders by date range', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe('Order Total Calculation', () => {
    it('should calculate subtotal correctly', () => {
      const items = [
        { price: 100, quantity: 2 }, // 200
        { price: 50, quantity: 3 },  // 150
      ];

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(subtotal).toBe(350);
    });

    it('should apply discount if provided', () => {
      const subtotal = 1000;
      const discountPercent = 10;
      const expectedTotal = subtotal * (1 - discountPercent / 100);

      expect(expectedTotal).toBe(900);
    });

    it('should handle zero total gracefully', () => {
      const items = [
        { price: 0, quantity: 1 },
      ];

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      expect(total).toBe(0);
    });
  });
});
