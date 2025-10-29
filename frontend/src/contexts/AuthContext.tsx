import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, storage } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  viewingAsTenantId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  switchTenant: (tenantId: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingAsTenantId, setViewingAsTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const storedToken = await storage.getItem('token');
        const userStr = await storage.getItem('user');
        const storedViewingAsTenant = await storage.getItem('viewingAsTenant');

        if (storedToken && userStr) {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setToken(storedToken);

          // Restore viewing-as-tenant state if exists
          if (storedViewingAsTenant) {
            setViewingAsTenantId(storedViewingAsTenant);
          }

          // Verify token is still valid
          try {
            const response = await api.getCurrentUser();
            if (response.success) {
              setUser(response.data);
              await storage.setItem('user', JSON.stringify(response.data));
            }
          } catch (error) {
            // Token invalid, clear storage
            await api.logout();
            setUser(null);
            setToken(null);
            setViewingAsTenantId(null);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.success) {
        setUser(response.data.user);
        setToken(response.data.token);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await api.register(data);
      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }
      return response;
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setToken(null);
    setViewingAsTenantId(null);
    await storage.removeItem('viewingAsTenant');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    storage.setItem('user', JSON.stringify(updatedUser));
  };

  const switchTenant = async (tenantId: string | null) => {
    setViewingAsTenantId(tenantId);
    if (tenantId) {
      await storage.setItem('viewingAsTenant', tenantId);
    } else {
      await storage.removeItem('viewingAsTenant');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, viewingAsTenantId, login, register, logout, updateUser, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
