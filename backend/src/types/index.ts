import { Request } from 'express';
import { UserRole } from '@prisma/client';

// ============================================
// AUTH TYPES
// ============================================
export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  tenantId?: string;
  viewingAsTenantActive?: boolean; // For SUPER_ADMIN viewing as tenant
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// DTO (Data Transfer Objects)
// ============================================
export interface RegisterDto {
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  username?: string;
}

export interface LoginDto {
  email?: string;
  username?: string;
  identifier?: string; // Can be either email or username
  password: string;
  tenantId?: string;
}

export interface SelectTenantDto {
  email?: string;
  username?: string;
  identifier?: string; // Can be either email or username
  tenantId: string; // Required - the tenant user selected
}

export interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

// Multi-tenant login response when user exists in multiple tenants
export interface MultiTenantLoginResponse {
  requiresTenantSelection: true;
  tenants: TenantOption[];
  identifier: string; // The email/username used for login
}

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  email: string;
  phone?: string;
  address?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CreateClassDto {
  name: string;
  description?: string;
  type: 'GROUP_CLASS' | 'OPEN_GYM' | 'FACILITY';
  capacity: number;
  duration: number;
  startTime: string;
  recurring?: boolean;
  recurringPattern?: string;
  trainerId?: string;
}

export interface SaveAsTemplateDto {
  templateName: string;
}

export interface CreateFromTemplateDto {
  startTime: string;
  trainerId?: string;
}

export interface CreateBookingDto {
  classId: string;
  notes?: string;
}

export interface CreatePTSessionDto {
  customerId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface CreateTrainingProgramDto {
  customerId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  goals?: string;
  exercises: string;
}

// ============================================
// EMAIL TYPES
// ============================================
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface BookingEmailData {
  userName: string;
  className: string;
  startTime: Date;
  endTime: Date;
  trainerName: string;
}
