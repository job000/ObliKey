import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions, BookingEmailData } from '../types';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`✉️ Email sent to ${options.to}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Kunne ikke sende e-post');
    }
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3B82F6; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Bekreftet! ✓</h1>
            </div>
            <div class="content">
              <p>Hei ${data.userName},</p>
              <p>Din booking er bekreftet!</p>

              <div class="details">
                <h3>${data.className}</h3>
                <p><strong>Trener:</strong> ${data.trainerName}</p>
                <p><strong>Dato:</strong> ${new Date(data.startTime).toLocaleDateString('nb-NO')}</p>
                <p><strong>Tid:</strong> ${new Date(data.startTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} - ${new Date(data.endTime).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <p>Vi gleder oss til å se deg!</p>
            </div>
            <div class="footer">
              <p>Dette er en automatisk e-post fra Otico</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: data.userName,
      subject: `Booking bekreftet - ${data.className}`,
      html,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Velkommen til Otico! 🎉</h1>
            </div>
            <div class="content">
              <p>Hei ${firstName},</p>
              <p>Velkommen til vår treningsplattform!</p>
              <p>Du kan nå:</p>
              <ul>
                <li>Booke treningsøkter</li>
                <li>Se din treningsplan</li>
                <li>Administrere din profil</li>
                <li>Og mye mer!</li>
              </ul>
              <p>Logg inn for å komme i gang.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Velkommen til Otico!',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #3B82F6;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .warning {
              background: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 15px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Tilbakestill passord 🔒</h1>
            </div>
            <div class="content">
              <p>Hei ${firstName},</p>
              <p>Vi har mottatt en forespørsel om å tilbakestille passordet ditt.</p>

              <p>Klikk på knappen nedenfor for å tilbakestille passordet ditt:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Tilbakestill passord</a>
              </div>

              <p>Eller kopier og lim inn denne lenken i nettleseren din:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>

              <div class="warning">
                <p><strong>⚠️ Viktig:</strong></p>
                <ul>
                  <li>Denne lenken er gyldig i 1 time</li>
                  <li>Hvis du ikke ba om å tilbakestille passordet, kan du ignorere denne e-posten</li>
                  <li>Del aldri denne lenken med andre</li>
                </ul>
              </div>

              <p>Med vennlig hilsen,<br>Otico teamet</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>Dette er en automatisk e-post fra Otico. Ikke svar på denne e-posten.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Tilbakestill passord - Otico',
      html,
    });
  }
}

export const emailService = new EmailService();
