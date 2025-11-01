import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest, RegisterDto, LoginDto, SelectTenantDto } from '../types';
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

      // Find tenant by ID or subdomain (frontend can send either)
      let tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: tenantId },
            { subdomain: tenantId }
          ]
        }
      });

      if (!tenant) {
        // SECURITY: Only allow auto-creation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Auto-creating tenant: ${tenantId}`);
          tenant = await prisma.tenant.create({
            data: {
              name: tenantId, // Use subdomain as default name
              subdomain: tenantId,
              email: `admin@${tenantId}.com`,
              active: true
            }
          });
        } else {
          // In production, tenant must exist (prevent unauthorized tenant creation)
          throw new AppError('Ugyldig organisasjon. Kontakt administrator for å opprette konto.', 404);
        }
      }

      // Use the actual tenant ID from database
      const actualTenantId = tenant.id;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: actualTenantId, email } }
      });

      if (existingUser) {
        throw new AppError('Bruker med denne e-posten eksisterer allerede', 400);
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
          where: { tenantId: actualTenantId, username: requestedUsername }
        });

        if (existingUsername) {
          throw new AppError('Dette brukernavnet er allerede tatt', 400);
        }

        username = requestedUsername;
      } else {
        // Generate unique username from email
        username = await generateUsername(email, actualTenantId);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          tenantId: actualTenantId,
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

      console.log('Login request received:', {
        email,
        username,
        identifier,
        tenantId,
        hasPassword: !!password
      });

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

      console.log(`Login type: ${isEmail ? 'email' : 'username'}, identifier: ${loginIdentifier}, tenantId: ${tenantId || 'not provided'}`);

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
        // First, check if user exists in multiple tenants
        let users;
        if (isEmail) {
          users = await prisma.user.findMany({
            where: { email: loginIdentifier },
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                  active: true
                }
              }
            }
          });
        } else {
          users = await prisma.user.findMany({
            where: { username: loginIdentifier },
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                  active: true
                }
              }
            }
          });
        }

        // Filter out inactive tenants
        const activeUsers = users.filter(u => u.tenant.active);

        if (activeUsers.length === 0) {
          console.log(`Login failed: No active users found for identifier: ${loginIdentifier}`);
          throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
        }

        if (activeUsers.length > 1) {
          // User exists in multiple tenants - verify password first
          const isPasswordValid = await bcrypt.compare(password, activeUsers[0].password);
          if (!isPasswordValid) {
            console.log(`Login failed: Invalid password for multi-tenant user: ${loginIdentifier}`);
            throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
          }

          // Return tenant selection response
          console.log(`Multi-tenant user detected: ${loginIdentifier} exists in ${activeUsers.length} tenants`);
          const tenantOptions = activeUsers.map(u => ({
            id: u.tenant.id,
            name: u.tenant.name,
            subdomain: u.tenant.subdomain
          }));

          res.json({
            success: true,
            data: {
              requiresTenantSelection: true,
              tenants: tenantOptions,
              identifier: loginIdentifier
            },
            message: 'Velg organisasjon'
          });
          return;
        }

        // Single user found - continue with normal login
        user = activeUsers[0];
      }

      if (!user) {
        console.log(`Login failed: User not found for identifier: ${loginIdentifier}`);
        throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
      }

      console.log(`Login attempt for user: ${user.email} (ID: ${user.id})`);

      // Verify password hash exists
      if (!user.password) {
        console.error(`Critical error: User ${user.email} has no password hash in database`);
        throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
      }

      // Check password
      console.log(`Comparing password for user: ${user.email}`);
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        console.log(`Login failed: Invalid password for user: ${user.email}`);
        throw new AppError('Ugyldig brukernavn/e-post eller passord', 401);
      }

      console.log(`Password validation successful for user: ${user.email}`);

      // Check if user is active
      if (!user.active) {
        console.log(`Login failed: User account is inactive: ${user.email}`);
        throw new AppError('Kontoen er deaktivert. Kontakt administrator.', 403);
      }

      console.log(`User account is active: ${user.email}`);

      // Check if tenant is active
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId }
      });

      if (!tenant || !tenant.active) {
        console.log(`Login failed: Tenant is inactive or not found: ${user.tenantId}`);
        throw new AppError('Denne organisasjonen er deaktivert', 403);
      }

      console.log(`Tenant is active: ${tenant.name} (ID: ${tenant.id})`);

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

      console.log(`Login successful for user: ${user.email} (ID: ${user.id})`);

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

  // Select tenant (for multi-tenant users)
  async selectTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { identifier, email, username, tenantId }: SelectTenantDto = req.body;

      if (!tenantId) {
        throw new AppError('tenantId er påkrevd', 400);
      }

      // Determine what identifier to use
      let loginIdentifier = identifier || email || username;
      if (!loginIdentifier) {
        throw new AppError('E-post eller brukernavn er påkrevd', 400);
      }

      loginIdentifier = loginIdentifier.trim().toLowerCase();
      const isEmail = loginIdentifier.includes('@');

      console.log(`Tenant selection: ${loginIdentifier} selecting tenant: ${tenantId}`);

      // Find the specific user in the selected tenant
      let user;
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

      if (!user) {
        throw new AppError('Bruker ikke funnet i valgt organisasjon', 404);
      }

      // Check if user is active
      if (!user.active) {
        throw new AppError('Kontoen er deaktivert. Kontakt administrator.', 403);
      }

      // Check if tenant is active
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant || !tenant.active) {
        throw new AppError('Denne organisasjonen er deaktivert', 403);
      }

      // Update lastLoginAt
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

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
            description: `${user.firstName} ${user.lastName} logget inn (valgte tenant)`,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            metadata: {
              loginMethod: isEmail ? 'email' : 'username',
              identifier: loginIdentifier,
              tenantSelected: true
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log tenant selection:', logError);
      }

      console.log(`Tenant selection successful: ${user.email} -> ${tenant.name}`);

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
        console.error('Select tenant error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke velge organisasjon' });
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
