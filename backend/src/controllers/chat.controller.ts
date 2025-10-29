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

      // Update current user's lastSeenAt
      await prisma.$executeRaw`
        UPDATE users SET "lastSeenAt" = NOW() WHERE id = ${userId}
      `;

      // Get conversations where user is a participant
      const participants = await prisma.$queryRaw<any[]>`
        SELECT
          c.*,
          (
            SELECT json_agg(json_build_object(
              'id', u.id,
              'firstName', u."firstName",
              'lastName', u."lastName",
              'avatar', u.avatar,
              'isOnline', (u."lastSeenAt" IS NOT NULL AND u."lastSeenAt" > NOW() - INTERVAL '5 minutes'),
              'lastSeen', u."lastSeenAt"
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
      const limit = parseInt(req.query.limit as string) || 1000; // Increased limit to get all messages
      const since = req.query.since as string; // Timestamp for polling new messages

      // Update current user's lastSeenAt
      await prisma.$executeRaw`
        UPDATE users SET "lastSeenAt" = NOW() WHERE id = ${userId}
      `;

      // Verify user is participant
      const participant = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (participant.length === 0) {
        throw new AppError('Ingen tilgang til denne samtalen', 403);
      }

      // Get messages with optional since clause for polling
      let messages;
      if (since) {
        // Only get messages after the provided timestamp (for polling)
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
            AND m."createdAt" > ${since}::timestamp
          ORDER BY m."createdAt" ASC
        `;
      } else {
        // Get all messages (or last N messages based on limit)
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
          ORDER BY m."createdAt" ASC
        `;
      }

      // Mark as read
      await prisma.$executeRaw`
        UPDATE conversation_participants
        SET "lastReadAt" = NOW()
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
      `;

      res.json({ success: true, data: messages });
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

      // Update current user's lastSeenAt
      await prisma.$executeRaw`
        UPDATE users SET "lastSeenAt" = NOW() WHERE id = ${userId}
      `;

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

  // Create group conversation
  async createGroupConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { groupName, participantIds } = req.body;

      if (!groupName || !groupName.trim()) {
        throw new AppError('Gruppenavn er påkrevd', 400);
      }

      if (!participantIds || participantIds.length < 2) {
        throw new AppError('Gruppechat må ha minst 2 medlemmer', 400);
      }

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

      // Create new group conversation
      const conversationId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO conversations (id, "tenantId", name, "isGroup", "groupAdmin", "createdAt", "updatedAt")
        VALUES (${conversationId}, ${tenantId}, ${groupName}, true, ${userId}, NOW(), NOW())
      `;

      // Add participants (including creator)
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
        message: 'Gruppechat opprettet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Create group conversation error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke opprette gruppechat' });
      }
    }
  }

  // Add member to group
  async addGroupMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const { userId: newMemberId } = req.body;
      const tenantId = req.tenantId!;

      if (!newMemberId) {
        throw new AppError('Bruker-ID er påkrevd', 400);
      }

      // Verify conversation is a group and user is admin
      const conversation = await prisma.$queryRaw<any[]>`
        SELECT "groupAdmin", "isGroup" FROM conversations
        WHERE id = ${conversationId} AND "tenantId" = ${tenantId}
        LIMIT 1
      `;

      if (conversation.length === 0) {
        throw new AppError('Samtale ikke funnet', 404);
      }

      if (!conversation[0].isGroup) {
        throw new AppError('Dette er ikke en gruppechat', 400);
      }

      if (conversation[0].groupAdmin !== userId) {
        throw new AppError('Bare admin kan legge til medlemmer', 403);
      }

      // Check if user is already a participant
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${newMemberId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        throw new AppError('Brukeren er allerede medlem', 400);
      }

      // Verify new member is in same tenant
      const newMember = await prisma.user.findFirst({
        where: { id: newMemberId, tenantId }
      });

      if (!newMember) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Add participant
      await prisma.$executeRaw`
        INSERT INTO conversation_participants (id, "conversationId", "userId", "joinedAt")
        VALUES (${crypto.randomUUID()}, ${conversationId}, ${newMemberId}, NOW())
      `;

      res.json({ success: true, message: 'Medlem lagt til' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Add group member error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke legge til medlem' });
      }
    }
  }

  // Remove member from group
  async removeGroupMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId, userId: memberToRemove } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify conversation is a group and user is admin
      const conversation = await prisma.$queryRaw<any[]>`
        SELECT "groupAdmin", "isGroup" FROM conversations
        WHERE id = ${conversationId} AND "tenantId" = ${tenantId}
        LIMIT 1
      `;

      if (conversation.length === 0) {
        throw new AppError('Samtale ikke funnet', 404);
      }

      if (!conversation[0].isGroup) {
        throw new AppError('Dette er ikke en gruppechat', 400);
      }

      if (conversation[0].groupAdmin !== userId) {
        throw new AppError('Bare admin kan fjerne medlemmer', 403);
      }

      if (memberToRemove === userId) {
        throw new AppError('Admin kan ikke fjerne seg selv', 400);
      }

      // Remove participant
      await prisma.$executeRaw`
        DELETE FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${memberToRemove}
      `;

      res.json({ success: true, message: 'Medlem fjernet' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Remove group member error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fjerne medlem' });
      }
    }
  }

  // Leave group
  async leaveGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;

      // Verify conversation is a group
      const conversation = await prisma.$queryRaw<any[]>`
        SELECT "groupAdmin", "isGroup" FROM conversations
        WHERE id = ${conversationId} AND "tenantId" = ${tenantId}
        LIMIT 1
      `;

      if (conversation.length === 0) {
        throw new AppError('Samtale ikke funnet', 404);
      }

      if (!conversation[0].isGroup) {
        throw new AppError('Dette er ikke en gruppechat', 400);
      }

      if (conversation[0].groupAdmin === userId) {
        throw new AppError('Admin må først overføre admin-rollen før de kan forlate gruppen', 400);
      }

      // Remove participant
      await prisma.$executeRaw`
        DELETE FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
      `;

      res.json({ success: true, message: 'Du har forlatt gruppen' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Leave group error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke forlate gruppen' });
      }
    }
  }

  // Set typing indicator
  async setTypingIndicator(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.userId;
      const { isTyping } = req.body;

      // Verify user is participant
      const participant = await prisma.$queryRaw<any[]>`
        SELECT id FROM conversation_participants
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        LIMIT 1
      `;

      if (participant.length === 0) {
        throw new AppError('Ingen tilgang til denne samtalen', 403);
      }

      // Update typing status (expires after 3 seconds)
      if (isTyping) {
        await prisma.$executeRaw`
          UPDATE conversation_participants
          SET "typingAt" = NOW()
          WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE conversation_participants
          SET "typingAt" = NULL
          WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        `;
      }

      res.json({ success: true });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Set typing indicator error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere typing status' });
      }
    }
  }

  // Get typing users
  async getTypingUsers(req: AuthRequest, res: Response): Promise<void> {
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

      // Get users who are typing (within last 3 seconds, excluding current user)
      const typingUsers = await prisma.$queryRaw<any[]>`
        SELECT u.id, u."firstName", u."lastName"
        FROM conversation_participants cp
        JOIN users u ON u.id = cp."userId"
        WHERE cp."conversationId" = ${conversationId}
          AND cp."userId" != ${userId}
          AND cp."typingAt" IS NOT NULL
          AND cp."typingAt" > NOW() - INTERVAL '3 seconds'
      `;

      res.json({ success: true, data: typingUsers });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Get typing users error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke hente typing status' });
      }
    }
  }
}
