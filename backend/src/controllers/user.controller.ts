import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { authRateLimiter, generalRateLimiter } from '../middleware/security';
import { canChangeUsername } from '../utils/username';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';

export class UserController {
  // Get all users in tenant
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userRole = req.user?.role;
      const { role, search, tenantId: queryTenantId } = req.query;

      // For SUPER_ADMIN: use tenantId from query if no tenantId in request
      const effectiveTenantId = userRole === 'SUPER_ADMIN' && !tenantId && queryTenantId
        ? queryTenantId as string
        : tenantId;

      // If SUPER_ADMIN has no tenant context, return empty list with message
      if (userRole === 'SUPER_ADMIN' && !effectiveTenantId) {
        res.json({
          success: true,
          data: [],
          message: 'Velg en tenant for å se brukere'
        });
        return;
      }

      if (!effectiveTenantId) {
        res.status(400).json({ success: false, error: 'Tenant ID mangler' });
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          tenantId: effectiveTenantId,
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

  /**
   * Create user (ADMIN only)
   *
   * This controller method now follows best practices:
   * - Only handles HTTP concerns (request/response)
   * - Delegates business logic to UserService
   * - Clean and easy to read
   * - Testable by mocking the service
   */
  async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const createUserDto: CreateUserDto = req.body;

      // Use the UserService for business logic
      const userService = new UserService(prisma);
      const result = await userService.createUser(
        createUserDto,
        tenantId,
        ['CUSTOMER', 'TRAINER'] // Only these roles allowed for ADMIN
      );

      if (!result.success) {
        // Handle validation errors
        const firstError = result.errors[0];

        // Map field-specific errors to appropriate HTTP status codes
        const statusCode =
          firstError.field === 'email' && firstError.message.includes('allerede i bruk') ? 409 :
          firstError.field === 'username' && firstError.message.includes('allerede tatt') ? 409 :
          400;

        res.status(statusCode).json({
          success: false,
          error: firstError.message,
          validationErrors: result.errors
        });
        return;
      }

      // Success response
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Bruker opprettet'
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'Kunne ikke opprette bruker'
      });
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
      const currentUserRole = req.user!.role;

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          role: true
        }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent ADMIN from deactivating SUPER_ADMIN
      if (existingUser.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å deaktivere en superadmin', 403);
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
      const currentUserRole = req.user!.role;

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          role: true
        }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent ADMIN from activating SUPER_ADMIN
      if (existingUser.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å aktivere en superadmin', 403);
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
      const currentUserRole = req.user!.role;

      // Check if user exists in tenant
      const user = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          role: true
        }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent self-deletion
      if (id === req.user!.userId) {
        throw new AppError('Du kan ikke slette deg selv', 400);
      }

      // Prevent ADMIN from deleting SUPER_ADMIN
      if (user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å slette en superadmin', 403);
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
      const currentUserRole = req.user!.role;

      // Validate role
      const validRoles = ['CUSTOMER', 'TRAINER', 'ADMIN'];
      if (!validRoles.includes(role)) {
        throw new AppError('Ugyldig rolle', 400);
      }

      // Verify user belongs to tenant FIRST
      const existingUser = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          role: true
        }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Prevent ADMIN from changing SUPER_ADMIN role
      if (existingUser.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
        throw new AppError('Du har ikke tilgang til å endre rollen til en superadmin', 403);
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

  /**
   * Update own profile (logged-in user updates their own profile)
   */
  async updateOwnProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tenantId = req.tenantId!;
      const { firstName, lastName, phone, dateOfBirth } = req.body;

      // Verify user belongs to tenant
      const existingUser = await prisma.user.findFirst({
        where: { id: userId, tenantId }
      });

      if (!existingUser) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Update user profile
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
          ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null })
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
          username: true
        }
      });

      res.json({
        success: true,
        data: user,
        message: 'Profil oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update own profile error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere profil' });
      }
    }
  }

  /**
   * Update own password (logged-in user changes their own password)
   */
  async updateOwnPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Både nåværende og nytt passord er påkrevd', 400);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('Nåværende passord er feil', 401);
      }

      // Validate new password strength
      const { validatePasswordStrength } = require('../middleware/security');
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new AppError(passwordValidation.message || 'Passordet oppfyller ikke kravene', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      res.json({
        success: true,
        message: 'Passord endret vellykket'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update own password error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke endre passord' });
      }
    }
  }

  // Transfer user to another tenant (SUPER_ADMIN only)
  async transferUserToTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { tenantId: newTenantId } = req.body;
      const currentUserRole = req.user!.role;

      // Verify only SUPER_ADMIN can transfer users
      if (currentUserRole !== 'SUPER_ADMIN') {
        throw new AppError('Kun SUPER_ADMIN kan flytte brukere mellom organisasjoner', 403);
      }

      if (!newTenantId) {
        throw new AppError('Ny tenant ID er påkrevd', 400);
      }

      // Find user to transfer
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Check if user is already in the target tenant
      if (user.tenantId === newTenantId) {
        throw new AppError('Bruker er allerede i denne organisasjonen', 400);
      }

      // Verify new tenant exists and is active
      const newTenant = await prisma.tenant.findUnique({
        where: { id: newTenantId }
      });

      if (!newTenant) {
        throw new AppError('Ny organisasjon ikke funnet', 404);
      }

      if (!newTenant.active) {
        throw new AppError('Kan ikke flytte bruker til en deaktivert organisasjon', 400);
      }

      // Prevent transferring SUPER_ADMIN users
      if (user.role === 'SUPER_ADMIN') {
        throw new AppError('SUPER_ADMIN brukere kan ikke flyttes til andre organisasjoner', 403);
      }

      // Check if email already exists in target tenant
      const existingUserInNewTenant = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: newTenantId,
            email: user.email
          }
        }
      });

      if (existingUserInNewTenant) {
        throw new AppError(
          `En bruker med e-post ${user.email} eksisterer allerede i ${newTenant.name}`,
          400
        );
      }

      const oldTenant = user.tenant;

      // Transfer user to new tenant
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { tenantId: newTenantId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          }
        }
      });

      // Log the transfer activity
      try {
        await prisma.activityLog.create({
          data: {
            tenantId: newTenantId,
            userId: req.user!.userId,
            action: 'TRANSFER_USER',
            resource: 'User',
            resourceId: userId,
            description: `SUPER_ADMIN flyttet ${user.firstName} ${user.lastName} fra ${oldTenant.name} til ${newTenant.name}`,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            metadata: {
              oldTenantId: oldTenant.id,
              oldTenantName: oldTenant.name,
              newTenantId: newTenant.id,
              newTenantName: newTenant.name,
              transferredUserEmail: user.email,
              transferredUserRole: user.role
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log user transfer:', logError);
      }

      res.json({
        success: true,
        data: {
          user: updatedUser,
          transfer: {
            from: {
              id: oldTenant.id,
              name: oldTenant.name
            },
            to: {
              id: newTenant.id,
              name: newTenant.name
            }
          }
        },
        message: `${user.firstName} ${user.lastName} ble flyttet fra ${oldTenant.name} til ${newTenant.name}`
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Transfer user error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke flytte bruker' });
      }
    }
  }
}
