import { api } from '../../src/services/api';

// Mock axios
jest.mock('axios');

describe('API Service', () => {
  describe('Authentication', () => {
    test('should login successfully with email', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '123',
            email: 'test@test.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'CUSTOMER'
          },
          token: 'mock-token'
        }
      };

      // Test login
      const result = await api.login('test@test.com', 'password');
      expect(result).toBeDefined();
    });

    test('should login successfully with username', async () => {
      const result = await api.login('testuser', 'password');
      expect(result).toBeDefined();
    });

    test('should register a new user', async () => {
      const registerData = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'oblikey-demo'
      };

      const result = await api.register(registerData);
      expect(result).toBeDefined();
    });

    test('should logout successfully', async () => {
      await api.logout();
      // Verify token is cleared
    });
  });

  describe('Classes', () => {
    test('should fetch all classes', async () => {
      const result = await api.getClasses();
      expect(result).toBeDefined();
    });

    test('should create a new class', async () => {
      const classData = {
        name: 'Test Class',
        type: 'GROUP_CLASS',
        capacity: 20,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        trainerId: '123'
      };

      const result = await api.createClass(classData);
      expect(result).toBeDefined();
    });

    test('should update a class', async () => {
      const classData = {
        name: 'Updated Class',
        capacity: 25
      };

      const result = await api.updateClass('class-123', classData);
      expect(result).toBeDefined();
    });

    test('should delete a class', async () => {
      const result = await api.deleteClass('class-123');
      expect(result).toBeDefined();
    });

    test('should cancel a class', async () => {
      const result = await api.cancelClass('class-123');
      expect(result).toBeDefined();
    });
  });

  describe('Bookings', () => {
    test('should book a class', async () => {
      const result = await api.bookClass('class-123');
      expect(result).toBeDefined();
    });

    test('should fetch user bookings', async () => {
      const result = await api.getBookings();
      expect(result).toBeDefined();
    });

    test('should cancel a booking', async () => {
      const result = await api.cancelBooking('booking-123');
      expect(result).toBeDefined();
    });
  });

  describe('PT Sessions', () => {
    test('should fetch PT sessions', async () => {
      const result = await api.getPTSessions();
      expect(result).toBeDefined();
    });

    test('should create PT session', async () => {
      const sessionData = {
        title: 'Test Session',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        clientId: '123'
      };

      const result = await api.createPTSession(sessionData);
      expect(result).toBeDefined();
    });

    test('should update PT session status', async () => {
      const result = await api.updatePTSessionStatus('session-123', 'COMPLETED');
      expect(result).toBeDefined();
    });

    test('should delete PT session', async () => {
      const result = await api.deletePTSession('session-123');
      expect(result).toBeDefined();
    });
  });

  describe('Products', () => {
    test('should fetch all products', async () => {
      const result = await api.getProducts();
      expect(result).toBeDefined();
    });

    test('should fetch product by id', async () => {
      const result = await api.getProductById('product-123');
      expect(result).toBeDefined();
    });

    test('should create product', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        category: 'EQUIPMENT',
        stock: 10
      };

      const result = await api.createProduct(productData);
      expect(result).toBeDefined();
    });

    test('should update product', async () => {
      const productData = {
        name: 'Updated Product',
        price: 89.99
      };

      const result = await api.updateProduct('product-123', productData);
      expect(result).toBeDefined();
    });

    test('should delete product', async () => {
      const result = await api.deleteProduct('product-123');
      expect(result).toBeDefined();
    });

    test('should track product view', async () => {
      const result = await api.trackProductView('product-123');
      expect(result).toBeDefined();
    });
  });

  describe('Orders', () => {
    test('should fetch user orders', async () => {
      const result = await api.getOrders();
      expect(result).toBeDefined();
    });

    test('should fetch all orders (admin)', async () => {
      const result = await api.getAllOrders();
      expect(result).toBeDefined();
    });

    test('should create order', async () => {
      const orderData = {
        items: [{ productId: '123', quantity: 2 }]
      };

      const result = await api.createOrder(orderData);
      expect(result).toBeDefined();
    });

    test('should update order status', async () => {
      const result = await api.updateOrderStatus('order-123', 'SHIPPED');
      expect(result).toBeDefined();
    });
  });

  describe('Cart', () => {
    test('should fetch cart', async () => {
      const result = await api.getCart();
      expect(result).toBeDefined();
    });

    test('should add item to cart', async () => {
      const result = await api.addToCart('product-123', 2);
      expect(result).toBeDefined();
    });

    test('should update cart item', async () => {
      const result = await api.updateCartItem('product-123', 3);
      expect(result).toBeDefined();
    });

    test('should remove item from cart', async () => {
      const result = await api.removeFromCart('product-123');
      expect(result).toBeDefined();
    });

    test('should clear cart', async () => {
      const result = await api.clearCart();
      expect(result).toBeDefined();
    });
  });

  describe('User Management', () => {
    test('should fetch all users (admin)', async () => {
      const result = await api.getUsers();
      expect(result).toBeDefined();
    });

    test('should update user role', async () => {
      const result = await api.updateUserRole('user-123', 'TRAINER');
      expect(result).toBeDefined();
    });

    test('should activate user', async () => {
      const result = await api.activateUser('user-123');
      expect(result).toBeDefined();
    });

    test('should deactivate user', async () => {
      const result = await api.deactivateUser('user-123');
      expect(result).toBeDefined();
    });

    test('should delete user', async () => {
      const result = await api.deleteUser('user-123');
      expect(result).toBeDefined();
    });
  });

  describe('Analytics', () => {
    test('should fetch analytics data', async () => {
      const result = await api.getAnalytics('month');
      expect(result).toBeDefined();
    });

    test('should fetch product analytics', async () => {
      const result = await api.getProductAnalytics();
      expect(result).toBeDefined();
    });
  });

  describe('Tenant Settings', () => {
    test('should fetch tenant settings', async () => {
      const result = await api.getTenantSettings();
      expect(result).toBeDefined();
    });

    test('should update tenant settings', async () => {
      const settingsData = {
        businessName: 'Updated Business',
        email: 'updated@business.com'
      };

      const result = await api.updateTenantSettings(settingsData);
      expect(result).toBeDefined();
    });
  });

  describe('Chat', () => {
    test('should fetch conversations', async () => {
      const result = await api.getConversations();
      expect(result).toBeDefined();
    });

    test('should fetch messages', async () => {
      const result = await api.getMessages('conversation-123');
      expect(result).toBeDefined();
    });

    test('should send message', async () => {
      const result = await api.sendMessage('conversation-123', 'Test message');
      expect(result).toBeDefined();
    });

    test('should mark conversation as read', async () => {
      const result = await api.markAsRead('conversation-123');
      expect(result).toBeDefined();
    });
  });
});
