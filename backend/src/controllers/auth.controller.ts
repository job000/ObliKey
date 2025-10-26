import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, RegisterDto, LoginDto } from '../types';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { emailService } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/security';
import { generateUsername } from '../utils/username';

export class AuthController {
  // Register new user
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone, dateOfBirth, username: requestedUsername, tenantId }: RegisterDto = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } }
      });

      if (existingUser) {
        throw new AppError('Bruker med denne e-posten eksisterer allerede', 400);
      }

      // Auto-create tenant if it doesn't exist (for development)
      let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

      if (!tenant) {
        tenant = await prisma.tenant.create({
          data: {
            id: tenantId,
            name: tenantId, // Use tenantId as default name
            subdomain: tenantId, // Use tenantId as subdomain
            email: `admin@${tenantId}.com`, // Default admin email
            active: true
          }
        });
      }

      // Handle username
      let username: string;
      if (requestedUsername) {
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(requestedUsername)) {
          throw new AppError('Brukernavn må være 3-20 tegn og kan bare inneholde bokstaver, tall og understrek', 400);
        }

        // Check if username is already taken
        const existingUsername = await prisma.user.findFirst({
          where: { tenantId, username: requestedUsername }
        });

        if (existingUsername) {
          throw new AppError('Dette brukernavnet er allerede tatt', 400);
        }

        username = requestedUsername;
      } else {
        // Generate unique username from email
        username = await generateUsername(email, tenantId);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          tenantId,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          username,
          role: 'CUSTOMER'
        }
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.firstName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      // Log registration activity
      try {
        await prisma.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'REGISTER',
            resource: 'User',
            resourceId: user.id,
            description: `${user.firstName} ${user.lastName} registrerte seg`,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            metadata: {
              email: user.email,
              username: user.username,
              role: user.role
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log registration:', logError);
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role
          },
          token
        },
        message: 'Bruker opprettet vellykket'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: 'Registrering feilet' });
      }
    }
  }

  // Login
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, username, identifier, password, tenantId }: LoginDto = req.body;

      // Validate input
      if (!password) {
        throw new AppError('Passord er påkrevd', 400);
      }

      // Determine what identifier to use (email, username, or identifier field)
      let loginIdentifier = identifier || email || username;

      if (!loginIdentifier) {
        throw new AppError('E-post eller brukernavn er påkrevd', 400);
      }

      loginIdentifier = loginIdentifier.trim().toLowerCase();

      // Determine if identifier is email or username (email contains @)
      const isEmail = loginIdentifier.includes('@');

      // Find user based on identifier type
      let user;

      if (tenantId) {
        // If tenantId is provided, search within that tenant
        if (isEmail) {
          user = await prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email: loginIdentifier } }
          });
        } else {
          user = await prisma.user.findFirst({
            where: {
              tenantId,
              username: loginIdentifier
            }
          });
        }
      } else {
        // If no tenantId, search across all tenants
        if (isEmail) {
          user = await prisma.user.findFirst({
            where: { email: loginIdentifier }
          });
        } else {
          user = await prisma.user.findFirst({
            where: { username: loginIdentifier }
          });
        }
      }

      if (!user) {
        throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
      }

      // Check if user is active
      if (!user.active) {
        throw new AppError('Kontoen er deaktivert. Kontakt administrator.', 403);
      }

      // Check if tenant is active
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId }
      });

      if (!tenant || !tenant.active) {
        throw new AppError('Denne organisasjonen er deaktivert', 403);
      }

      // Update lastLoginAt
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Reset rate limit for this IP after successful login
      try {
        const key = `auth_${req.ip || 'unknown'}`;
        await authRateLimiter.delete(key);
      } catch (error) {
        console.error('Failed to reset rate limit:', error);
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role
      });

      // Log login activity
      try {
        await prisma.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'LOGIN',
            resource: 'Auth',
            resourceId: user.id,
            description: `${user.firstName} ${user.lastName} logget inn`,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            metadata: {
              loginMethod: isEmail ? 'email' : 'username',
              identifier: loginIdentifier
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log login:', logError);
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            avatar: user.avatar,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            active: user.active,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          },
          token
        },
        message: 'Innlogging vellykket'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Innlogging feilet' });
      }
    }
  }

  // Get current user
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
          avatar: true,
          username: true,
          usernameChangesThisYear: true,
          lastUsernameChangeYear: true,
          role: true,
          active: true,
          tenantId: true,
          lastLoginAt: true,
          createdAt: true
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

  // Change password
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
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
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('Nåværende passord er feil', 401);
      }

      // Validate new password
      if (newPassword.length < 6) {
        throw new AppError('Nytt passord må være minst 6 tegn', 400);
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
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke endre passord' });
      }
    }
  }
}
