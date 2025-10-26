import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { emailService } from '../utils/email';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';

export class PasswordResetController {
  // Request password reset
  async requestReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('E-postadresse er påkrevd', 400);
      }

      // Find user by email
      const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
      });

      // Always return success even if user doesn't exist (security best practice)
      if (!user) {
        res.json({
          success: true,
          message: 'Hvis e-postadressen finnes i systemet, har vi sendt en tilbakestillingslenke.'
        });
        return;
      }

      // Generate unique token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 10);

      // Token expires in 1 hour
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Delete any existing unused tokens for this email
      await prisma.passwordReset.deleteMany({
        where: {
          email: user.email,
          used: false
        }
      });

      // Create new password reset token
      await prisma.passwordReset.create({
        data: {
          email: user.email,
          token: hashedToken,
          expiresAt,
          used: false
        }
      });

      // Send email with reset link
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken // Send unhashed token in email
      );

      res.json({
        success: true,
        message: 'Hvis e-postadressen finnes i systemet, har vi sendt en tilbakestillingslenke.'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Request reset error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke behandle forespørsel' });
      }
    }
  }

  // Verify reset token
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        throw new AppError('Token er påkrevd', 400);
      }

      // Get all non-expired, unused tokens
      const resetTokens = await prisma.passwordReset.findMany({
        where: {
          used: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      // Find matching token by comparing hashes
      let validToken = null;
      for (const dbToken of resetTokens) {
        const isValid = await bcrypt.compare(token, dbToken.token);
        if (isValid) {
          validToken = dbToken;
          break;
        }
      }

      if (!validToken) {
        throw new AppError('Ugyldig eller utløpt token', 400);
      }

      res.json({
        success: true,
        data: {
          email: validToken.email,
          valid: true
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Verify token error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke verifisere token' });
      }
    }
  }

  // Reset password with token
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError('Token og nytt passord er påkrevd', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('Passordet må være minst 6 tegn', 400);
      }

      // Get all non-expired, unused tokens
      const resetTokens = await prisma.passwordReset.findMany({
        where: {
          used: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      // Find matching token
      let validToken = null;
      for (const dbToken of resetTokens) {
        const isValid = await bcrypt.compare(token, dbToken.token);
        if (isValid) {
          validToken = dbToken;
          break;
        }
      }

      if (!validToken) {
        throw new AppError('Ugyldig eller utløpt token', 400);
      }

      // Find user
      const user = await prisma.user.findFirst({
        where: { email: validToken.email }
      });

      if (!user) {
        throw new AppError('Bruker ikke funnet', 404);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        }),
        prisma.passwordReset.update({
          where: { id: validToken.id },
          data: { used: true }
        })
      ]);

      res.json({
        success: true,
        message: 'Passord er tilbakestilt. Du kan nå logge inn med ditt nye passord.'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke tilbakestille passord' });
      }
    }
  }
}
