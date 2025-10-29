/**
 * Create User DTO (Data Transfer Object)
 *
 * This DTO encapsulates the data structure for creating a new user.
 * It provides type safety and can be reused across different parts of the application.
 */

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER' | 'TRAINER'; // Only these roles can be created by ADMIN
  phone?: string;
  dateOfBirth?: string;
  username?: string;
}

/**
 * User Response DTO
 *
 * This DTO defines the structure of user data returned to the client.
 * It excludes sensitive fields like password.
 */
export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  role: string;
  username: string | null; // Username can be null in database
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Validation Error DTO
 */
export interface ValidationErrorDto {
  field: string;
  message: string;
}

/**
 * API Response DTO
 */
export interface ApiResponseDto<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  validationErrors?: ValidationErrorDto[];
}
