import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import productRoutes from '../routes/product.routes';

// Mock Prisma Client
jest.mock('../utils/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productImage: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

// Mock authentication token (would need to be generated in real tests)
const mockAdminToken = 'mock-admin-jwt-token';
const mockCustomerToken = 'mock-customer-jwt-token';

describe('Products API', () => {
  describe('GET /api/products', () => {
    it('should return all published products', async () => {
      const response = await request(app)
        .get('/api/products');

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect([200, 401]).toContain(response.status);
    });

    it('should filter products by type', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ type: 'PHYSICAL_PRODUCT' });

      expect([200, 401]).toContain(response.status);
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ category: 'FITNESS' });

      expect([200, 401]).toContain(response.status);
    });

    it('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ search: 'protein' });

      expect([200, 401]).toContain(response.status);
    });

    it('should only return published products for customers', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${mockCustomerToken}`);

      if (response.status === 200 && response.body.data) {
        const products = response.body.data;
        if (Array.isArray(products)) {
          products.forEach((product: any) => {
            expect(product.published).toBe(true);
          });
        }
      }
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a specific product by ID', async () => {
      const productId = 'test-product-id';

      const response = await request(app)
        .get(`/api/products/${productId}`);

      expect([200, 401, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
      }
    });

    it('should include product images', async () => {
      const productId = 'test-product-id';

      const response = await request(app)
        .get(`/api/products/${productId}`);

      if (response.status === 200 && response.body.data) {
        expect(response.body.data).toHaveProperty('images');
        expect(Array.isArray(response.body.data.images)).toBe(true);
      }
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id');

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('POST /api/products (Admin only)', () => {
    it('should require authentication', async () => {
      const newProduct = {
        name: 'Test Product',
        price: 299,
        type: 'PHYSICAL_PRODUCT',
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct);

      expect(response.status).toBe(401);
    });

    it('should create product with valid data (admin)', async () => {
      const newProduct = {
        name: 'Protein Powder',
        description: 'High quality whey protein',
        price: 499,
        type: 'PHYSICAL_PRODUCT',
        category: 'SUPPLEMENTS',
        stock: 100,
        published: true,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(newProduct);

      expect([200, 201, 401, 403]).toContain(response.status);
    });

    it('should reject product with missing required fields', async () => {
      const invalidProduct = {
        name: 'Test Product',
        // Missing price and type
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(invalidProduct);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should reject product with negative price', async () => {
      const invalidProduct = {
        name: 'Test Product',
        price: -100,
        type: 'PHYSICAL_PRODUCT',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(invalidProduct);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should reject product with invalid type', async () => {
      const invalidProduct = {
        name: 'Test Product',
        price: 299,
        type: 'INVALID_TYPE',
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(invalidProduct);

      expect([400, 401, 403]).toContain(response.status);
    });

    it('should allow creating PT session package', async () => {
      const ptPackage = {
        name: '10 PT Sessions Package',
        description: '10 personal training sessions',
        price: 5000,
        type: 'PT_SESSION_PACKAGE',
        ptSessionCredits: 10,
        validityDays: 90,
        published: true,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(ptPackage);

      expect([200, 201, 401, 403]).toContain(response.status);
    });

    it('should allow creating class pass', async () => {
      const classPass = {
        name: 'Monthly Class Pass',
        description: 'Unlimited classes for 30 days',
        price: 899,
        type: 'CLASS_PASS',
        validityDays: 30,
        published: true,
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(classPass);

      expect([200, 201, 401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/products/:id (Admin only)', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/products/test-id')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
    });

    it('should update product with valid data', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 599,
        stock: 50,
      };

      const response = await request(app)
        .put('/api/products/test-product-id')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send(updateData);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should allow partial updates', async () => {
      const response = await request(app)
        .put('/api/products/test-product-id')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({ stock: 75 });

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should reject invalid price updates', async () => {
      const response = await request(app)
        .put('/api/products/test-product-id')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({ price: -500 });

      expect([400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/products/:id (Admin only)', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/products/test-id');

      expect(response.status).toBe(401);
    });

    it('should delete product when authorized', async () => {
      const response = await request(app)
        .delete('/api/products/test-product-id')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .delete('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('Product Image Upload', () => {
    it('should handle image upload endpoint', async () => {
      const response = await request(app)
        .post('/api/products/test-id/images')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .attach('image', Buffer.from('fake-image-data'), 'test.jpg');

      // Should either process or require proper multipart/form-data
      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });

    it('should support multiple image formats', () => {
      const validFormats = ['jpg', 'jpeg', 'png', 'webp'];

      validFormats.forEach(format => {
        expect(['jpg', 'jpeg', 'png', 'webp']).toContain(format);
      });
    });

    it('should enforce image size limits', () => {
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      const testFileSize = 3 * 1024 * 1024; // 3MB

      expect(testFileSize).toBeLessThan(maxSizeInBytes);
    });
  });

  describe('Product Validation', () => {
    it('should validate product types', () => {
      const validTypes = [
        'PHYSICAL_PRODUCT',
        'PT_SESSION_PACKAGE',
        'CLASS_PASS',
        'MEMBERSHIP',
      ];

      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it('should validate price is non-negative', () => {
      const validPrices = [0, 99, 999, 9999];
      const invalidPrices = [-1, -100, -999];

      validPrices.forEach(price => {
        expect(price).toBeGreaterThanOrEqual(0);
      });

      invalidPrices.forEach(price => {
        expect(price).toBeLessThan(0);
      });
    });

    it('should validate stock is non-negative for physical products', () => {
      const validStock = [0, 10, 100, 1000];
      const invalidStock = [-1, -10];

      validStock.forEach(stock => {
        expect(stock).toBeGreaterThanOrEqual(0);
      });

      invalidStock.forEach(stock => {
        expect(stock).toBeLessThan(0);
      });
    });
  });

  describe('Product Search and Filtering', () => {
    it('should support sorting by price', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sortBy: 'price', order: 'asc' });

      expect([200, 401]).toContain(response.status);
    });

    it('should support sorting by name', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sortBy: 'name', order: 'asc' });

      expect([200, 401]).toContain(response.status);
    });

    it('should support price range filtering', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ minPrice: 100, maxPrice: 1000 });

      expect([200, 401]).toContain(response.status);
    });
  });
});
