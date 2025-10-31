import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
  image?: string;
  currency: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: any) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user, token } = useAuth();

  useEffect(() => {
    // Only load cart if user is authenticated
    if (user && token) {
      loadCart();
    } else {
      // Clear cart items when user logs out
      setItems([]);
    }
  }, [user, token]);

  const loadCart = async () => {
    // Don't load cart if user is not authenticated
    if (!user || !token) {
      return;
    }

    try {
      const response = await api.getCart();
      if (response.success && response.data) {
        setItems(response.data.items || []);
      }
    } catch (error: any) {
      // Silently handle 403 errors (not authenticated or deactivated tenant)
      if (error?.response?.status === 403) {
        console.log('[Cart] Access denied or tenant deactivated');
        setItems([]);
        return;
      }
      console.error('Error loading cart:', error);
    }
  };

  const addItem = async (product: any) => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    try {
      const productId = product.productId || product.id;
      const existingItem = items.find(item => item.productId === productId);
      const quantity = existingItem ? existingItem.quantity + 1 : 1;

      const response = await api.addToCart(productId, quantity);
      if (response.success) {
        await loadCart();
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[Cart] Access denied');
      }
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeItem = async (productId: string) => {
    if (!user || !token) {
      return;
    }

    try {
      // Find the cart item by productId to get its id
      const item = items.find(item => item.productId === productId);
      if (!item) {
        console.error('Item not found in cart');
        return;
      }

      const response = await api.removeFromCart(item.id);
      if (response.success) {
        setItems(items.filter(item => item.productId !== productId));
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[Cart] Access denied');
        return;
      }
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user || !token) {
      return;
    }

    if (quantity < 1) {
      await removeItem(productId);
      return;
    }

    try {
      // Find the cart item by productId to get its id
      const item = items.find(item => item.productId === productId);
      if (!item) {
        console.error('Item not found in cart');
        return;
      }

      const response = await api.updateCartItem(item.id, quantity);
      if (response.success) {
        setItems(items.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        ));
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[Cart] Access denied');
        return;
      }
      console.error('Error updating quantity:', error);
    }
  };

  const clearCart = async () => {
    if (!user || !token) {
      setItems([]);
      return;
    }

    try {
      const response = await api.clearCart();
      if (response.success) {
        setItems([]);
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.log('[Cart] Access denied');
        setItems([]);
        return;
      }
      console.error('Error clearing cart:', error);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, itemCount, total, addItem, removeItem, updateQuantity, clearCart, loadCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
