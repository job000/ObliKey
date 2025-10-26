import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../utils/prisma';

// Mapping of HTTP methods and routes to activity actions
const getActivityAction = (method: string, path: string): string | null => {
  // Authentication
  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/logout')) return 'LOGOUT';
  if (path.includes('/auth/register')) return 'REGISTER';

  // Profile & User Settings
  if (path.includes('/auth/me') && method === 'PATCH') return 'UPDATE_PROFILE';
  if (path.includes('/password') || path.includes('/change-password')) return 'CHANGE_PASSWORD';
  if (path.includes('/username') && method === 'PATCH') return 'UPDATE_USERNAME';
  if (path.includes('/avatar') && method === 'PATCH') return 'UPDATE_AVATAR';
  if (path.includes('/avatar') && method === 'DELETE') return 'REMOVE_AVATAR';

  // User Administration
  if (path.includes('/users') && path.includes('/deactivate')) return 'DEACTIVATE_USER';
  if (path.includes('/users') && path.includes('/activate')) return 'ACTIVATE_USER';
  if (path.includes('/users') && path.includes('/role')) return 'UPDATE_USER_ROLE';
  if (path.includes('/users') && method === 'DELETE') return 'DELETE_USER';

  // Bookings & Classes
  if (path.includes('/bookings') && method === 'POST') return 'BOOK_CLASS';
  if (path.includes('/bookings') && path.includes('/cancel')) return 'CANCEL_BOOKING';
  if (path.includes('/classes') && path.includes('/join')) return 'JOIN_CLASS';
  if (path.includes('/classes') && path.includes('/leave')) return 'LEAVE_CLASS';

  // PT Sessions & Programs
  if (path.includes('/pt/sessions') && method === 'POST') return 'CREATE_PT_SESSION';
  if (path.includes('/pt/sessions') && path.includes('/complete')) return 'COMPLETE_PT_SESSION';
  if (path.includes('/assign-trainer')) return 'ASSIGN_TRAINER';
  if (path.includes('/unassign-trainer')) return 'UNASSIGN_TRAINER';

  // Orders & Shopping
  if (path.includes('/orders') && method === 'POST') return 'PURCHASE';
  if (path.includes('/orders') && method === 'PATCH') return 'UPDATE_ORDER';
  if (path.includes('/orders') && path.includes('/cancel')) return 'CANCEL_ORDER';
  if (path.includes('/orders') && path.includes('/ship')) return 'SHIP_ORDER';
  if (path.includes('/orders') && path.includes('/deliver')) return 'DELIVER_ORDER';
  if (path.includes('/cart') && method === 'DELETE') return 'CLEAR_CART';
  if (path.includes('/cart/add')) return 'ADD_TO_CART';
  if (path.includes('/cart/remove')) return 'REMOVE_FROM_CART';
  if (path.includes('/checkout')) return 'CHECKOUT';

  // Products
  if (path.includes('/products') && method === 'POST') return 'CREATE_PRODUCT';
  if (path.includes('/products') && method === 'PATCH') return 'UPDATE_PRODUCT';
  if (path.includes('/products') && method === 'DELETE') return 'DELETE_PRODUCT';

  // Messages & Chat
  if (path.includes('/messages') && method === 'POST') return 'SEND_MESSAGE';
  if (path.includes('/messages') && method === 'GET' && !path.includes('/conversations')) return 'READ_MESSAGE';
  if (path.includes('/messages') && method === 'DELETE') return 'DELETE_MESSAGE';
  if (path.includes('/conversations') && method === 'POST') return 'CREATE_CONVERSATION';

  // Payments
  if (path.includes('/payments') && method === 'POST') return 'PAYMENT';
  if (path.includes('/refund')) return 'REFUND';

  // Reports & Analytics
  if (path.includes('/reports') && method === 'POST') return 'GENERATE_REPORT';
  if (path.includes('/analytics') && method === 'GET') return 'VIEW_ANALYTICS';

  // Generic CRUD operations (fallback)
  if (method === 'GET' && path.includes('/export')) return 'EXPORT';
  if (method === 'GET' && path.includes('/download')) return 'DOWNLOAD';
  if (method === 'POST' && path.includes('/upload')) return 'UPLOAD';

  // Generic CRUD (only if not already matched)
  if (method === 'POST' && !path.includes('/auth/login') && !path.includes('/auth/register')) return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'GET' && path.match(/\/[a-f0-9-]{36}$/)) return 'VIEW'; // Specific resource view

  // Don't log simple list GET requests
  return null;
};

