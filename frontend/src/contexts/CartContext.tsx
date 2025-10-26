import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface CartItem {
  id?: string; // Backend cart item ID
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
  type: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: number;
  itemCount: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load cart from backend when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      // Clear cart when user logs out
      setItems([]);
    }
  }, [isAuthenticated]);

  const loadCart = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await api.getCart();

      if (response.success && response.data) {
        // Transform backend cart data to match CartItem interface
        const cartItems: CartItem[] = response.data.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name || 'Unknown Product',
          price: item.product?.price || 0,
          currency: item.product?.currency || 'NOK',
          quantity: item.quantity,
          image: item.product?.image,
          type: item.product?.type || 'PHYSICAL_PRODUCT'
        }));

        setItems(cartItems);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, 'quantity'>) => {
    if (!isAuthenticated) {
      alert('Du må logge inn for å legge til produkter i handlekurven');
      return;
    }

    try {
      setLoading(true);
      await api.addToCart(item.productId, 1);
      await loadCart(); // Reload cart from backend
    } catch (error: any) {
      console.error('Failed to add item to cart:', error);
      alert(error.response?.data?.error || 'Kunne ikke legge til produkt i handlekurven');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      // Find the cart item ID by productId
      const cartItem = items.find(item => item.productId === productId);
      if (cartItem && cartItem.id) {
        await api.removeFromCart(cartItem.id);
        await loadCart(); // Reload cart from backend
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      alert('Kunne ikke fjerne produkt fra handlekurven');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!isAuthenticated) return;

    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    try {
      setLoading(true);
      // Find the cart item ID by productId
      const cartItem = items.find(item => item.productId === productId);
      if (cartItem && cartItem.id) {
        await api.updateCartItem(cartItem.id, quantity);
        await loadCart(); // Reload cart from backend
      }
    } catch (error: any) {
      console.error('Failed to update cart item:', error);
      alert(error.response?.data?.error || 'Kunne ikke oppdatere antall');
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      await api.clearCart();
      setItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      alert('Kunne ikke tømme handlekurven');
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async () => {
    await loadCart();
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        loading,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
