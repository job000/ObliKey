import axios, { AxiosInstance } from 'axios';
import type {
  AuthResponse,
  LoginData,
  RegisterData,
  User,
  Class,
  Booking,
  PTSession,
  TrainingProgram,
  Payment,
  Tenant
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Debug logging
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        data: config.data,
        headers: config.headers
      });

      return config;
    });

    // Handle token expiration
    this.api.interceptors.response.use(
      (response) => {
        console.log('API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error) => {
        console.error('API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
          message: error.message
        });

        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // AUTH
  // ============================================
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async getCurrentUser(): Promise<{ success: boolean; data: User }> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }

  async resetRateLimits(): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/users/reset-rate-limits');
    return response.data;
  }

  async resetUserRateLimit(ip: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/users/reset-user-rate-limit', { ip });
    return response.data;
  }

  // ============================================
  // CLASSES
  // ============================================
  async getClassesModuleStatus(): Promise<{ success: boolean; data: { classesEnabled: boolean } }> {
    const response = await this.api.get('/classes/module-status');
    return response.data;
  }

  async toggleClassesModule(enabled: boolean): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/classes/toggle-module', { enabled });
    return response.data;
  }

  async getTrainers(): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/pt/trainers');
    return response.data;
  }

  async getClasses(params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: Class[] }> {
    const response = await this.api.get('/classes', { params });
    return response.data;
  }

  async getClassById(id: string): Promise<{ success: boolean; data: Class }> {
    const response = await this.api.get(`/classes/${id}`);
    return response.data;
  }

  async createClass(data: Partial<Class>): Promise<{ success: boolean; data: Class }> {
    const response = await this.api.post('/classes', data);
    return response.data;
  }

  async updateClass(
    id: string,
    data: Partial<Class>
  ): Promise<{ success: boolean; data: Class }> {
    const response = await this.api.patch(`/classes/${id}`, data);
    return response.data;
  }

  async deleteClass(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/classes/${id}`);
    return response.data;
  }

  // ============================================
  // BOOKINGS
  // ============================================
  async createBooking(data: {
    classId: string;
    notes?: string;
  }): Promise<{ success: boolean; data: Booking }> {
    const response = await this.api.post('/bookings', data);
    return response.data;
  }

  async getMyBookings(params?: {
    status?: string;
    upcoming?: boolean;
  }): Promise<{ success: boolean; data: Booking[] }> {
    const response = await this.api.get('/bookings/my-bookings', { params });
    return response.data;
  }

  async cancelBooking(
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.api.patch(`/bookings/${id}/cancel`, { reason });
    return response.data;
  }

  // ============================================
  // PT SESSIONS
  // ============================================
  async getPTSessions(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: PTSession[] }> {
    const response = await this.api.get('/pt/sessions', { params });
    return response.data;
  }

  async createPTSession(data: Partial<PTSession>): Promise<{ success: boolean; data: PTSession }> {
    const response = await this.api.post('/pt/sessions', data);
    return response.data;
  }

  async updatePTSession(
    id: string,
    data: Partial<PTSession>
  ): Promise<{ success: boolean; data: PTSession }> {
    const response = await this.api.patch(`/pt/sessions/${id}`, data);
    return response.data;
  }

  async deletePTSession(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/pt/sessions/${id}`);
    return response.data;
  }

  async cancelPTSession(
    id: string,
    cancelReason?: string
  ): Promise<{ success: boolean; data: PTSession; message: string }> {
    const response = await this.api.post(`/pt/sessions/${id}/cancel`, { cancelReason });
    return response.data;
  }

  // ============================================
  // TRAINING PROGRAMS
  // ============================================
  async getTrainingPrograms(params?: {
    active?: boolean;
  }): Promise<{ success: boolean; data: TrainingProgram[] }> {
    const response = await this.api.get('/pt/programs', { params });
    return response.data;
  }

  async getTrainingProgramById(
    id: string
  ): Promise<{ success: boolean; data: TrainingProgram }> {
    const response = await this.api.get(`/pt/programs/${id}`);
    return response.data;
  }

  async createTrainingProgram(
    data: Partial<TrainingProgram>
  ): Promise<{ success: boolean; data: TrainingProgram }> {
    const response = await this.api.post('/pt/programs', data);
    return response.data;
  }

  async updateTrainingProgram(
    id: string,
    data: Partial<TrainingProgram>
  ): Promise<{ success: boolean; data: TrainingProgram }> {
    const response = await this.api.patch(`/pt/programs/${id}`, data);
    return response.data;
  }

  // ============================================
  // USERS
  // ============================================
  async getUsers(params?: {
    role?: string;
    search?: string;
  }): Promise<{ success: boolean; data: User[] }> {
    const response = await this.api.get('/users', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<{ success: boolean; data: User }> {
    const response = await this.api.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<{ success: boolean; data: User }> {
    const response = await this.api.patch(`/users/${id}`, data);
    return response.data;
  }

  async updateUsername(id: string, username: string): Promise<{ success: boolean; data: User; message: string }> {
    const response = await this.api.patch(`/users/${id}/username`, { username });
    return response.data;
  }

  async updateAvatar(id: string, avatar: string): Promise<{ success: boolean; data: User; message: string }> {
    const response = await this.api.patch(`/users/${id}/avatar`, { avatar });
    return response.data;
  }

  async removeAvatar(id: string): Promise<{ success: boolean; data: User; message: string }> {
    const response = await this.api.delete(`/users/${id}/avatar`);
    return response.data;
  }

  async deactivateUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.patch(`/users/${id}/deactivate`);
    return response.data;
  }

  async activateUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.patch(`/users/${id}/activate`);
    return response.data;
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/users/${id}`);
    return response.data;
  }

  async updateUserRole(id: string, role: string): Promise<{ success: boolean; data: User; message: string }> {
    const response = await this.api.patch(`/users/${id}/role`, { role });
    return response.data;
  }

  // ============================================
  // PAYMENTS
  // ============================================
  async getPayments(params?: {
    status?: string;
    type?: string;
  }): Promise<{ success: boolean; data: Payment[] }> {
    const response = await this.api.get('/payments', { params });
    return response.data;
  }

  async getPaymentStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/payments/statistics', { params });
    return response.data;
  }

  // ============================================
  // CLIENTS (For Trainers)
  // ============================================
  async getClients(): Promise<{ success: boolean; data: User[] }> {
    const response = await this.api.get('/pt/clients');
    return response.data;
  }

  // ============================================
  // CHAT & MESSAGING
  // ============================================
  async getConversations(): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/chat/conversations');
    return response.data;
  }

  async createConversation(data: {
    participantIds: string[];
    title?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/chat/conversations', data);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get(`/chat/conversations/${conversationId}/messages`, {
      params,
    });
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    data: { content: string; attachments?: any[] }
  ): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(
      `/chat/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  }

  async markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
    const response = await this.api.patch(`/chat/messages/${messageId}/read`);
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/chat/messages/${messageId}`);
    return response.data;
  }

  async startSupportChat(): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/chat/support');
    return response.data;
  }

  async getChatUsers(): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/chat/users');
    return response.data;
  }

  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await this.api.get('/chat/unread-count');
    return response.data;
  }

  async markConversationAsRead(conversationId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.patch(`/chat/conversations/${conversationId}/read`);
    return response.data;
  }

  async getChatModuleStatus(): Promise<{ success: boolean; data: { chatEnabled: boolean } }> {
    const response = await this.api.get('/chat/module-status');
    return response.data;
  }

  async toggleChatModule(enabled: boolean): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/chat/toggle-module', { enabled });
    return response.data;
  }

  // ============================================
  // TENANTS (For Platform Admin)
  // ============================================
  async getTenants(params?: {
    status?: string;
    package?: string;
  }): Promise<{ success: boolean; data: Tenant[] }> {
    const response = await this.api.get('/platform/tenants', { params });
    return response.data;
  }

  async createTenant(data: {
    name: string;
    domain: string;
    package: string;
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
  }): Promise<{ success: boolean; data: Tenant }> {
    const response = await this.api.post('/platform/tenants', data);
    return response.data;
  }

  async getPlatformDashboard(): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/platform/dashboard');
    return response.data;
  }

  // ============================================
  // PRODUCTS
  // ============================================
  async getProducts(params?: {
    type?: string;
    status?: string;
    featured?: boolean;
    search?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/products', { params });
    return response.data;
  }

  async getProduct(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/products/${id}`);
    return response.data;
  }

  async publishProduct(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/products/${id}/publish`);
    return response.data;
  }

  async unpublishProduct(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/products/${id}/unpublish`);
    return response.data;
  }

  async addProductImage(
    productId: string,
    data: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean }
  ): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/products/${productId}/images`, data);
    return response.data;
  }

  async updateProductImage(
    imageId: string,
    data: { url?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }
  ): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/products/images/${imageId}`, data);
    return response.data;
  }

  async deleteProductImage(imageId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/products/images/${imageId}`);
    return response.data;
  }

  // ============================================
  // FILE UPLOAD
  // ============================================
  async uploadImage(file: File): Promise<{ success: boolean; data: any }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await this.api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadImages(files: File[]): Promise<{ success: boolean; data: any[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await this.api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // ============================================
  // FEEDBACK
  // ============================================
  async createFeedback(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/feedback', data);
    return response.data;
  }

  async getMyFeedback(): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/feedback/my-feedback');
    return response.data;
  }

  async getAllFeedback(params?: {
    type?: string;
    status?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/feedback', { params });
    return response.data;
  }

  async respondToFeedback(
    id: string,
    data: { response: string; status?: string }
  ): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/feedback/${id}/respond`, data);
    return response.data;
  }

  async getClassReviews(classId: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/feedback/class/${classId}/reviews`);
    return response.data;
  }

  async getTrainerReviews(trainerId: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/feedback/trainer/${trainerId}/reviews`);
    return response.data;
  }

  // ============================================
  // EXERCISES
  // ============================================
  async getExercises(params?: {
    category?: string;
    muscleGroup?: string;
    difficulty?: string;
    search?: string;
    publishedOnly?: boolean;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/exercises', { params });
    return response.data;
  }

  async getExercise(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/exercises/${id}`);
    return response.data;
  }

  async createExercise(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/exercises', data);
    return response.data;
  }

  async updateExercise(id: string, data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/exercises/${id}`, data);
    return response.data;
  }

  async deleteExercise(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/exercises/${id}`);
    return response.data;
  }

  async publishExercise(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/exercises/${id}/publish`);
    return response.data;
  }

  async unpublishExercise(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/exercises/${id}/unpublish`);
    return response.data;
  }

  // ============================================
  // ACCOUNTING
  // ============================================
  async getAccountingModuleStatus(): Promise<{ success: boolean; data: { accountingEnabled: boolean } }> {
    const response = await this.api.get('/accounting/module-status');
    return response.data;
  }

  async toggleAccountingModule(enabled: boolean): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/accounting/toggle-module', { enabled });
    return response.data;
  }

  async getAccountingDashboard(): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/accounting/dashboard');
    return response.data;
  }

  async getIncomeStatement(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/accounting/income-statement', { params });
    return response.data;
  }

  async getVATReport(params: {
    startDate: string;
    endDate: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/accounting/vat-report', { params });
    return response.data;
  }

  async getAccounts(params?: {
    type?: string;
    active?: boolean;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/accounting/accounts', { params });
    return response.data;
  }

  async createAccount(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/accounting/accounts', data);
    return response.data;
  }

  async updateAccount(id: string, data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/accounting/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/accounting/accounts/${id}`);
    return response.data;
  }

  async getSuppliers(params?: {
    active?: boolean;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/accounting/suppliers', { params });
    return response.data;
  }

  async createSupplier(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/accounting/suppliers', data);
    return response.data;
  }

  async updateSupplier(id: string, data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/accounting/suppliers/${id}`, data);
    return response.data;
  }

  async deleteSupplier(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/accounting/suppliers/${id}`);
    return response.data;
  }

  async getTransactions(params?: {
    type?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/accounting/transactions', { params });
    return response.data;
  }

  async createTransaction(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/accounting/transactions', data);
    return response.data;
  }

  // ============================================
  // INVOICES
  // ============================================
  async getInvoices(params?: {
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/invoices', { params });
    return response.data;
  }

  async getInvoice(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(id: string, data: any): Promise<{ success: boolean; data: any }> {
    const response = await this.api.patch(`/invoices/${id}`, data);
    return response.data;
  }

  async sendInvoice(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/invoices/${id}/send`);
    return response.data;
  }

  async markInvoiceAsPaid(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/invoices/${id}/mark-paid`);
    return response.data;
  }

  async cancelInvoice(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.post(`/invoices/${id}/cancel`);
    return response.data;
  }

  async deleteInvoice(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/invoices/${id}`);
    return response.data;
  }

  async sendInvoiceReminder(id: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post(`/invoices/${id}/reminder`);
    return response.data;
  }

  // ============================================
  // PT CREDITS
  // ============================================
  async getMyPTCredits(userId?: string): Promise<{ success: boolean; data: { credits: any[]; available: number; total: number; used: number } }> {
    const response = await this.api.get('/pt/credits', { params: { userId } });
    return response.data;
  }

  async addPTCredits(data: {
    userId: string;
    credits: number;
    orderId?: string;
    expiryDate?: string;
    notes?: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/pt/credits', data);
    return response.data;
  }

  // ============================================
  // CART
  // ============================================
  async getCart(): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/cart');
    return response.data;
  }

  async addToCart(productId: string, quantity: number = 1): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/cart/items', { productId, quantity });
    return response.data;
  }

  async updateCartItem(itemId: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const response = await this.api.patch(`/cart/items/${itemId}`, { quantity });
    return response.data;
  }

  async removeFromCart(itemId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/cart/items/${itemId}`);
    return response.data;
  }

  async clearCart(): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete('/cart');
    return response.data;
  }

  // ============================================
  // ORDERS
  // ============================================
  async createOrder(data: {
    items: Array<{ productId: string; quantity: number }>;
    notes?: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/orders', data);
    return response.data;
  }

  async getOrders(params?: {
    status?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/orders', { params });
    return response.data;
  }

  async getOrder(id: string): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/orders/${id}`);
    return response.data;
  }

  async getOrderStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/orders/statistics', { params });
    return response.data;
  }

  async updateDeliveryInfo(orderId: string, data: {
    deliveryAddress: string;
    deliveryCity: string;
    deliveryZip: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.patch(`/orders/${orderId}/delivery`, data);
    return response.data;
  }

  async markOrderAsShipped(orderId: string, trackingNumber?: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.patch(`/orders/${orderId}/ship`, { trackingNumber });
    return response.data;
  }

  async markOrderAsDelivered(orderId: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.patch(`/orders/${orderId}/deliver`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  // ============================================
  // LANDING PAGE CMS
  // ============================================
  async getLandingPageModuleStatus(): Promise<{ success: boolean; data: { landingPageEnabled: boolean } }> {
    const response = await this.api.get('/landing-page/module-status');
    return response.data;
  }

  async toggleLandingPageModule(enabled: boolean): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/landing-page/toggle-module', { enabled });
    return response.data;
  }

  async getLandingPageContent(): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/landing-page/content');
    return response.data;
  }

  async getLandingPageContentBySection(section: string): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get(`/landing-page/content/${section}`);
    return response.data;
  }

  async getAllLandingPageContent(): Promise<{ success: boolean; data: any[] }> {
    const response = await this.api.get('/landing-page/admin/content');
    return response.data;
  }

  async createLandingPageContent(data: any): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.post('/landing-page/admin/content', data);
    return response.data;
  }

  async updateLandingPageContent(id: string, data: any): Promise<{ success: boolean; data: any; message: string }> {
    const response = await this.api.patch(`/landing-page/admin/content/${id}`, data);
    return response.data;
  }

  async deleteLandingPageContent(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete(`/landing-page/admin/content/${id}`);
    return response.data;
  }

  async initializeDefaultLandingPageContent(): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/landing-page/admin/content/initialize');
    return response.data;
  }

  // ============================================
  // ACTIVITY LOGS
  // ============================================
  async getActivityLogs(params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/activity-logs', { params });
    return response.data;
  }

  async getUserActivityLogs(userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get(`/activity-logs/user/${userId}`, { params });
    return response.data;
  }

  async getActivityStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/activity-logs/stats', { params });
    return response.data;
  }

  // ============================================
  // PASSWORD RESET
  // ============================================
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/password-reset/request', { email });
    return response.data;
  }

  async verifyResetToken(token: string): Promise<{ success: boolean; data: { email: string; valid: boolean } }> {
    const response = await this.api.get(`/password-reset/verify/${token}`);
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/password-reset/reset', { token, newPassword });
    return response.data;
  }

  // ============================================
  // PRODUCT ANALYTICS
  // ============================================
  async trackProductView(productId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post(`/product-analytics/track/${productId}`, {});
    return response.data;
  }

  async getDashboardAnalytics(params?: { period?: string }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/product-analytics/dashboard', { params });
    return response.data;
  }

  async getSalesAnalytics(params?: { startDate?: string; endDate?: string }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/product-analytics/sales', { params });
    return response.data;
  }

  async getMostViewedProducts(params?: { startDate?: string; endDate?: string; limit?: number }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/product-analytics/most-viewed', { params });
    return response.data;
  }

  async getConversionRates(params?: { startDate?: string; endDate?: string }): Promise<{ success: boolean; data: any }> {
    const response = await this.api.get('/product-analytics/conversion', { params });
    return response.data;
  }

  async exportActivityLogs(params?: {
    action?: string;
    resource?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<Blob> {
    const response = await this.api.get('/activity-logs/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
}

export const api = new ApiService();
