import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class ChatController {
  // Get all conversations for current user
  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Get conversations where user is a participant
      const participants = await prisma.$queryRaw<any[]>`
        SELECT
          c.*,
          (
            SELECT json_agg(json_build_object(
              'id', u.id,
              'firstName', u."firstName",
              'lastName', u."lastName",
              'avatar', u.avatar
            ))
            FROM conversation_participants cp
            JOIN users u ON u.id = cp."userId"
            WHERE cp."conversationId" = c.id AND cp."userId" != ${userId}
          ) as participants,
          (
            SELECT json_build_object(
              'id', m.id,
              'content', m.content,
              'createdAt', m."createdAt",
              'sender', json_build_object(
                'id', s.id,
                'firstName', s."firstName",
                'lastName', s."lastName"
              )
            )
            FROM messages m
            JOIN users s ON s.id = m."senderId"
            WHERE m."conversationId" = c.id AND m.deleted = false
            ORDER BY m."createdAt" DESC
            LIMIT 1
          ) as "lastMessage",
          (
            SELECT COUNT(*)
            FROM messages m
            LEFT JOIN conversation_participants cp ON cp."conversationId" = m."conversationId" AND cp."userId" = ${userId}
            WHERE m."conversationId" = c.id
              AND m.deleted = false
              AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
              AND m."senderId" != ${userId}
          )::int as "unreadCount"
        FROM conversations c
        JOIN conversation_participants p ON p."conversationId" = c.id
        WHERE p."userId" = ${userId} AND c."tenantId" = ${tenantId}
        ORDER BY (
          SELECT MAX(m."createdAt")
          FROM messages m
          WHERE m."conversationId" = c.id AND m.deleted = false
        ) DESC NULLS LAST
      `;

      res.json({ success: true, data: participants });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente samtaler' });
    }
  }

  // Create or get existing conversation
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { participantIds, name, isGroup } = req.body;

      // Validate participants are in same tenant
      const participants = await prisma.user.findMany({
        where: {
          id: { in: participantIds },
          tenantId
        }
      });

      if (participants.length !== participantIds.length) {
        throw new AppError('Noen deltakere ble ikke funnet', 400);
      }

      // For 1-on-1, check if conversation already exists
      if (!isGroup && participantIds.length === 1) {
        const existing = await prisma.$queryRaw<any[]>`
          SELECT c.id
          FROM conversations c
          WHERE c."tenantId" = ${tenantId} AND c."isGroup" = false
            AND EXISTS (
              SELECT 1 FROM conversation_participants WHERE "conversationId" = c.id AND "userId" = ${userId}
            )
            AND EXISTS (
              SELECT 1 FROM conversation_participants WHERE "conversationId" = c.id AND "userId" = ${participantIds[0]}
            )
            AND (SELECT COUNT(*) FROM conversation_participants WHERE "conversationId" = c.id) = 2
          LIMIT 1
        `;

        if (existing.length > 0) {
          res.json({ success: true, data: { id: existing[0].id } });
          return;
        }
      }

      // Create new conversation
      const conversationId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO conversations (id, "tenantId", name, "isGroup", "createdAt", "updatedAt")
        VALUES (${conversationId}, ${tenantId}, ${name || null}, ${isGroup || false}, NOW(), NOW())
      `;

      // Add participants
      const allParticipants = [userId, ...participantIds];
      for (const participantId of allParticipants) {
        await prisma.$executeRaw`
          INSERT INTO conversation_participants (id, "conversationId", "userId", "joinedAt")
          VALUES (${crypto.randomUUID()}, ${conversationId}, ${participantId}, NOW())
        `;
      }

      res.status(201).json({
        success: true,
        data: { id: conversationId },
        message: 'Samtale opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette samtale' });
      }
    }
  }

  // Get messages in a conversation
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string; // Message ID for pagination

      // Verify user is participant
      const participant = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (participant.length === 0) {
        throw new AppError('Ingen tilgang til denne samtalen', 403);
      }

      // Get messages with optional before clause
      let messages;
      if (before) {
        messages = await prisma.$queryRaw<any[]>`
          SELECT
            m.*,
            json_build_object(
              'id', u.id,
              'firstName', u."firstName",
              'lastName', u."lastName",
              'avatar', u.avatar
            ) as sender
          FROM messages m
          JOIN users u ON u.id = m."senderId"
          WHERE m."conversationId" = ${conversationId}
            AND m.deleted = false
            AND m."createdAt" < (SELECT "createdAt" FROM messages WHERE id = ${before})
          ORDER BY m."createdAt" DESC
          LIMIT ${limit}
        `;
      } else {
        messages = await prisma.$queryRaw<any[]>`
          SELECT
            m.*,
            json_build_object(
              'id', u.id,
              'firstName', u."firstName",
              'lastName', u."lastName",
              'avatar', u.avatar
            ) as sender
          FROM messages m
          JOIN users u ON u.id = m."senderId"
          WHERE m."conversationId" = ${conversationId}
            AND m.deleted = false
          ORDER BY m."createdAt" DESC
          LIMIT ${limit}
        `;
      }

      // Mark as read
      await prisma.$executeRaw`
        UPDATE conversation_participants
        SET "lastReadAt" = NOW()
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
      `;

      res.json({ success: true, data: messages.reverse() });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente meldinger' });
      }
    }
  }

  // Send message
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const { content, type, attachmentUrl } = req.body;

      // Verify user is participant
      const participant = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (participant.length === 0) {
        throw new AppError('Ingen tilgang til denne samtalen', 403);
      }

      // Create message
      const messageId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO messages (id, "conversationId", "senderId", content, type, "attachmentUrl", "createdAt", "updatedAt")
        VALUES (${messageId}, ${conversationId}, ${userId}, ${content}, ${type || 'text'}, ${attachmentUrl || null}, NOW(), NOW())
      `;

      // Get created message with sender info
      const message = await prisma.$queryRaw<any[]>`
        SELECT
          m.*,
          json_build_object(
            'id', u.id,
            'firstName', u."firstName",
            'lastName', u."lastName",
            'avatar', u.avatar
          ) as sender
        FROM messages m
        JOIN users u ON u.id = m."senderId"
        WHERE m.id = ${messageId}
      `;

      res.status(201).json({
        success: true,
        data: message[0],
        message: 'Melding sendt'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke sende melding' });
      }
    }
  }

  // Delete message
  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify user is sender
      const message = await prisma.$queryRaw<any[]>`
        SELECT "senderId" FROM messages WHERE id = ${id} LIMIT 1
      `;

      if (message.length === 0) {
        throw new AppError('Melding ikke funnet', 404);
      }

      if (message[0].senderId !== userId) {
        throw new AppError('Du kan kun slette dine egne meldinger', 403);
      }

      // Soft delete
      await prisma.$executeRaw`
        UPDATE messages SET deleted = true, "updatedAt" = NOW() WHERE id = ${id}
      `;

      res.json({ success: true, message: 'Melding slettet' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke slette melding' });
      }
    }
  }

  // Get unread messages count
  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COALESCE(SUM(unread), 0)::int as count
        FROM (
          SELECT COUNT(*) as unread
          FROM messages m
          JOIN conversation_participants cp ON cp."conversationId" = m."conversationId"
          WHERE cp."userId" = ${userId}
            AND m.deleted = false
            AND m."senderId" != ${userId}
            AND (cp."lastReadAt" IS NULL OR m."createdAt" > cp."lastReadAt")
          GROUP BY m."conversationId"
        ) subquery
      `;

      res.json({ success: true, data: { count: Number(result[0]?.count || 0) } });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente uleste meldinger' });
    }
  }

  // Get available users to chat with
  async getAvailableUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const userRole = req.user!.role;

      // Get users based on role permissions
      let users;

      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        // Admins can chat with everyone
        users = await prisma.user.findMany({
          where: {
            tenantId,
            active: true,
            id: { not: userId }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          },
          orderBy: { firstName: 'asc' }
        });
      } else if (userRole === 'TRAINER') {
        // Trainers can chat with their customers and admins
        users = await prisma.user.findMany({
          where: {
            tenantId,
            active: true,
            id: { not: userId },
            OR: [
              { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
              { role: 'CUSTOMER' }
            ]
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          },
          orderBy: { firstName: 'asc' }
        });
      } else {
        // Customers can chat with trainers and admins
        users = await prisma.user.findMany({
          where: {
            tenantId,
            active: true,
            id: { not: userId },
            role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          },
          orderBy: { firstName: 'asc' }
        });
      }

      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get available users error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente brukere' });
    }
  }

  // Start support chat (for customers)
  async startSupportChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Find all admins in tenant
      const admins = await prisma.user.findMany({
        where: {
          tenantId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          active: true
        },
        select: { id: true }
      });

      if (admins.length === 0) {
        throw new AppError('Ingen administratorer tilgjengelig', 404);
      }

      const adminIds = admins.map(admin => admin.id);

      // Check if support conversation already exists
      const existing = await prisma.$queryRaw<any[]>`
        SELECT c.id
        FROM conversations c
        WHERE c."tenantId" = ${tenantId}
          AND c.name = 'Support'
          AND EXISTS (
            SELECT 1 FROM conversation_participants WHERE "conversationId" = c.id AND "userId" = ${userId}
          )
        LIMIT 1
      `;

      if (existing.length > 0) {
        res.json({ success: true, data: { id: existing[0].id } });
        return;
      }

      // Create new support conversation
      const conversationId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO conversations (id, "tenantId", name, "isGroup", "createdAt", "updatedAt")
        VALUES (${conversationId}, ${tenantId}, 'Support', ${adminIds.length > 1}, NOW(), NOW())
      `;

      // Add customer and all admins as participants
      const allParticipants = [userId, ...adminIds];
      for (const participantId of allParticipants) {
        await prisma.$executeRaw`
          INSERT INTO conversation_participants (id, "conversationId", "userId", "joinedAt")
          VALUES (${crypto.randomUUID()}, ${conversationId}, ${participantId}, NOW())
        `;
      }

      res.status(201).json({
        success: true,
        data: { id: conversationId },
        message: 'Support-samtale opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Start support chat error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette support-samtale' });
      }
    }
  }

  // Mark conversation as read
  async markConversationAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;

      // Verify user is participant
      const participant = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (participant.length === 0) {
        throw new AppError('Ingen tilgang til denne samtalen', 403);
      }

      // Update last read timestamp
      await prisma.$executeRaw`
        UPDATE conversation_participants
        SET "lastReadAt" = NOW()
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
      `;

      res.json({ success: true, message: 'Samtale merket som lest' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Mark conversation as read error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke merke samtale som lest' });
      }
    }
  }

  // Toggle chat module
  async toggleChatModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { enabled } = req.body;

      if (enabled === undefined) {
        throw new AppError('Status er påkrevd', 400);
      }

      // Get or create tenant settings
      let settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      if (!settings) {
        // Create default settings if they don't exist
        settings = await prisma.tenantSettings.create({
          data: {
            tenantId,
            chatEnabled: enabled
          }
        });
      } else {
        // Update existing settings
        settings = await prisma.tenantSettings.update({
          where: { tenantId },
          data: { chatEnabled: enabled }
        });
      }

      res.json({
        success: true,
        data: settings,
        message: enabled ? 'Chat-modulen er aktivert' : 'Chat-modulen er deaktivert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Toggle chat module error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere modulstatus' });
      }
    }
  }

  // Get chat module status
  async getChatModuleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { chatEnabled: true }
      });

      res.json({
        success: true,
        data: {
          chatEnabled: settings?.chatEnabled !== false // Default to true if not set
        }
      });
    } catch (error) {
      console.error('Get chat module status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente modulstatus' });
    }
  }
}
