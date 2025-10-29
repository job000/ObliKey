import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';

/**
 * Middleware to check if the e-commerce module is enabled for the tenant
 * Returns 403 if the module is disabled
 */
export const requireEcommerceModule = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Ingen tenant ID',
        moduleDisabled: true
      });
      return;
    }

    // Get tenant settings
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    // Check if e-commerce module is enabled
    if (!settings || !settings.ecommerceEnabled) {
      res.status(403).json({
        success: false,
        error: 'Nettbutikk-modulen er ikke aktivert for denne kunden',
        moduleDisabled: true,
        module: 'ecommerce'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking e-commerce module:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke sjekke modulstatus'
    });
  }
};
