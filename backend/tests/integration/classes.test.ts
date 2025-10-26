import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('Classes Integration Tests', () => {
  let authToken: string;
  let tenantId: string;
  let trainerToken: string;
  let classId: string;

  beforeAll(async () => {
    // Setup: Create tenant and users
    tenantId = 'test-tenant-classes-' + Date.now();

    // Register admin/trainer user
    const trainerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `trainer${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Trainer',
        lastName: 'Test',
        tenantId,
        role: 'TRAINER'
      });

    trainerToken = trainerResponse.body.data.token;

    // Register regular user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `user${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'User',
        lastName: 'Test',
        tenantId
      });

    authToken = userResponse.body.data.token;
  });

  describe('Class CRUD Operations', () => {
    test('should create a new class as trainer', async () => {
      const classData = {
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        type: 'GROUP_CLASS',
        capacity: 15,
        duration: 60,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(classData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(classData.name);
      expect(response.body.data.capacity).toBe(classData.capacity);
      classId = response.body.data.id;
    });

    test('should get all classes', async () => {
      const response = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get single class by ID', async () => {
      const response = await request(app)
        .get(`/api/classes/${classId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(classId);
      expect(response.body.data.name).toBeDefined();
    });

    test('should update class as trainer', async () => {
      const updateData = {
        name: 'Advanced Morning Yoga',
        capacity: 20
      };

      const response = await request(app)
        .patch(`/api/classes/${classId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.capacity).toBe(updateData.capacity);
    });

    test('should not allow regular user to create class', async () => {
      const classData = {
        name: 'Unauthorized Class',
        type: 'GROUP_CLASS',
        capacity: 10,
        duration: 60,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(classData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should delete class as trainer', async () => {
      // Create a class to delete
      const classResponse = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          name: 'Class to Delete',
          type: 'GROUP_CLASS',
          capacity: 10,
          duration: 60,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });

      const deleteClassId = classResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/classes/${deleteClassId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify class is deleted
      await request(app)
        .get(`/api/classes/${deleteClassId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Class Filtering and Searching', () => {
    test('should filter classes by type', async () => {
      const response = await request(app)
        .get('/api/classes?type=GROUP_CLASS')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((cls: any) => {
        expect(cls.type).toBe('GROUP_CLASS');
      });
    });

    test('should filter classes by date range', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/classes?startDate=${tomorrow.toISOString()}&endDate=${nextWeek.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should search classes by name', async () => {
      const response = await request(app)
        .get('/api/classes?search=Yoga')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Class Validation', () => {
    test('should fail with missing required fields', async () => {
      const invalidData = {
        name: 'Invalid Class'
        // Missing type, capacity, duration, startTime
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid capacity', async () => {
      const invalidData = {
        name: 'Invalid Capacity Class',
        type: 'GROUP_CLASS',
        capacity: -5, // Invalid negative capacity
        duration: 60,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail with past start time', async () => {
      const invalidData = {
        name: 'Past Class',
        type: 'GROUP_CLASS',
        capacity: 10,
        duration: 60,
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      };

      const response = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
