import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Ingen tilgangstoken' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        active: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            active: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Bruker ikke funnet' });
      return;
    }

    if (!user.active) {
      res.status(403).json({ success: false, error: 'Kontoen er deaktivert' });
      return;
    }

    // SUPER_ADMIN users might not have a tenant
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.tenant || !user.tenant.active) {
        res.status(403).json({ success: false, error: 'Organisasjonen er deaktivert' });
        return;
      }
    }

    // Update decoded with current role (in case it changed)
    req.user = {
      ...decoded,
      role: user.role
    };

    // Check if SUPER_ADMIN is viewing as a specific tenant
    const viewingAsTenantHeader = req.headers['x-viewing-as-tenant'] as string | undefined;

    if (viewingAsTenantHeader && user.role === 'SUPER_ADMIN') {
      // Validate that the tenant exists
      const viewingAsTenant = await prisma.tenant.findUnique({
        where: { id: viewingAsTenantHeader },
        select: { id: true, active: true }
      });

      if (!viewingAsTenant) {
        res.status(404).json({ success: false, error: 'Tenant ikke funnet' });
        return;
      }

      // SUPER_ADMIN can view deactivated tenants (but with limited actions)
      // Don't block them from viewing, just set the tenantId
      // Individual endpoints can decide if they want to block deactivated tenants

      // Override tenantId with the viewing-as tenant
      req.tenantId = viewingAsTenantHeader;

      // Store tenant active status for endpoints that need it
      req.viewingAsTenantActive = viewingAsTenant.active;
    } else {
      // Use user's own tenant ID
      req.tenantId = decoded.tenantId;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ success: false, error: 'Ugyldig eller utløpt token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Ikke autentisert' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Ingen tilgang - utilstrekkelige rettigheter'
      });
      return;
    }

    next();
  };
};

export const requireAccountingModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Ingen tenant ID' });
      return;
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings || !settings.accountingEnabled) {
      res.status(403).json({
        success: false,
        error: 'Regnskapsmodulen er ikke aktivert for denne kunden'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking accounting module:', error);
    res.status(500).json({ success: false, error: 'Kunne ikke sjekke modulstatus' });
  }
};

export const requireClassesModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Ingen tenant ID' });
      return;
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings || !settings.classesEnabled) {
      res.status(403).json({
        success: false,
        error: 'Klassemodulen er ikke aktivert for denne kunden'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking classes module:', error);
    res.status(500).json({ success: false, error: 'Kunne ikke sjekke modulstatus' });
  }
};

export const requireLandingPageModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Ingen tenant ID' });
      return;
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings || !settings.landingPageEnabled) {
      res.status(403).json({
        success: false,
        error: 'Landingsside-modulen er ikke aktivert for denne kunden'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking landing page module:', error);
    res.status(500).json({ success: false, error: 'Kunne ikke sjekke modulstatus' });
  }
};
