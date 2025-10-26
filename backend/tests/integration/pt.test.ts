import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('PT Sessions Integration Tests', () => {
  let trainerToken: string;
  let clientToken: string;
  let trainerId: string;
  let clientId: string;
  let tenantId: string;
  let sessionId: string;
  let programId: string;

  beforeAll(async () => {
    tenantId = 'test-tenant-pt-' + Date.now();

    // Register trainer
    const trainerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `pt-trainer-${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Personal',
        lastName: 'Trainer',
        tenantId,
        role: 'TRAINER'
      });

    trainerToken = trainerResponse.body.data.token;
    trainerId = trainerResponse.body.data.user.id;

    // Register client
    const clientResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `pt-client-${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'PT',
        lastName: 'Client',
        tenantId
      });

    clientToken = clientResponse.body.data.token;
    clientId = clientResponse.body.data.user.id;
  });

  describe('PT Session Management', () => {
    test('should create a new PT session as trainer', async () => {
      const sessionData = {
        clientId,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        type: 'ONE_ON_ONE',
        notes: 'First PT session - assessment',
        location: 'Main Gym'
      };

      const response = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clientId).toBe(clientId);
      expect(response.body.data.trainerId).toBe(trainerId);
      expect(response.body.data.duration).toBe(60);
      sessionId = response.body.data.id;
    });

    test('should get all PT sessions for trainer', async () => {
      const response = await request(app)
        .get('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get PT sessions for client', async () => {
      const response = await request(app)
        .get('/api/pt/sessions')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      const clientSessions = response.body.data.filter((s: any) => s.clientId === clientId);
      expect(clientSessions.length).toBeGreaterThan(0);
    });

    test('should update PT session', async () => {
      const updateData = {
        notes: 'Updated notes - completed strength assessment',
        status: 'COMPLETED'
      };

      const response = await request(app)
        .patch(`/api/pt/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toContain('Updated notes');
      expect(response.body.data.status).toBe('COMPLETED');
    });

    test('should cancel PT session', async () => {
      // Create a new session to cancel
      const sessionResponse = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          clientId,
          startTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          type: 'ONE_ON_ONE'
        });

      const cancelSessionId = sessionResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/pt/sessions/${cancelSessionId}/cancel`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          reason: 'Trainer illness'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('CANCELLED');
    });
  });

  describe('Training Programs', () => {
    test('should create training program for client', async () => {
      const programData = {
        clientId,
        name: 'Strength Building Program',
        description: '12-week strength building program',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString(),
        goals: ['Increase squat to 150kg', 'Improve overall strength'],
        exercises: [
          {
            name: 'Squats',
            sets: 4,
            reps: 8,
            weight: '100kg',
            notes: 'Focus on form'
          },
          {
            name: 'Deadlifts',
            sets: 3,
            reps: 5,
            weight: '120kg',
            notes: 'Warm up properly'
          }
        ]
      };

      const response = await request(app)
        .post('/api/pt/programs')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(programData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(programData.name);
      expect(response.body.data.exercises).toBeDefined();
      expect(response.body.data.exercises.length).toBe(2);
      programId = response.body.data.id;
    });

    test('should get training programs for client', async () => {
      const response = await request(app)
        .get('/api/pt/programs')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should update training program', async () => {
      const updateData = {
        name: 'Advanced Strength Building Program',
        exercises: [
          {
            name: 'Squats',
            sets: 5,
            reps: 5,
            weight: '110kg',
            notes: 'Progressive overload'
          }
        ]
      };

      const response = await request(app)
        .patch(`/api/pt/programs/${programId}`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    test('should log workout progress', async () => {
      const progressData = {
        programId,
        date: new Date().toISOString(),
        exercises: [
          {
            exerciseName: 'Squats',
            sets: 5,
            reps: 5,
            weight: '110kg',
            notes: 'Felt strong today'
          }
        ],
        overallNotes: 'Great workout',
        rating: 4
      };

      const response = await request(app)
        .post('/api/pt/progress')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(progressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(4);
    });
  });

  describe('PT Session Validation', () => {
    test('should not allow overlapping sessions for trainer', async () => {
      const startTime = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString();

      // Create first session
      await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          clientId,
          startTime,
          duration: 60,
          type: 'ONE_ON_ONE'
        })
        .expect(201);

      // Try to create overlapping session
      const response = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          clientId,
          startTime,
          duration: 60,
          type: 'ONE_ON_ONE'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('overlapp');
    });

    test('should not allow session in the past', async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          clientId,
          startTime: pastTime,
          duration: 60,
          type: 'ONE_ON_ONE'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should enforce minimum session duration', async () => {
      const response = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          clientId,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          duration: 10, // Too short
          type: 'ONE_ON_ONE'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Client-Trainer Relationship', () => {
    test('should not allow client to create sessions', async () => {
      const response = await request(app)
        .post('/api/pt/sessions')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          clientId,
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          type: 'ONE_ON_ONE'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should not allow client to modify other clients programs', async () => {
      // Register another client
      const otherClientResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other-client-${Date.now()}@example.com`,
          password: 'Test123!',
          firstName: 'Other',
          lastName: 'Client',
          tenantId
        });

      const otherClientToken = otherClientResponse.body.data.token;

      // Try to update program belonging to first client
      const response = await request(app)
        .patch(`/api/pt/programs/${programId}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .send({
          name: 'Unauthorized update'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PT Analytics', () => {
    test('should get trainer statistics', async () => {
      const response = await request(app)
        .get('/api/pt/stats')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSessions).toBeDefined();
      expect(response.body.data.totalClients).toBeDefined();
      expect(response.body.data.upcomingSessions).toBeDefined();
    });

    test('should get client progress overview', async () => {
      const response = await request(app)
        .get(`/api/pt/clients/${clientId}/progress`)
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSessions).toBeDefined();
      expect(response.body.data.programs).toBeDefined();
    });
  });
});
