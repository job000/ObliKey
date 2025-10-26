import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Role =
  | 'PLATFORM_OWNER'
  | 'PLATFORM_ADMIN'
  | 'TENANT_OWNER'
  | 'TENANT_ADMIN'
  | 'TRAINER'
  | 'CUSTOMER';

/**
 * Middleware to check if user has required role(s)
 * @param roles - One or more roles that are allowed
 */
export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole as Role)) {
      return res.status(403).json({
        success: false,
        error: 'Du har ikke tilgang til denne ressursen',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin (any admin level)
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const adminRoles = ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN'];
  const userRole = req.user.role;

  if (!adminRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Admin tilgang påkrevd',
      code: 'ADMIN_ONLY',
    });
  }

  next();
};

/**
 * Middleware to check if user is trainer or admin
 */
export const requireTrainerOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const allowedRoles = [
    'PLATFORM_OWNER',
    'PLATFORM_ADMIN',
    'TENANT_OWNER',
    'TENANT_ADMIN',
    'TRAINER',
  ];
  const userRole = req.user.role;

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Kun trenere og administratorer har tilgang',
      code: 'TRAINER_ADMIN_ONLY',
    });
  }

  next();
};

/**
 * Middleware to check if user is platform admin (platform level)
 */
export const requirePlatformAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const platformAdminRoles = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];
  const userRole = req.user.role;

  if (!platformAdminRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Platform administrator tilgang påkrevd',
      code: 'PLATFORM_ADMIN_ONLY',
    });
  }

  next();
};

/**
 * Middleware to check if user is tenant admin (for specific tenant)
 */
export const requireTenantAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const tenantAdminRoles = ['TENANT_OWNER', 'TENANT_ADMIN'];
  const userRole = req.user.role;

  if (!tenantAdminRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Tenant administrator tilgang påkrevd',
      code: 'TENANT_ADMIN_ONLY',
    });
  }

  next();
};
