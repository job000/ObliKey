// ============================================
// USER & AUTH TYPES
// ============================================
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'CUSTOMER';

export interface User {
  id: string;
  userId?: string; // Alias for id, used in some components
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  avatar?: string;
  username?: string;
  usernameChangesThisYear?: number;
  lastUsernameChangeYear?: number;
  role: UserRole;
  tenantId: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message?: string;
}

export interface LoginData {
  email?: string;
  username?: string;
  identifier?: string; // Can be either email or username
  password: string;
  tenantId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  username?: string;
  tenantId: string;
}

// ============================================
// CLASS & BOOKING TYPES
// ============================================
export type ClassType = 'GROUP_CLASS' | 'OPEN_GYM' | 'FACILITY';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Class {
  id: string;
  name: string;
  description?: string;
  type: ClassType;
  capacity: number;
  duration: number;
  startTime: string;
  endTime: string;
  recurring: boolean;
  active: boolean;
  published?: boolean;
  status?: string;
  trainerId?: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  availableSpots?: number;
  _count?: {
    bookings: number;
  };
}

export interface Booking {
  id: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  class: Class;
}

// ============================================
// PT TYPES
// ============================================
export type PTSessionStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface PTSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: PTSessionStatus;
  notes?: string;
  trainerId?: string;
  customerId?: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface TrainingProgram {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  goals?: string;
  exercises: string;
  active: boolean;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ============================================
// PRODUCT & SHOP TYPES
// ============================================
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  images?: string[];
  category: string;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  quantity: number;
  price: number;
  subtotal: number;
  sessionCount: number | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============================================
// PAYMENT TYPES
// ============================================
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentType = 'MEMBERSHIP' | 'PT_SESSION' | 'CLASS' | 'PRODUCT';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  description?: string;
  paidAt?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ============================================
// TENANT TYPES
// ============================================
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  logo?: string;
  email: string;
  phone?: string;
  address?: string;
  active: boolean;
  settings?: TenantSettings;
}

export interface TenantSettings {
  id: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  organizationNumber?: string;
  website?: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  bookingCancellation: number;
  maxBookingsPerUser: number;
  requirePayment: boolean;
  allowRegistration?: boolean;
  requireEmailVerification?: boolean;
  enableNotifications?: boolean;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  primaryColor: string;
  secondaryColor: string;
}
