import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use the correct API URL based on platform and environment
const getApiUrl = () => {
  // Production Railway API URL - accessible from anywhere
  const PRODUCTION_API_URL = 'https://oblikey-production.up.railway.app/api';

  // DEVELOPMENT MODE OVERRIDE
  // Set USE_LOCAL_BACKEND to true when developing locally
  // Set to false when you want to test against Railway production
  const USE_LOCAL_BACKEND = true; // Toggle this for local development

  // For development, you can use localhost or ngrok
  const DEV_API_URL = USE_LOCAL_BACKEND
    ? 'http://localhost:3000/api'
    : PRODUCTION_API_URL;

  // For web, use localhost in development, Railway in production
  if (Platform.OS === 'web') {
    const apiUrl = __DEV__ ? DEV_API_URL : PRODUCTION_API_URL;
    console.log('[API] Web platform using:', apiUrl);
    return apiUrl;
  }

  // For mobile (iOS/Android), use configured dev URL in dev mode
  // In production builds, always use Railway
  const apiUrl = __DEV__ ? DEV_API_URL : PRODUCTION_API_URL;
  console.log(`[API] Mobile platform using: ${apiUrl} (DEV: ${__DEV__}, LOCAL: ${USE_LOCAL_BACKEND})`);
  return apiUrl;
};

const API_URL = getApiUrl();
console.log('[API] Using API URL:', API_URL);

