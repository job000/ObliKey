import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class LandingPageController {
  // Get all landing page content (public)
  async getContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const content = await prisma.landingPageContent.findMany({
        where: {
          tenantId,
          active: true
        },
        orderBy: [
          { section: 'asc' },
          { sortOrder: 'asc' }
        ]
      });

      // Group by section
      const groupedContent = content.reduce((acc: any, item) => {
        if (!acc[item.section]) {
          acc[item.section] = [];
        }
        acc[item.section].push(item);
        return acc;
      }, {});

      res.json({ success: true, data: groupedContent });
    } catch (error) {
      console.error('Get landing page content error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente landingsside innhold' });
    }
  }

  // Get all content for admin (including inactive)
  async getAllContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const content = await prisma.landingPageContent.findMany({
        where: { tenantId },
        orderBy: [
          { section: 'asc' },
          { sortOrder: 'asc' }
        ]
      });

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Get all landing page content error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente innhold' });
    }
  }

  // Get content by section
  async getContentBySection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { section } = req.params;
      const tenantId = req.tenantId!;

      const content = await prisma.landingPageContent.findMany({
        where: {
          tenantId,
          section,
          active: true
        },
        orderBy: { sortOrder: 'asc' }
      });

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Get content by section error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente innhold' });
    }
  }

  // Create content
  async createContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const {
        section,
        title,
        subtitle,
        content,
        imageUrl,
        buttonText,
        buttonUrl,
        sortOrder,
        active,
        metadata
      } = req.body;

      const newContent = await prisma.landingPageContent.create({
        data: {
          tenantId,
          section,
          title,
          subtitle,
          content,
          imageUrl,
          buttonText,
          buttonUrl,
          sortOrder: sortOrder || 0,
          active: active !== undefined ? active : true,
          metadata
        }
      });

      res.status(201).json({
        success: true,
        data: newContent,
        message: 'Innhold opprettet'
      });
    } catch (error) {
      console.error('Create landing page content error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke opprette innhold' });
    }
  }

  // Update content
  async updateContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const {
        section,
        title,
        subtitle,
        content,
        imageUrl,
        buttonText,
        buttonUrl,
        sortOrder,
        active,
        metadata
      } = req.body;

      // Verify content belongs to tenant
      const existing = await prisma.landingPageContent.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Innhold ikke funnet', 404);
      }

      const updated = await prisma.landingPageContent.update({
        where: { id },
        data: {
          section,
          title,
          subtitle,
          content,
          imageUrl,
          buttonText,
          buttonUrl,
          sortOrder,
          active,
          metadata
        }
      });

      res.json({
        success: true,
        data: updated,
        message: 'Innhold oppdatert'
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Update landing page content error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke oppdatere innhold' });
      }
    }
  }

  // Delete content
  async deleteContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      // Verify content belongs to tenant
      const existing = await prisma.landingPageContent.findFirst({
        where: { id, tenantId }
      });

      if (!existing) {
        throw new AppError('Innhold ikke funnet', 404);
      }

      await prisma.landingPageContent.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Innhold slettet' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
      } else {
        console.error('Delete landing page content error:', error);
        res.status(500).json({ success: false, error: 'Kunne ikke slette innhold' });
      }
    }
  }

  // Initialize default content for a tenant
  async initializeDefaultContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      // Check if content already exists
      const existing = await prisma.landingPageContent.count({
        where: { tenantId }
      });

      if (existing > 0) {
        res.json({ success: true, message: 'Innhold finnes allerede' });
        return;
      }

      // Create default content
      const defaultContent = [
        {
          section: 'HERO',
          title: 'Velkommen til Otico',
          subtitle: 'Din komplette treningsløsning',
          content: 'Book klasser, få personlig trening og nå dine treningsmål',
          buttonText: 'Kom i gang',
          buttonUrl: '/register',
          sortOrder: 0
        },
        {
          section: 'FEATURES',
          title: 'Klasser',
          content: 'Varierte gruppetimer for alle nivåer',
          sortOrder: 0
        },
        {
          section: 'FEATURES',
          title: 'Personlig Trening',
          content: 'Skreddersydde treningsprogrammer',
          sortOrder: 1
        },
        {
          section: 'FEATURES',
          title: 'Online Booking',
          content: 'Book timer enkelt i appen',
          sortOrder: 2
        },
        {
          section: 'CTA',
          title: 'Klar til å starte?',
          subtitle: 'Bli med i dag og oppnå dine treningsmål',
          buttonText: 'Registrer deg nå',
          buttonUrl: '/register',
          sortOrder: 0
        },
        {
          section: 'FOOTER',
          title: 'Om Oss',
          content: 'Norges ledende plattform for treningssentre og PT-virksomheter.',
          sortOrder: 0
        },
        {
          section: 'FOOTER',
          title: 'Kontakt',
          metadata: {
            phone: '+47 123 45 678',
            email: 'kontakt@otico.no',
            address: 'Oslo, Norge'
          },
          sortOrder: 1
        },
        {
          section: 'FOOTER',
          title: 'Lenker',
          subtitle: 'Om Oss',
          buttonUrl: '/about',
          sortOrder: 2
        },
        {
          section: 'FOOTER',
          subtitle: 'Priser',
          buttonUrl: '/pricing',
          sortOrder: 3
        },
        {
          section: 'FOOTER',
          subtitle: 'Kontakt',
          buttonUrl: '/contact',
          sortOrder: 4
        },
        {
          section: 'FOOTER',
          subtitle: 'Personvern',
          buttonUrl: '/privacy',
          sortOrder: 5
        }
      ];

      await prisma.landingPageContent.createMany({
        data: defaultContent.map(item => ({
          tenantId,
          ...item
        }))
      });

      res.json({ success: true, message: 'Standard innhold opprettet' });
    } catch (error) {
      console.error('Initialize default content error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke opprette standard innhold' });
    }
  }

  // Toggle landing page module (SUPER_ADMIN only)
  async toggleLandingPageModule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;
      const { enabled } = req.body;

      // Get or create settings
      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId }
      });

      if (!settings) {
        await prisma.tenantSettings.create({
          data: {
            tenantId,
            landingPageEnabled: enabled
          }
        });
      } else {
        await prisma.tenantSettings.update({
          where: { tenantId },
          data: { landingPageEnabled: enabled }
        });

        // Initialize default content when enabling for first time
        if (enabled && !settings.landingPageEnabled) {
          const contentCount = await prisma.landingPageContent.count({
            where: { tenantId }
          });

          if (contentCount === 0) {
            const defaultContent = [
              {
                section: 'HERO',
                title: 'Velkommen til Otico',
                subtitle: 'Din komplette treningsløsning',
                content: 'Book klasser, få personlig trening og nå dine treningsmål',
                buttonText: 'Kom i gang',
                buttonUrl: '/register',
                sortOrder: 0,
                active: true
              },
              {
                section: 'FEATURES',
                title: 'Klasser',
                content: 'Varierte gruppetimer for alle nivåer',
                sortOrder: 0,
                active: true
              },
              {
                section: 'FEATURES',
                title: 'Personlig Trening',
                content: 'Skreddersydde treningsprogrammer',
                sortOrder: 1,
                active: true
              },
              {
                section: 'FEATURES',
                title: 'Online Booking',
                content: 'Book timer enkelt i appen',
                sortOrder: 2,
                active: true
              },
              {
                section: 'CTA',
                title: 'Klar til å starte?',
                subtitle: 'Bli med i dag og oppnå dine treningsmål',
                buttonText: 'Registrer deg nå',
                buttonUrl: '/register',
                sortOrder: 0,
                active: true
              },
              {
                section: 'FOOTER',
                title: 'Om Oss',
                content: 'Norges ledende plattform for treningssentre og PT-virksomheter.',
                sortOrder: 0,
                active: true
              },
              {
                section: 'FOOTER',
                title: 'Kontakt',
                metadata: {
                  phone: '+47 123 45 678',
                  email: 'kontakt@otico.no',
                  address: 'Oslo, Norge'
                },
                sortOrder: 1,
                active: true
              },
              {
                section: 'FOOTER',
                title: 'Lenker',
                subtitle: 'Om Oss',
                buttonUrl: '/about',
                sortOrder: 2,
                active: true
              },
              {
                section: 'FOOTER',
                subtitle: 'Priser',
                buttonUrl: '/pricing',
                sortOrder: 3,
                active: true
              },
              {
                section: 'FOOTER',
                subtitle: 'Kontakt',
                buttonUrl: '/contact',
                sortOrder: 4,
                active: true
              },
              {
                section: 'FOOTER',
                subtitle: 'Personvern',
                buttonUrl: '/privacy',
                sortOrder: 5,
                active: true
              }
            ];

            await prisma.landingPageContent.createMany({
              data: defaultContent.map(item => ({
                tenantId,
                ...item
              }))
            });
          }
        }
      }

      res.json({
        success: true,
        message: enabled ? 'Landingsside-modul aktivert' : 'Landingsside-modul deaktivert'
      });
    } catch (error) {
      console.error('Toggle landing page module error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke oppdatere modulstatus' });
    }
  }

  // Get module status
  async getModuleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId!;

      const settings = await prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { landingPageEnabled: true }
      });

      res.json({
        success: true,
        data: {
          landingPageEnabled: settings?.landingPageEnabled || false
        }
      });
    } catch (error) {
      console.error('Get landing page module status error:', error);
      res.status(500).json({ success: false, error: 'Kunne ikke hente modulstatus' });
    }
  }
}
