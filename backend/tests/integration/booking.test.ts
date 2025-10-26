import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('Booking Integration Tests', () => {
  let authToken: string;
  let tenantId: string;
  let classId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup: Create tenant, register user, create class
    tenantId = 'test-tenant-booking-' + Date.now();

    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `booking-test${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'Booking',
        lastName: 'Test',
        tenantId
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;

    // Create a class
    const classResponse = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Yoga Class',
        description: 'A test class for booking',
        type: 'GROUP_CLASS',
        capacity: 10,
        duration: 60,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      });

    classId = classResponse.body.data.id;
  });

  describe('Complete Booking Flow', () => {
    test('should complete full booking lifecycle', async () => {
      // 1. Book a class
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          classId,
          notes: 'First time booking'
        })
        .expect(201);

      expect(bookingResponse.body.success).toBe(true);
      const bookingId = bookingResponse.body.data.id;

      // 2. Get my bookings
      const myBookings = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(myBookings.body.data).toHaveLength(1);
      expect(myBookings.body.data[0].id).toBe(bookingId);

      // 3. Cancel the booking
      const cancelResponse = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Changed plans' })
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // 4. Verify booking is cancelled
      const updatedBookings = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const cancelledBooking = updatedBookings.body.data.find((b: any) => b.id === bookingId);
      expect(cancelledBooking.status).toBe('CANCELLED');
    });

    test('should prevent double booking', async () => {
      // First booking
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ classId })
        .expect(201);

      // Attempt duplicate booking
      const duplicateResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ classId })
        .expect(400);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error).toContain('allerede booket');
    });

    test('should respect class capacity', async () => {
      // Create a class with capacity 1
      const smallClassResponse = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Small Class',
          type: 'GROUP_CLASS',
          capacity: 1,
          duration: 60,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      const smallClassId = smallClassResponse.body.data.id;

      // First user books (should succeed)
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ classId: smallClassId })
        .expect(201);

      // Register another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `booking-test2${Date.now()}@example.com`,
          password: 'Test123!',
          firstName: 'User',
          lastName: 'Two',
          tenantId
        });

      const user2Token = user2Response.body.data.token;

      // Second user books (should fail - class full)
      const fullResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ classId: smallClassId })
        .expect(400);

      expect(fullResponse.body.success).toBe(false);
      expect(fullResponse.body.error).toContain('full');
    });
  });

  describe('Cancellation Policy', () => {
    test('should prevent cancellation less than 24h before class', async () => {
      // Create a class starting in 12 hours (less than 24h)
      const soonClassResponse = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Soon Class',
          type: 'GROUP_CLASS',
          capacity: 10,
          duration: 60,
          startTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        });

      const soonClassId = soonClassResponse.body.data.id;

      // Book the class
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ classId: soonClassId })
        .expect(201);

      const bookingId = bookingResponse.body.data.id;

      // Attempt to cancel (should fail)
      const cancelResponse = await request(app)
        .patch(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Late cancellation' })
        .expect(400);

      expect(cancelResponse.body.success).toBe(false);
      expect(cancelResponse.body.error).toContain('24');
    });
  });
});
