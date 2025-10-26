import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';

export const validateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.body.tenantId || req.params.tenantId;

    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID er påkrevd' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant ikke funnet' });
      return;
    }

    if (!tenant.active) {
      res.status(403).json({ success: false, error: 'Tenant er deaktivert' });
      return;
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Feil ved validering av tenant' });
  }
};
