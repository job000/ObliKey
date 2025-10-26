import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('Auth API', () => {
  let testTenantId: string;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test tenant for all auth tests
    testTenantId = 'test-tenant-' + Date.now();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenantId
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);

      testUserId = response.body.data.user.id;
      authToken = response.body.data.token;
    });

    test('should fail with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenantId
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid email', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenantId
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        tenantId: testTenantId
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('eksisterer');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!'
      };

      // First register
      await request(app)
        .post('/api/auth/register')
        .send({
          ...loginData,
          firstName: 'Test',
          lastName: 'User',
          tenantId: testTenantId
        });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    test('should fail with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    test('should sanitize XSS attempts in input', async () => {
      const xssData = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: '<script>alert("XSS")</script>',
        lastName: 'User',
        tenantId: testTenantId
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(xssData);

      if (response.status === 201) {
        expect(response.body.data.user.firstName).not.toContain('<script>');
      }
    });

    test('should prevent SQL injection in email field', async () => {
      const sqlInjection = {
        email: "admin'--",
        password: 'Test123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sqlInjection);

      // Should either fail validation or not find user
      expect(response.body.success).toBe(false);
    });
  });
});
