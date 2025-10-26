import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index';

describe('Chat Integration Tests', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let tenantId: string;
  let conversationId: string;

  beforeAll(async () => {
    tenantId = 'test-tenant-chat-' + Date.now();

    // Register first user
    const user1Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `chat-user1-${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'User',
        lastName: 'One',
        tenantId
      });

    user1Token = user1Response.body.data.token;
    user1Id = user1Response.body.data.user.id;

    // Register second user
    const user2Response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `chat-user2-${Date.now()}@example.com`,
        password: 'Test123!',
        firstName: 'User',
        lastName: 'Two',
        tenantId
      });

    user2Token = user2Response.body.data.token;
    user2Id = user2Response.body.data.user.id;
  });

  describe('Conversation Management', () => {
    test('should create a new conversation between two users', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
          title: 'Test Conversation'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.participants).toBeDefined();
      conversationId = response.body.data.id;
    });

    test('should get all conversations for user', async () => {
      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should prevent duplicate conversations between same users', async () => {
      const response = await request(app)
        .post('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('eksisterer');
    });
  });

  describe('Message Exchange', () => {
    test('should send a message in conversation', async () => {
      const messageContent = 'Hello! This is a test message.';

      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: messageContent
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(messageContent);
      expect(response.body.data.senderId).toBe(user1Id);
    });

    test('should get messages from conversation', async () => {
      const response = await request(app)
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should mark messages as read', async () => {
      // User 2 sends a message
      const sendResponse = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Reply from user 2'
        });

      const messageId = sendResponse.body.data.id;

      // User 1 marks it as read
      const response = await request(app)
        .patch(`/api/chat/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should not send empty messages', async () => {
      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should prevent unauthorized access to conversation', async () => {
      // Register a third user not in the conversation
      const user3Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `chat-user3-${Date.now()}@example.com`,
          password: 'Test123!',
          firstName: 'User',
          lastName: 'Three',
          tenantId
        });

      const user3Token = user3Response.body.data.token;

      // Try to send message in conversation they're not part of
      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          content: 'Unauthorized message'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Message Features', () => {
    test('should support message attachments', async () => {
      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Check out this file',
          attachments: [
            {
              type: 'IMAGE',
              url: 'https://example.com/image.jpg',
              filename: 'image.jpg'
            }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attachments).toBeDefined();
      expect(response.body.data.attachments.length).toBeGreaterThan(0);
    });

    test('should delete message (soft delete)', async () => {
      // Send a message
      const sendResponse = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Message to delete'
        });

      const messageId = sendResponse.body.data.id;

      // Delete the message
      const response = await request(app)
        .delete(`/api/chat/messages/${messageId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify message is marked as deleted
      const getResponse = await request(app)
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const deletedMessage = getResponse.body.data.find((m: any) => m.id === messageId);
      expect(deletedMessage.deletedAt).toBeTruthy();
    });

    test('should get unread message count', async () => {
      // User 2 sends multiple messages
      await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Unread message 1' });

      await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Unread message 2' });

      // User 1 checks conversations (should show unread count)
      const response = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const conversation = response.body.data.find((c: any) => c.id === conversationId);
      expect(conversation.unreadCount).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    test('should sanitize XSS attempts in messages', async () => {
      const xssContent = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post(`/api/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: xssContent
        });

      if (response.status === 201) {
        expect(response.body.data.content).not.toContain('<script>');
      }
    });

    test('should require authentication for all chat endpoints', async () => {
      await request(app)
        .get('/api/chat/conversations')
        .expect(401);

      await request(app)
        .post('/api/chat/conversations')
        .send({ participantIds: [user2Id] })
        .expect(401);

      await request(app)
        .get(`/api/chat/conversations/${conversationId}/messages`)
        .expect(401);
    });
  });
});