// Extract resource name from path
const getResourceName = (path: string): string => {
  // Special cases for common resources
  if (path.includes('/orders')) return 'Order';
  if (path.includes('/cart')) return 'Cart';
  if (path.includes('/products')) return 'Product';
  if (path.includes('/users')) return 'User';
  if (path.includes('/bookings')) return 'Booking';
  if (path.includes('/classes')) return 'Class';
  if (path.includes('/pt/sessions') || path.includes('/pt-sessions')) return 'PTSession';
  if (path.includes('/messages')) return 'Message';
  if (path.includes('/conversations')) return 'Conversation';
  if (path.includes('/training-programs')) return 'TrainingProgram';
  if (path.includes('/product-analytics')) return 'ProductAnalytics';

  // Remove API prefix and leading slash
  let cleanPath = path.replace('/api/', '').replace(/^\//, '');

  // Get the main resource (first segment)
  const segments = cleanPath.split('/').filter(s => s && !s.match(/^[a-f0-9-]{36}$/i));

  if (segments.length === 0) return 'Unknown';

  // Capitalize first letter
  const resource = segments[0];
  return resource.charAt(0).toUpperCase() + resource.slice(1).replace(/-/g, '');
};

// Create human-readable description
const createDescription = (action: string, resource: string, user?: any): string => {
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Bruker';

  switch (action) {
    // Authentication & Profile
    case 'LOGIN':
      return `${userName} logget inn`;
    case 'LOGOUT':
      return `${userName} logget ut`;
    case 'REGISTER':
      return `${userName} registrerte seg`;
    case 'UPDATE_PROFILE':
      return `${userName} oppdaterte profil`;
    case 'CHANGE_PASSWORD':
      return `${userName} endret passord`;
    case 'UPDATE_USERNAME':
      return `${userName} endret brukernavn`;
    case 'UPDATE_AVATAR':
      return `${userName} oppdaterte profilbilde`;
    case 'REMOVE_AVATAR':
      return `${userName} fjernet profilbilde`;

    // User Administration
    case 'DEACTIVATE_USER':
      return `${userName} deaktiverte bruker`;
    case 'ACTIVATE_USER':
      return `${userName} aktiverte bruker`;
    case 'UPDATE_USER_ROLE':
      return `${userName} endret brukerrolle`;
    case 'DELETE_USER':
      return `${userName} slettet bruker`;

    // Bookings & Classes
    case 'BOOK_CLASS':
      return `${userName} booket en klasse`;
    case 'CANCEL_BOOKING':
      return `${userName} kansellerte en booking`;
    case 'JOIN_CLASS':
      return `${userName} ble med i klasse`;
    case 'LEAVE_CLASS':
      return `${userName} forlot klasse`;

    // PT Sessions & Programs
    case 'CREATE_PT_SESSION':
      return `${userName} opprettet PT-økt`;
    case 'COMPLETE_PT_SESSION':
      return `${userName} fullførte PT-økt`;
    case 'ASSIGN_TRAINER':
      return `${userName} tildelte trener`;
    case 'UNASSIGN_TRAINER':
      return `${userName} fjernet trener`;

    // Orders & Shopping
    case 'PURCHASE':
      return `${userName} fullførte et kjøp`;
    case 'CREATE_ORDER':
      return `${userName} opprettet bestilling`;
    case 'UPDATE_ORDER':
      return `${userName} oppdaterte bestilling`;
    case 'CANCEL_ORDER':
      return `${userName} kansellerte bestilling`;
    case 'SHIP_ORDER':
      return `${userName} sendte bestilling`;
    case 'DELIVER_ORDER':
      return `${userName} leverte bestilling`;
    case 'CLEAR_CART':
      return `${userName} tømte handlekurven`;
    case 'ADD_TO_CART':
      return `${userName} la til i handlekurv`;
    case 'REMOVE_FROM_CART':
      return `${userName} fjernet fra handlekurv`;
    case 'CHECKOUT':
      return `${userName} gikk til kassen`;

    // Products
    case 'CREATE_PRODUCT':
      return `${userName} opprettet produkt`;
    case 'UPDATE_PRODUCT':
      return `${userName} oppdaterte produkt`;
    case 'DELETE_PRODUCT':
      return `${userName} slettet produkt`;

    // Messages & Chat
    case 'SEND_MESSAGE':
      return `${userName} sendte melding`;
    case 'READ_MESSAGE':
      return `${userName} leste melding`;
    case 'DELETE_MESSAGE':
      return `${userName} slettet melding`;
    case 'CREATE_CONVERSATION':
      return `${userName} startet ny samtale`;

    // Payments
    case 'PAYMENT':
      return `${userName} utførte betaling`;
    case 'REFUND':
      return `${userName} utførte refusjon`;

    // Reports & Analytics
    case 'GENERATE_REPORT':
      return `${userName} genererte rapport`;
    case 'VIEW_ANALYTICS':
      return `${userName} så på analyser`;

    // Generic CRUD
    case 'CREATE':
      return `${userName} opprettet ${resource}`;
    case 'UPDATE':
      return `${userName} oppdaterte ${resource}`;
    case 'DELETE':
      return `${userName} slettet ${resource}`;
    case 'VIEW':
      return `${userName} så på ${resource}`;
    case 'EXPORT':
      return `${userName} eksporterte ${resource}`;
    case 'DOWNLOAD':
      return `${userName} lastet ned ${resource}`;
    case 'UPLOAD':
      return `${userName} lastet opp ${resource}`;

    default:
      return `${userName} utførte ${action} på ${resource}`;
  }
};

// Activity logger middleware
export const activityLogger = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Store original send function
  const originalSend = res.send;

  // Override send function to log after successful response
  res.send = function (data: any): Response {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Don't wait for logging to complete
      setImmediate(async () => {
        try {
          const action = getActivityAction(req.method, req.path);

          // Skip if no action to log
          if (!action) return;

          const tenantId = req.tenantId;
          const userId = req.user?.userId;

          // Skip if no tenant (public routes)
          if (!tenantId) return;

          const resource = getResourceName(req.path);

          // Fetch user details if userId exists
          let userDetails;
          if (userId) {
            userDetails = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                firstName: true,
                lastName: true
              }
            });
          }

          const description = createDescription(action, resource, userDetails);

          // Extract resource ID from path or body
          let resourceId: string | undefined;
          const idMatch = req.path.match(/\/([a-f0-9-]{36})/i);
          if (idMatch) {
            resourceId = idMatch[1];
          } else if (data && typeof data === 'string') {
            try {
              const jsonData = JSON.parse(data);
              if (jsonData.data?.id) {
                resourceId = jsonData.data.id;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }

          // Get client IP and user agent
          const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                           req.socket.remoteAddress ||
                           'Unknown';
          const userAgent = req.headers['user-agent'] || 'Unknown';

          // Create metadata
          const metadata: any = {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          };

          // Add relevant request data (excluding sensitive info)
          if (req.body && Object.keys(req.body).length > 0) {
            const sanitizedBody = { ...req.body };
            delete sanitizedBody.password;
            delete sanitizedBody.currentPassword;
            delete sanitizedBody.newPassword;
            metadata.requestData = sanitizedBody;
          }

          // Log activity
          await prisma.activityLog.create({
            data: {
              tenantId,
              userId,
              action: action as any,
              resource,
              resourceId,
              description,
              ipAddress,
              userAgent,
              metadata
            }
          });
        } catch (error) {
          console.error('Activity logging error:', error);
          // Don't fail the request if logging fails
        }
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};
