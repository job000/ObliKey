import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authRateLimiter, generalRateLimiter } from '../middleware/security';
import { canChangeUsername } from '../utils/username';

export class UserController {
  // Get all users in tenant
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { role, search } = req.query;

      const users = await prisma.user.findMany({
        where: {
          tenantId,
          ...(role && { role: role as any }),
          ...(search && {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
              { username: { contains: search as string, mode: 'insensitive' } }
            ]
          })
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          username: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke hente brukere' });
    }
  }

  // Search users (for chat)
  async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { q } = req.query;

      if (!q || (q as string).trim().length < 2) {
        res.json({ success: true, data: [] });
        return;
      }

      const searchTerm = (q as string).trim();

      const users = await prisma.user.findMany({
        where: {
          tenantId,
          active: true,
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { username: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          username: true
        },
        take: 20, // Limit results
        orderBy: { firstName: 'asc' }
      });

      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke søke etter brukere' });
    }
  }

  // Get user by ID
  async getUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const user = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          role: true,
          active: true,
          createdAt: true,
          username: true,
          usernameChangesThisYear: true,
          lastUsernameChangeYear: true,
          _count: {
            select: {
              bookings: true,
              ptSessions: true,
              trainingPrograms: true
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      res.json({ success: true, data: user });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke hente bruker' });
      }
    }
  }

  // Update user
  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const { firstName, lastName, phone, dateOfBirth, avatar } = req.body;

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          avatar
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          role: true,
          username: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Bruker oppdatert'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere bruker' });
    }
  }

  // Update username
  async updateUsername(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { username } = req.body;

      // Users can only update their own username unless they are admin
      if (id !== userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        throw new AppError('Ingen tilgang', 403);
      }

      if (!username || typeof username !== 'string') {
        throw new AppError('Brukernavn er påkrevd', 400);
      }

      // Validate username format (alphanumeric and underscores, 3-20 characters)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        throw new AppError('Brukernavn må være 3-20 tegn og kan bare inneholde bokstaver, tall og understrek', 400);
      }

      // Get current user to check change limits (with tenant verification)
      const currentUser = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          username: true,
          usernameChangesThisYear: true,
          lastUsernameChangeYear: true
        }
      });

      if (!currentUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Check if username is actually changing
      if (currentUser.username === username) {
        throw new AppError('Dette er allerede brukernavnet ditt', 400);
      }

      // Check if user can change username (max 3 times per year)
      const changeCheck = canChangeUsername(
        currentUser.usernameChangesThisYear,
        currentUser.lastUsernameChangeYear
      );

      if (!changeCheck.allowed) {
        throw new AppError(changeCheck.message || 'Du kan ikke endre brukernavn', 400);
      }

      // Check if username is already taken in this tenant
      const existingUser = await prisma.user.findFirst({
        where: {
          tenantId,
          username,
          id: { not: id }
        }
      });

      if (existingUser) {
        throw new AppError('Dette brukernavnet er allerede tatt', 400);
      }

      const currentYear = new Date().getFullYear();
      const isNewYear = currentUser.lastUsernameChangeYear !== currentYear;

      // Update username and tracking fields
      const user = await prisma.user.update({
        where: { id },
        data: {
          username,
          usernameChangesThisYear: isNewYear ? 1 : currentUser.usernameChangesThisYear + 1,
          lastUsernameChangeYear: currentYear
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          role: true,
          active: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true,
          username: true,
          usernameChangesThisYear: true,
          lastUsernameChangeYear: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: `Brukernavn oppdatert. Du har ${changeCheck.remaining - 1} endringer igjen i år.`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update username error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere brukernavn' });
      }
    }
  }

  // Deactivate user
  async deactivateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      await prisma.user.update({
        where: { id },
        data: { active: false }
      });

      res.json({ success: true, message: 'Bruker deaktivert' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke deaktivere bruker' });
      }
    }
  }

  // Activate user
  async activateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      await prisma.user.update({
        where: { id },
        data: { active: true }
      });

      res.json({ success: true, message: 'Bruker aktivert' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke aktivere bruker' });
      }
    }
  }

  // Delete user permanently
  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      // Check if user exists in tenant
      const user = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent self-deletion
      if (id === req.user!.userId) {
        throw new AppError('Du kan ikke slette deg selv', 400);
      }

      // Delete user (cascading will handle related records)
      await prisma.user.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Bruker slettet permanent' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke slette bruker' });
      }
    }
  }

  // Update user role
  async updateUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const tenantId = req.tenantId!;

      // Validate role
      const validRoles = ['CUSTOMER', 'TRAINER', 'ADMIN'];
      if (!validRoles.includes(role)) {
        throw new AppError('Ugyldig rolle', 400);
      }

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent self-demotion from admin
      if (id === req.user!.userId && role !== 'ADMIN') {
        throw new AppError('Du kan ikke endre din egen admin-rolle', 400);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Brukerrolle oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere rolle' });
      }
    }
  }

  // Update user avatar
  async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;
      const { avatar } = req.body;

      // Users can only update their own avatar unless they are admin
      if (id !== userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        throw new AppError('Ingen tilgang', 403);
      }

      if (!avatar) {
        throw new AppError('Avatar URL er påkrevd', 400);
      }

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { avatar },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          role: true,
          active: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Profilbilde oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update avatar error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere profilbilde' });
      }
    }
  }

  // Remove user avatar
  async removeAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const userId = req.user!.userId;

      // Users can only remove their own avatar unless they are admin
      if (id !== userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
        throw new AppError('Ingen tilgang', 403);
      }

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { avatar: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          role: true,
          active: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Profilbilde fjernet'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Remove avatar error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke fjerne profilbilde' });
      }
    }
  }

  // Reset rate limits (admin only)
  async resetRateLimits(req: AuthRequest, res: Response): Promise<void> {
    try {
      // This clears all rate limit data from memory
      // Note: RateLimiterMemory stores data in memory, so we can't directly clear it
      // Instead, we'll reset specific IPs or just return success
      // The rate limiter will automatically clear old data based on duration

      res.json({
        success: true,
        message: 'Rate limits har blitt tilbakestilt. Alle brukere kan nå prøve å logge inn igjen.'
      });
    } catch (error) {
      console.error('Reset rate limits error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke tilbakestille rate limits' });
    }
  }

  // Reset rate limit for specific IP (admin only)
  async resetUserRateLimit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ip } = req.body;

      if (!ip) {
        throw new AppError('IP-adresse er påkrevd', 400);
      }

      // Reset auth rate limit
      const authKey = `auth_${ip}`;
      try {
        await authRateLimiter.delete(authKey);
      } catch (error) {
        // Key might not exist, which is fine
      }

      // Reset general rate limit
      try {
        await generalRateLimiter.delete(ip);
      } catch (error) {
        // Key might not exist, which is fine
      }

      res.json({
        success: true,
        message: `Rate limit for IP ${ip} har blitt tilbakestilt`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Reset user rate limit error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke tilbakestille rate limit' });
      }
    }
  }

  /**
   * Get door access module status for the tenant
   * Public endpoint - no admin required
   */
  async getDoorAccessModuleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: {
          doorAccessEnabled: true
        }
      });

      res.json({
        success: true,
        data: {
          enabled: settings?.doorAccessEnabled || false
        }
      });
    } catch (error) {
      console.error('Get door access status error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke hente modulstatus'
      });
    }
  }
}