// Storage helper that works on both web and mobile
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await storage.getItem('token');
        const tenantId = await storage.getItem('tenantId');
        const viewingAsTenant = await storage.getItem('viewingAsTenant');

        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        console.log('  Token from storage:', token ? 'Found (' + token.substring(0, 20) + '...)' : 'NOT FOUND');
        console.log('  Tenant ID from storage:', tenantId || 'NOT FOUND');
        console.log('  Viewing As Tenant:', viewingAsTenant || 'NOT SET');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('  Authorization header set: YES');
        } else {
          console.log('  Authorization header set: NO (no token)');
        }

        if (tenantId) {
          config.headers['x-tenant-id'] = tenantId;
        }

        // Add X-Viewing-As-Tenant header for Super Admin tenant switching
        // BUT exclude super-admin listing endpoints (they need to see all tenants)
        const isSuperAdminListingEndpoint = config.url?.includes('/super-admin/tenants') &&
                                           !config.url?.includes('/super-admin/tenants/');

        if (viewingAsTenant && !isSuperAdminListingEndpoint) {
          config.headers['x-viewing-as-tenant'] = viewingAsTenant;
          console.log('  X-Viewing-As-Tenant header set:', viewingAsTenant);
        } else if (viewingAsTenant && isSuperAdminListingEndpoint) {
          console.log('  X-Viewing-As-Tenant header SKIPPED for tenant listing endpoint');
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await storage.removeItem('token');
          await storage.removeItem('user');
          // You can dispatch a logout action here if needed
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(identifier: string, password: string) {
    // Send identifier which can be either email or username
    // Backend will handle checking both
    const loginData: any = { password };

    // Determine if it's an email or username
    if (identifier.includes('@')) {
      loginData.email = identifier;
    } else {
      loginData.username = identifier;
    }

    console.log('Attempting login with:', identifier);
    const response = await this.axiosInstance.post('/auth/login', loginData);
    console.log('Login response:', JSON.stringify(response.data).substring(0, 200) + '...');

    // Check if response requires tenant selection
    if (response.data.data && response.data.data.requiresTenantSelection) {
      console.log('Multi-tenant user detected, tenant selection required');
      return response.data;
    }

    // Backend returns { success: true, data: { user, token }, message }
    if (response.data.data && response.data.data.token) {
      console.log('Login response received with token:', response.data.data.token.substring(0, 20) + '...');
      await storage.setItem('token', response.data.data.token);
      await storage.setItem('user', JSON.stringify(response.data.data.user));
      if (response.data.data.user.tenantId) {
        await storage.setItem('tenantId', response.data.data.user.tenantId);
      }
      // Verify token was saved
      const savedToken = await storage.getItem('token');
      console.log('Token saved to storage:', savedToken ? 'YES (' + savedToken.substring(0, 20) + '...)' : 'NO');
    } else {
      console.log('Login response has no token. Response structure:', Object.keys(response.data));
    }
    console.log('Login successful');
    return response.data;
  }

  async selectTenant(identifier: string, tenantId: string) {
    const selectData: any = { identifier, tenantId };

    console.log('Selecting tenant:', tenantId, 'for user:', identifier);
    const response = await this.axiosInstance.post('/auth/select-tenant', selectData);
    console.log('Select tenant response:', JSON.stringify(response.data).substring(0, 200) + '...');

    // Store token and user data after successful tenant selection
    if (response.data.data && response.data.data.token) {
      console.log('Tenant selection successful, received token:', response.data.data.token.substring(0, 20) + '...');
      await storage.setItem('token', response.data.data.token);
      await storage.setItem('user', JSON.stringify(response.data.data.user));
      if (response.data.data.user.tenantId) {
        await storage.setItem('tenantId', response.data.data.user.tenantId);
      }
      const savedToken = await storage.getItem('token');
      console.log('Token saved to storage:', savedToken ? 'YES (' + savedToken.substring(0, 20) + '...)' : 'NO');
    }

    return response.data;
  }

  async register(data: any) {
    const response = await this.axiosInstance.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    await storage.removeItem('token');
    await storage.removeItem('user');
    await storage.removeItem('tenantId');
  }

  async getCurrentUser() {
    const response = await this.axiosInstance.get('/auth/me');
    return response.data;
  }

  // Get active tenants for registration (public - no auth required)
  async getActiveTenants() {
    const response = await this.axiosInstance.get('/tenants/active');
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.axiosInstance.post('/password-reset/request', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.axiosInstance.post('/password-reset/reset', { token, password });
    return response.data;
  }

  // User endpoints
  async updateProfile(data: any) {
    const response = await this.axiosInstance.put('/users/profile', data);
    return response.data;
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const response = await this.axiosInstance.put('/users/password', { currentPassword, newPassword });
    return response.data;
  }

  // Classes endpoints
  async getClasses(params?: { status?: string; published?: boolean }) {
    const response = await this.axiosInstance.get('/classes', {
      params: params || undefined
    });
    return response.data;
  }

  async getClassById(id: string) {
    const response = await this.axiosInstance.get(`/classes/${id}`);
    return response.data;
  }

  async createClass(data: any) {
    const response = await this.axiosInstance.post('/classes', data);
    return response.data;
  }

  async updateClass(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/classes/${id}`, data);
    return response.data;
  }

  async deleteClass(id: string) {
    const response = await this.axiosInstance.delete(`/classes/${id}`);
    return response.data;
  }

  async publishClass(id: string) {
    const response = await this.axiosInstance.post(`/classes/${id}/publish`);
    return response.data;
  }

  async unpublishClass(id: string) {
    const response = await this.axiosInstance.post(`/classes/${id}/unpublish`);
    return response.data;
  }

  async cancelClass(id: string, reason?: string) {
    const response = await this.axiosInstance.post(`/classes/${id}/cancel`, { reason });
    return response.data;
  }

  // Bookings endpoints
  async bookClass(classId: string) {
    const response = await this.axiosInstance.post('/bookings', { classId });
    return response.data;
  }

  async getBookings() {
    const response = await this.axiosInstance.get('/bookings');
    return response.data;
  }

  async cancelBooking(id: string) {
    const response = await this.axiosInstance.patch(`/bookings/${id}/cancel`);
    return response.data;
  }

  // PT Sessions endpoints
  async getPTSessions() {
    const response = await this.axiosInstance.get('/pt/sessions');
    return response.data;
  }

  async createPTSession(data: any) {
    const response = await this.axiosInstance.post('/pt/sessions', data);
    return response.data;
  }

  async updatePTSession(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/pt/sessions/${id}`, data);
    return response.data;
  }

  async completePTSession(id: string) {
    const response = await this.axiosInstance.post(`/pt/sessions/${id}/complete`);
    return response.data;
  }

  async updatePTSessionStatus(id: string, status: string) {
    const response = await this.axiosInstance.patch(`/pt/sessions/${id}/status`, { status });
    return response.data;
  }

  async deletePTSession(id: string) {
    const response = await this.axiosInstance.delete(`/pt/sessions/${id}`);
    return response.data;
  }

  async cancelPTSession(id: string) {
    const response = await this.axiosInstance.post(`/pt/sessions/${id}/cancel`);
    return response.data;
  }

  async getPTSession(sessionId: string) {
    const response = await this.axiosInstance.get(`/pt/sessions/${sessionId}`);
    return response.data;
  }

  async submitPTSessionFeedback(sessionId: string, feedbackData: any) {
    const response = await this.axiosInstance.post(`/pt/sessions/${sessionId}/feedback`, feedbackData);
    return response.data;
  }

  async getPTCredits() {
    const response = await this.axiosInstance.get('/pt/credits');
    return response.data;
  }

  async getPTClients() {
    const response = await this.axiosInstance.get('/pt/clients');
    return response.data;
  }

  async getPTTrainers() {
    const response = await this.axiosInstance.get('/pt/trainers');
    return response.data;
  }

  async getSessionResult(sessionId: string) {
    const response = await this.axiosInstance.get(`/pt/sessions/${sessionId}/result`);
    return response.data;
  }

  async createSessionResult(sessionId: string, data: any) {
    const response = await this.axiosInstance.post(`/pt/sessions/${sessionId}/result`, data);
    return response.data;
  }

  async addClientFeedback(sessionId: string, data: any) {
    const response = await this.axiosInstance.post(`/pt/sessions/${sessionId}/feedback`, data);
    return response.data;
  }

  async approvePTSession(id: string) {
    const response = await this.axiosInstance.post(`/pt/sessions/${id}/approve`);
    return response.data;
  }

  async rejectPTSession(id: string, rejectionReason?: string) {
    const response = await this.axiosInstance.post(`/pt/sessions/${id}/reject`, { rejectionReason });
    return response.data;
  }

  async cancelPTSessionWithReason(id: string, cancellationReason?: string) {
    const response = await this.axiosInstance.post(`/pt/sessions/${id}/cancel`, { cancellationReason });
    return response.data;
  }

  // Notification endpoints
  async getNotifications(unreadOnly: boolean = false) {
    const response = await this.axiosInstance.get('/notifications', {
      params: { unreadOnly }
    });
    return response.data;
  }

  async getNotificationsUnreadCount() {
    const response = await this.axiosInstance.get('/notifications/unread-count');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.axiosInstance.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.axiosInstance.patch('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.axiosInstance.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await this.axiosInstance.get('/notifications/preferences');
    return response.data;
  }

  async updateNotificationPreferences(data: any) {
    const response = await this.axiosInstance.patch('/notifications/preferences', data);
    return response.data;
  }

  // Feedback endpoints
  async submitClassFeedback(classId: string, data: { rating: number; comment?: string }) {
    const response = await this.axiosInstance.post(`/feedback/class/${classId}`, data);
    return response.data;
  }

  async getClassReviews(classId: string) {
    const response = await this.axiosInstance.get(`/feedback/class/${classId}/reviews`);
    return response.data;
  }

  async getTrainerReviews(trainerId: string) {
    const response = await this.axiosInstance.get(`/feedback/trainer/${trainerId}/reviews`);
    return response.data;
  }

  async getMyFeedback() {
    const response = await this.axiosInstance.get('/feedback/my-feedback');
    return response.data;
  }

  async createFeedback(data: {
    type: string;
    rating?: number;
    title?: string;
    message: string;
    classId?: string;
    trainerId?: string;
    isAnonymous?: boolean;
    isPublic?: boolean;
  }) {
    const response = await this.axiosInstance.post('/feedback', data);
    return response.data;
  }

  // Products endpoints
  async getProducts(params?: any) {
    const response = await this.axiosInstance.get('/products', {
      params: params || undefined
    });
    return response.data;
  }

  async getProductById(id: string) {
    const response = await this.axiosInstance.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.axiosInstance.post('/products', data, {
      headers: data instanceof FormData ? {
        'Content-Type': 'multipart/form-data',
      } : undefined,
    });
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.axiosInstance.put(`/products/${id}`, data, {
      headers: data instanceof FormData ? {
        'Content-Type': 'multipart/form-data',
      } : undefined,
    });
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.axiosInstance.delete(`/products/${id}`);
    return response.data;
  }

  async trackProductView(productId: string) {
    const response = await this.axiosInstance.post(`/products/${productId}/view`);
    return response.data;
  }

  async addProductImage(productId: string, data: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean }) {
    const response = await this.axiosInstance.post(`/products/${productId}/images`, data);
    return response.data;
  }

  async deleteProductImage(imageId: string) {
    const response = await this.axiosInstance.delete(`/products/images/${imageId}`);
    return response.data;
  }

  async publishProduct(productId: string) {
    const response = await this.axiosInstance.post(`/products/${productId}/publish`);
    return response.data;
  }

  async unpublishProduct(productId: string) {
    const response = await this.axiosInstance.post(`/products/${productId}/unpublish`);
    return response.data;
  }

  // Cart endpoints
  async getCart() {
    const response = await this.axiosInstance.get('/cart');
    return response.data;
  }

  async addToCart(productId: string, quantity: number) {
    const response = await this.axiosInstance.post('/cart/items', { productId, quantity });
    return response.data;
  }

  async updateCartItem(itemId: string, quantity: number) {
    const response = await this.axiosInstance.patch(`/cart/items/${itemId}`, { quantity });
    return response.data;
  }

  async removeFromCart(itemId: string) {
    const response = await this.axiosInstance.delete(`/cart/items/${itemId}`);
    return response.data;
  }

  async clearCart() {
    const response = await this.axiosInstance.delete('/cart');
    return response.data;
  }

  // Orders endpoints
  async createOrder(data: any) {
    const response = await this.axiosInstance.post('/orders', data);
    return response.data;
  }

  async getOrders() {
    const response = await this.axiosInstance.get('/orders');
    return response.data;
  }

  async getAllOrders() {
    const response = await this.axiosInstance.get('/orders/all');
    return response.data;
  }

  async getOrderById(id: string) {
    const response = await this.axiosInstance.get(`/orders/${id}`);
    return response.data;
  }

  async getOrder(id: string) {
    return this.getOrderById(id);
  }

  async updateOrderStatus(id: string, status: string) {
    const response = await this.axiosInstance.patch(`/orders/${id}/status`, { status });
    return response.data;
  }

  async updateDeliveryInfo(id: string, data: any) {
    const response = await this.axiosInstance.put(`/orders/${id}/delivery`, data);
    return response.data;
  }

  async markAsShipped(id: string, trackingNumber?: string) {
    const response = await this.axiosInstance.post(`/orders/${id}/ship`, { trackingNumber });
    return response.data;
  }

  async markAsDelivered(id: string) {
    const response = await this.axiosInstance.post(`/orders/${id}/deliver`);
    return response.data;
  }

  // Product Analytics
  async getProductAnalytics(startDate?: string, endDate?: string) {
    const response = await this.axiosInstance.get('/product-analytics', {
      params: { startDate, endDate }
    });
    return response.data;
  }

  // Chat endpoints
  async getConversations() {
    const response = await this.axiosInstance.get('/chat/conversations');
    return response.data;
  }

  async getMessages(conversationId: string, since?: string) {
    const response = await this.axiosInstance.get(`/chat/conversations/${conversationId}/messages`, {
      params: since ? { since } : undefined
    });
    return response.data;
  }

  async sendMessage(conversationId: string, content: string) {
    const response = await this.axiosInstance.post(`/chat/conversations/${conversationId}/messages`, { content });
    return response.data;
  }

  async markAsRead(conversationId: string) {
    const response = await this.axiosInstance.patch(`/chat/conversations/${conversationId}/read`);
    return response.data;
  }

  async getChatUnreadCount() {
    const response = await this.axiosInstance.get('/chat/unread-count');
    return response.data;
  }

  async searchUsers(query: string) {
    const response = await this.axiosInstance.get('/users/search', {
      params: { q: query }
    });
    return response.data;
  }

  async createConversation(participantIds: string[]) {
    const response = await this.axiosInstance.post('/chat/conversations', { participantIds });
    return response.data;
  }

  async createGroupConversation(groupName: string, participantIds: string[]) {
    const response = await this.axiosInstance.post('/chat/conversations/group', {
      groupName,
      participantIds
    });
    return response.data;
  }

  async addGroupMember(conversationId: string, userId: string) {
    const response = await this.axiosInstance.post(`/chat/conversations/${conversationId}/members`, {
      userId
    });
    return response.data;
  }

  async removeGroupMember(conversationId: string, userId: string) {
    const response = await this.axiosInstance.delete(`/chat/conversations/${conversationId}/members/${userId}`);
    return response.data;
  }

  async leaveGroup(conversationId: string) {
    const response = await this.axiosInstance.post(`/chat/conversations/${conversationId}/leave`);
    return response.data;
  }

  async setTypingIndicator(conversationId: string, isTyping: boolean) {
    const response = await this.axiosInstance.post(`/chat/conversations/${conversationId}/typing`, { isTyping });
    return response.data;
  }

  async getTypingUsers(conversationId: string) {
    const response = await this.axiosInstance.get(`/chat/conversations/${conversationId}/typing`);
    return response.data;
  }

  // Module status endpoints
  async getAllModuleStatuses() {
    const response = await this.axiosInstance.get('/tenant-settings/modules');
    return response.data;
  }

  async toggleModule(module: string, enabled: boolean) {
    const response = await this.axiosInstance.post('/tenant-settings/modules/toggle', {
      module,
      enabled
    });
    return response.data;
  }

  // Legacy endpoints (for backward compatibility)
  async getShopModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.shop || false } };
  }

  async getAccountingModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.accounting || false } };
  }

  async getClassesModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.classes !== false } };
  }

  async getChatModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.chat !== false } };
  }

  async getLandingPageModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.landingPage || false } };
  }

  // Accounting endpoints
  async getAccounts() {
    const response = await this.axiosInstance.get('/accounting/accounts');
    return response.data;
  }

  async createAccount(data: any) {
    const response = await this.axiosInstance.post('/accounting/accounts', data);
    return response.data;
  }

  async seedNorwegianAccounts() {
    const response = await this.axiosInstance.post('/accounting/seed-norwegian-accounts');
    return response.data;
  }

  async getTransactions(params?: any) {
    const response = await this.axiosInstance.get('/accounting/transactions', { params });
    return response.data;
  }

  async createTransaction(data: any) {
    const response = await this.axiosInstance.post('/accounting/transactions', data);
    return response.data;
  }

  async getDashboard(params?: any) {
    const response = await this.axiosInstance.get('/accounting/dashboard', { params });
    return response.data;
  }

  async getIncomeStatement(params?: any) {
    const response = await this.axiosInstance.get('/accounting/income-statement', { params });
    return response.data;
  }

  async getVATReport(params?: any) {
    const response = await this.axiosInstance.get('/accounting/vat-report', { params });
    return response.data;
  }

  async getTrialBalance(params?: any) {
    const response = await this.axiosInstance.get('/accounting/trial-balance', { params });
    return response.data;
  }

  // Suppliers
  async getSuppliers() {
    const response = await this.axiosInstance.get('/accounting/suppliers');
    return response.data;
  }

  async createSupplier(data: any) {
    const response = await this.axiosInstance.post('/accounting/suppliers', data);
    return response.data;
  }

  async updateSupplier(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/accounting/suppliers/${id}`, data);
    return response.data;
  }

  async deleteSupplier(id: string) {
    const response = await this.axiosInstance.delete(`/accounting/suppliers/${id}`);
    return response.data;
  }

  // MVA (VAT) endpoints
  async calculateMVAPeriod(data: any) {
    const response = await this.axiosInstance.post('/accounting/mva/calculate', data);
    return response.data;
  }

  async getCurrentMVAPeriod() {
    const response = await this.axiosInstance.get('/accounting/mva/current-period');
    return response.data;
  }

  async getMVAPeriods(year: number) {
    const response = await this.axiosInstance.get(`/accounting/mva/periods/${year}`);
    return response.data;
  }

  async saveMVAReport(data: any) {
    const response = await this.axiosInstance.post('/accounting/mva/save', data);
    return response.data;
  }

  async getMVAReports(params?: any) {
    const response = await this.axiosInstance.get('/accounting/mva/reports', { params });
    return response.data;
  }

  async deleteMVAReport(id: string) {
    const response = await this.axiosInstance.delete(`/accounting/mva/reports/${id}`);
    return response.data;
  }

  // Activity logs
  async getActivityLogs(params?: any) {
    const response = await this.axiosInstance.get('/activity-logs', { params });
    return response.data;
  }

  // Training Programs
  async getTrainingPrograms(params?: any) {
    const response = await this.axiosInstance.get('/training-programs', { params });
    return response.data;
  }

  async getTrainingProgramById(id: string) {
    const response = await this.axiosInstance.get(`/training-programs/${id}`);
    return response.data;
  }

  async createTrainingProgram(data: any) {
    const response = await this.axiosInstance.post('/training-programs', data);
    return response.data;
  }

  async updateTrainingProgram(id: string, data: any) {
    const response = await this.axiosInstance.put(`/training-programs/${id}`, data);
    return response.data;
  }

  async deleteTrainingProgram(id: string) {
    const response = await this.axiosInstance.delete(`/training-programs/${id}`);
    return response.data;
  }

  // Upload
  async uploadImage(formData: FormData) {
    const response = await this.axiosInstance.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Analytics
  async getAnalytics(timeRange?: string) {
    const response = await this.axiosInstance.get('/analytics', {
      params: timeRange ? { timeRange } : undefined
    });
    return response.data;
  }

  // Tenant Settings
  async getTenantSettings() {
    const response = await this.axiosInstance.get('/tenant-settings');
    return response.data;
  }

  async updateTenantSettings(data: any) {
    const response = await this.axiosInstance.patch('/tenant-settings', data);
    return response.data;
  }

  // User Management
  async getAllUsers() {
    const response = await this.axiosInstance.get('/users');
    return response.data;
  }

  async getUsers() {
    const response = await this.axiosInstance.get('/users');
    return response.data;
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'CUSTOMER' | 'TRAINER';
    phone?: string;
    dateOfBirth?: string;
    username?: string;
  }) {
    const response = await this.axiosInstance.post('/users', userData);
    return response.data;
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.axiosInstance.patch(`/users/${userId}/role`, { role });
    return response.data;
  }

  async toggleUserStatus(userId: string) {
    const response = await this.axiosInstance.put(`/users/${userId}/toggle-status`);
    return response.data;
  }

  async activateUser(userId: string) {
    const response = await this.axiosInstance.patch(`/users/${userId}/activate`);
    return response.data;
  }

  async deactivateUser(userId: string) {
    const response = await this.axiosInstance.patch(`/users/${userId}/deactivate`);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.axiosInstance.delete(`/users/${userId}`);
    return response.data;
  }

  // Transfer user to another tenant (SUPER_ADMIN only)
  async transferUserToTenant(userId: string, tenantId: string) {
    const response = await this.axiosInstance.patch(`/users/${userId}/transfer-tenant`, {
      tenantId
    });
    return response.data;
  }

  // ============================================
  // E-COMMERCE ENDPOINTS
  // ============================================

  // Product Categories
  async getCategories(activeOnly: boolean = true) {
    const response = await this.axiosInstance.get('/ecommerce/categories', {
      params: { activeOnly }
    });
    return response.data;
  }

  async getCategoryBySlug(slug: string) {
    const response = await this.axiosInstance.get(`/ecommerce/categories/${slug}`);
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/ecommerce/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string) {
    const response = await this.axiosInstance.delete(`/ecommerce/categories/${id}`);
    return response.data;
  }

  // Product Variants
  async getProductVariants(productId: string) {
    const response = await this.axiosInstance.get(`/ecommerce/products/${productId}/variants`);
    return response.data;
  }

  async createVariant(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/variants', data);
    return response.data;
  }

  async updateVariant(id: string, data: any) {
    const response = await this.axiosInstance.patch(`/ecommerce/variants/${id}`, data);
    return response.data;
  }

  async deleteVariant(id: string) {
    const response = await this.axiosInstance.delete(`/ecommerce/variants/${id}`);
    return response.data;
  }

  // Product Attributes
  async getAttributes() {
    const response = await this.axiosInstance.get('/ecommerce/attributes');
    return response.data;
  }

  async createAttribute(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/attributes', data);
    return response.data;
  }

  async createAttributeValue(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/attributes/values', data);
    return response.data;
  }

  // Wishlist
  async getWishlist() {
    const response = await this.axiosInstance.get('/ecommerce/wishlist');
    return response.data;
  }

  async addToWishlist(productId: string, variantId?: string, notes?: string) {
    const response = await this.axiosInstance.post('/ecommerce/wishlist', {
      productId,
      variantId,
      notes
    });
    return response.data;
  }

  async removeFromWishlist(itemId: string) {
    const response = await this.axiosInstance.delete(`/ecommerce/wishlist/${itemId}`);
    return response.data;
  }

  // Product Reviews
  async getAllReviews(status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED') {
    const response = await this.axiosInstance.get('/ecommerce/reviews', {
      params: { status }
    });
    return response.data;
  }

  async getProductReviews(productId: string, includeAll: boolean = false) {
    const response = await this.axiosInstance.get(`/ecommerce/products/${productId}/reviews`, {
      params: { includeAll }
    });
    return response.data;
  }

  async createReview(data: { productId: string; rating: number; title?: string; comment: string }) {
    const response = await this.axiosInstance.post('/ecommerce/reviews', data);
    return response.data;
  }

  async voteReviewHelpful(reviewId: string, helpful: boolean) {
    const response = await this.axiosInstance.post(`/ecommerce/reviews/${reviewId}/vote`, { helpful });
    return response.data;
  }

  async moderateReview(reviewId: string, status: 'APPROVED' | 'REJECTED' | 'FLAGGED') {
    const response = await this.axiosInstance.patch(`/ecommerce/reviews/${reviewId}/moderate`, { status });
    return response.data;
  }

  // Discount Codes
  async getDiscountCodes(activeOnly: boolean = true) {
    const response = await this.axiosInstance.get('/ecommerce/discount-codes', {
      params: { activeOnly }
    });
    return response.data;
  }

  async createDiscountCode(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/discount-codes', data);
    return response.data;
  }

  async validateDiscountCode(code: string, orderAmount: number, productIds: string[]) {
    const response = await this.axiosInstance.post('/ecommerce/discount-codes/validate', {
      code,
      orderAmount,
      productIds
    });
    return response.data;
  }

  // Product Collections
  async getCollections(activeOnly: boolean = true) {
    const response = await this.axiosInstance.get('/ecommerce/collections', {
      params: { activeOnly }
    });
    return response.data;
  }

  async createCollection(data: any) {
    const response = await this.axiosInstance.post('/ecommerce/collections', data);
    return response.data;
  }

  async addProductToCollection(collectionId: string, productId: string, sortOrder?: number) {
    const response = await this.axiosInstance.post('/ecommerce/collections/products', {
      collectionId,
      productId,
      sortOrder
    });
    return response.data;
  }

  async removeProductFromCollection(collectionId: string, productId: string) {
    const response = await this.axiosInstance.delete(`/ecommerce/collections/${collectionId}/products/${productId}`);
    return response.data;
  }

  // ============================================
  // MEMBERSHIP ENDPOINTS
  // ============================================

  // Membership Plans
  async getMembershipPlans(activeOnly: boolean = true) {
    const response = await this.axiosInstance.get('/memberships/plans', {
      params: { activeOnly }
    });
    return response.data;
  }

  async createMembershipPlan(data: any) {
    const response = await this.axiosInstance.post('/memberships/plans', data);
    return response.data;
  }

  async updateMembershipPlan(planId: string, data: any) {
    const response = await this.axiosInstance.patch(`/memberships/plans/${planId}`, data);
    return response.data;
  }

  async deleteMembershipPlan(planId: string) {
    const response = await this.axiosInstance.delete(`/memberships/plans/${planId}`);
    return response.data;
  }

  // Memberships
  async getMemberships(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.axiosInstance.get('/memberships', { params });
    return response.data;
  }

  async getMembership(membershipId: string) {
    const response = await this.axiosInstance.get(`/memberships/${membershipId}`);
    return response.data;
  }

  async createMembership(data: { userId: string; planId: string; startDate?: string }) {
    const response = await this.axiosInstance.post('/memberships', data);
    return response.data;
  }

  // Membership Actions
  async freezeMembership(membershipId: string, data: { startDate: string; endDate: string; reason?: string }) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/freeze`, data);
    return response.data;
  }

  async unfreezeMembership(membershipId: string) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/unfreeze`);
    return response.data;
  }

  async cancelMembership(membershipId: string, reason?: string) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/cancel`, { reason });
    return response.data;
  }

  async suspendMembership(membershipId: string, reason: string) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/suspend`, { reason });
    return response.data;
  }

  async blacklistMembership(membershipId: string, reason: string) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/blacklist`, { reason });
    return response.data;
  }

  async reactivateMembership(membershipId: string) {
    const response = await this.axiosInstance.post(`/memberships/${membershipId}/reactivate`);
    return response.data;
  }

  // Check-In
  async checkIn(membershipId: string, location?: string, notes?: string) {
    const response = await this.axiosInstance.post('/memberships/check-in', {
      membershipId,
      location,
      notes
    });
    return response.data;
  }

  async checkOut(checkInId: string) {
    const response = await this.axiosInstance.post(`/memberships/check-out/${checkInId}`);
    return response.data;
  }

  async getActiveCheckIn() {
    const response = await this.axiosInstance.get('/memberships/active-check-in');
    return response.data;
  }

  async getCheckInHistory(membershipId: string, params?: { page?: number; limit?: number }) {
    const response = await this.axiosInstance.get(`/memberships/${membershipId}/check-ins`, { params });
    return response.data;
  }

  // Payments
  async getMembershipPayments(membershipId: string) {
    const response = await this.axiosInstance.get(`/memberships/${membershipId}/payments`);
    return response.data;
  }

  async markPaymentPaid(paymentId: string) {
    const response = await this.axiosInstance.post(`/memberships/payments/${paymentId}/mark-paid`);
    return response.data;
  }

  async sendPaymentReminder(paymentId: string, type: string, method?: string, message?: string) {
    const response = await this.axiosInstance.post(`/memberships/payments/${paymentId}/send-reminder`, {
      type,
      method,
      message
    });
    return response.data;
  }

  // Statistics & Activity
  async getMembershipStats() {
    const response = await this.axiosInstance.get('/memberships/stats/overview');
    return response.data;
  }

  async getMemberActivityOverview(membershipId: string) {
    const response = await this.axiosInstance.get(`/memberships/${membershipId}/activity`);
    return response.data;
  }

  // ============================================
  // DOOR ACCESS ENDPOINTS
  // ============================================

  // Door Management
  async getDoors() {
    const response = await this.axiosInstance.get('/door-access/doors');
    return response.data;
  }

  async getDoorById(doorId: string) {
    const response = await this.axiosInstance.get(`/door-access/doors/${doorId}`);
    return response.data;
  }

  async createDoor(data: {
    name: string;
    location: string;
    ipAddress: string;
    port: number;
    macAddress?: string;
    description?: string;
  }) {
    const response = await this.axiosInstance.post('/door-access/doors', data);
    return response.data;
  }

  async updateDoor(doorId: string, data: {
    name?: string;
    location?: string;
    ipAddress?: string;
    port?: number;
    macAddress?: string;
    description?: string;
  }) {
    const response = await this.axiosInstance.patch(`/door-access/doors/${doorId}`, data);
    return response.data;
  }

  async deleteDoor(doorId: string) {
    const response = await this.axiosInstance.delete(`/door-access/doors/${doorId}`);
    return response.data;
  }

  async testDoorConnection(doorId: string) {
    const response = await this.axiosInstance.post(`/door-access/doors/${doorId}/test-connection`);
    return response.data;
  }

  async lockDoor(doorId: string) {
    const response = await this.axiosInstance.post(`/door-access/doors/${doorId}/lock`);
    return response.data;
  }

  async unlockDoor(doorId: string, options?: { proximityData?: any; testMode?: boolean }) {
    const response = await this.axiosInstance.post(`/door-access/doors/${doorId}/unlock`, options);
    return response.data;
  }

  // Access Rules
  async getDoorAccessRules(doorId: string) {
    const response = await this.axiosInstance.get(`/door-access/doors/${doorId}/access-rules`);
    return response.data;
  }

  async getAccessRuleById(ruleId: string) {
    const response = await this.axiosInstance.get(`/door-access/access-rules/${ruleId}`);
    return response.data;
  }

  async createAccessRule(data: {
    doorId: string;
    type: 'USER' | 'GROUP' | 'MEMBERSHIP' | 'TIME_BASED' | 'ROLE';
    userId?: string;
    userGroupId?: string;
    membershipPlanId?: string;
    priority: number;
    isActive: boolean;
    validFrom?: string;
    validTo?: string;
    allowedDays?: number[];
    allowedTimeStart?: string;
    allowedTimeEnd?: string;
    description?: string;
  }) {
    const response = await this.axiosInstance.post(`/door-access/doors/${data.doorId}/access-rules`, data);
    return response.data;
  }

  async updateAccessRule(ruleId: string, data: any) {
    const response = await this.axiosInstance.put(`/door-access/access-rules/${ruleId}`, data);
    return response.data;
  }

  async deleteAccessRule(ruleId: string) {
    const response = await this.axiosInstance.delete(`/door-access/access-rules/${ruleId}`);
    return response.data;
  }

  // Access Logs
  async getAccessLogs(params?: {
    doorId?: string;
    userId?: string;
    success?: boolean;
    action?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.axiosInstance.get('/door-access/access-logs', { params });
    return response.data;
  }

  async getAccessLogById(logId: string) {
    const response = await this.axiosInstance.get(`/door-access/access-logs/${logId}`);
    return response.data;
  }

  async exportAccessLogs(params?: {
    doorId?: string;
    userId?: string;
    success?: boolean;
    action?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.axiosInstance.get('/door-access/access-logs/export', { params });
    return response.data;
  }

  async getAccessLogStats(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.axiosInstance.get('/door-access/access-logs/stats', { params });
    return response.data;
  }

  async getSuspiciousActivity(params?: {
    timeWindow?: number;
    threshold?: number;
  }) {
    const response = await this.axiosInstance.get('/door-access/access-logs/suspicious', { params });
    return response.data;
  }

  //  Customer Door Access Functions
  async getUserAccessibleDoors() {
    const response = await this.axiosInstance.get('/door-access/my-accessible-doors');
    return response.data;
  }

  async getMembershipStatus() {
    const response = await this.axiosInstance.get('/memberships/my-status');
    return response.data;
  }

  // Door Access Module Status
  async getDoorAccessModuleStatus() {
    const response = await this.getAllModuleStatuses();
    return { success: response.success, data: { enabled: response.data?.doorAccess || false } };
  }

  // ============================================
  // SUPER ADMIN ENDPOINTS
  // ============================================

  // Tenant Management
  async getAllTenants(params?: {
    search?: string;
    active?: boolean;
    subscriptionStatus?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.axiosInstance.get('/super-admin/tenants', { params });
    return response.data;
  }

  async getTenantDetails(tenantId: string) {
    const response = await this.axiosInstance.get(`/super-admin/tenants/${tenantId}`);
    return response.data;
  }

  async createTenant(data: {
    name: string;
    subdomain: string;
    email?: string;
    phone?: string;
    address?: string;
    settings?: any;
    active?: boolean;
  }) {
    const response = await this.axiosInstance.post('/super-admin/tenants', data);
    return response.data;
  }

  async updateTenant(tenantId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    settings?: any;
    active?: boolean;
  }) {
    const response = await this.axiosInstance.put(`/super-admin/tenants/${tenantId}`, data);
    return response.data;
  }

  async setTenantStatus(tenantId: string, active: boolean) {
    const response = await this.axiosInstance.patch(`/super-admin/tenants/${tenantId}/status`, { active });
    return response.data;
  }

  async deleteTenant(tenantId: string) {
    const response = await this.axiosInstance.delete(`/super-admin/tenants/${tenantId}`);
    return response.data;
  }

  async getExpiringTrials(days?: number) {
    const response = await this.axiosInstance.get('/super-admin/tenants/expiring-trials', {
      params: { days }
    });
    return response.data;
  }

  // Tenant User Management
  async getTenantUsers(tenantId: string) {
    const response = await this.axiosInstance.get(`/super-admin/tenants/${tenantId}/users`);
    return response.data;
  }

  async createUserForTenant(tenantId: string, userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'CUSTOMER';
    phone?: string;
  }) {
    const response = await this.axiosInstance.post(`/super-admin/tenants/${tenantId}/users`, userData);
    return response.data;
  }

  async updateTenantUser(tenantId: string, userId: string, userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: 'ADMIN' | 'CUSTOMER';
    phone?: string;
    active?: boolean;
  }) {
    const response = await this.axiosInstance.put(`/super-admin/tenants/${tenantId}/users/${userId}`, userData);
    return response.data;
  }

  async deleteTenantUser(tenantId: string, userId: string) {
    const response = await this.axiosInstance.delete(`/super-admin/tenants/${tenantId}/users/${userId}`);
    return response.data;
  }

  // Feature Management
  async getAllFeatures(includeInactive?: boolean) {
    const response = await this.axiosInstance.get('/super-admin/features', {
      params: { includeInactive }
    });
    return response.data;
  }

  async getFeatureById(featureId: string) {
    const response = await this.axiosInstance.get(`/super-admin/features/${featureId}`);
    return response.data;
  }

  async createFeature(data: {
    key: string;
    name: string;
    description?: string;
    category: string;
    isCore?: boolean;
    sortOrder?: number;
  }) {
    const response = await this.axiosInstance.post('/super-admin/features', data);
    return response.data;
  }

  async updateFeature(featureId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    isCore?: boolean;
    sortOrder?: number;
    active?: boolean;
  }) {
    const response = await this.axiosInstance.put(`/super-admin/features/${featureId}`, data);
    return response.data;
  }

  async deleteFeature(featureId: string) {
    const response = await this.axiosInstance.delete(`/super-admin/features/${featureId}`);
    return response.data;
  }

  // Feature Pack Management
  async getAllFeaturePacks(includeInactive?: boolean) {
    const response = await this.axiosInstance.get('/super-admin/feature-packs', {
      params: { includeInactive }
    });
    return response.data;
  }

  async getFeaturePackById(packId: string) {
    const response = await this.axiosInstance.get(`/super-admin/feature-packs/${packId}`);
    return response.data;
  }

  async createFeaturePack(data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    currency?: string;
    interval: string;
    trialDays?: number;
    isPopular?: boolean;
    sortOrder?: number;
    featureIds: string[];
    metadata?: any;
  }) {
    const response = await this.axiosInstance.post('/super-admin/feature-packs', data);
    return response.data;
  }

  async updateFeaturePack(packId: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    price?: number;
    currency?: string;
    interval?: string;
    trialDays?: number;
    isPopular?: boolean;
    sortOrder?: number;
    featureIds?: string[];
    active?: boolean;
    metadata?: any;
  }) {
    const response = await this.axiosInstance.put(`/super-admin/feature-packs/${packId}`, data);
    return response.data;
  }

  async deleteFeaturePack(packId: string) {
    const response = await this.axiosInstance.delete(`/super-admin/feature-packs/${packId}`);
    return response.data;
  }

  // Tenant Feature Management
  async getTenantFeatures(tenantId: string) {
    const response = await this.axiosInstance.get(`/super-admin/tenants/${tenantId}/features`);
    return response.data;
  }

  async setTenantFeatures(tenantId: string, featureIds: string[]) {
    const response = await this.axiosInstance.post(`/super-admin/tenants/${tenantId}/features`, {
      featureIds
    });
    return response.data;
  }

  async enableTenantFeature(tenantId: string, featureId: string) {
    const response = await this.axiosInstance.post(
      `/super-admin/tenants/${tenantId}/features/${featureId}/enable`
    );
    return response.data;
  }

  async disableTenantFeature(tenantId: string, featureId: string) {
    const response = await this.axiosInstance.post(
      `/super-admin/tenants/${tenantId}/features/${featureId}/disable`
    );
    return response.data;
  }

  async applyFeaturePackToTenant(tenantId: string, packId: string) {
    const response = await this.axiosInstance.post(
      `/super-admin/tenants/${tenantId}/apply-pack/${packId}`
    );
    return response.data;
  }

  // Subscription Management
  async createSubscription(data: {
    tenantId: string;
    featurePackId?: string;
    tier?: string;
    interval: string;
    price: number;
    currency?: string;
    trialDays?: number;
    customFeatures?: any;
    billingEmail?: string;
    billingName?: string;
    billingAddress?: string;
    billingPhone?: string;
    vatNumber?: string;
    notes?: string;
  }) {
    const response = await this.axiosInstance.post('/super-admin/subscriptions', data);
    return response.data;
  }

  async updateSubscription(subscriptionId: string, data: {
    featurePackId?: string;
    tier?: string;
    interval?: string;
    price?: number;
    currency?: string;
    customFeatures?: any;
    billingEmail?: string;
    billingName?: string;
    billingAddress?: string;
    billingPhone?: string;
    vatNumber?: string;
    notes?: string;
  }) {
    const response = await this.axiosInstance.put(`/super-admin/subscriptions/${subscriptionId}`, data);
    return response.data;
  }

  async changeSubscriptionStatus(subscriptionId: string, status: string) {
    const response = await this.axiosInstance.patch(
      `/super-admin/subscriptions/${subscriptionId}/status`,
      { status }
    );
    return response.data;
  }

  async cancelSubscription(subscriptionId: string, data?: {
    cancelAtPeriodEnd?: boolean;
    cancellationReason?: string;
  }) {
    const response = await this.axiosInstance.post(
      `/super-admin/subscriptions/${subscriptionId}/cancel`,
      data
    );
    return response.data;
  }

  async reactivateSubscription(subscriptionId: string) {
    const response = await this.axiosInstance.post(
      `/super-admin/subscriptions/${subscriptionId}/reactivate`
    );
    return response.data;
  }

  // Invoice Management
  async getSubscriptionInvoices(subscriptionId: string) {
    const response = await this.axiosInstance.get(
      `/super-admin/subscriptions/${subscriptionId}/invoices`
    );
    return response.data;
  }

  async getInvoiceById(invoiceId: string) {
    const response = await this.axiosInstance.get(`/super-admin/invoices/${invoiceId}`);
    return response.data;
  }

  async markInvoiceSent(invoiceId: string) {
    const response = await this.axiosInstance.post(`/super-admin/invoices/${invoiceId}/mark-sent`);
    return response.data;
  }

  async markInvoicePaid(invoiceId: string, data?: {
    paymentMethod?: string;
    paymentId?: string;
  }) {
    const response = await this.axiosInstance.post(
      `/super-admin/invoices/${invoiceId}/mark-paid`,
      data
    );
    return response.data;
  }

  async getOverdueInvoices() {
    const response = await this.axiosInstance.get('/super-admin/invoices/overdue');
    return response.data;
  }

  // Statistics
  async getTenantStats() {
    const response = await this.axiosInstance.get('/super-admin/stats/tenants');
    return response.data;
  }

  async getFeatureStats() {
    const response = await this.axiosInstance.get('/super-admin/stats/features');
    return response.data;
  }

  async getSubscriptionStats() {
    const response = await this.axiosInstance.get('/super-admin/stats/subscriptions');
    return response.data;
  }
}

export const api = new ApiService();
export default api;
export { storage };
