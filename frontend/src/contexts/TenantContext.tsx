import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tenant } from '../types';
import { useAuth } from './AuthContext';

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => Promise<void>;
  isSelectingForTenant: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const SELECTED_TENANT_KEY = '@selectedTenant';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(null);
  const { switchTenant, viewingAsTenantId } = useAuth();

  // Load selected tenant from AsyncStorage on mount
  useEffect(() => {
    const loadSelectedTenant = async () => {
      try {
        const storedTenant = await AsyncStorage.getItem(SELECTED_TENANT_KEY);
        if (storedTenant) {
          const tenantData = JSON.parse(storedTenant);
          setSelectedTenantState(tenantData);
        }
      } catch (error) {
        console.error('Error loading selected tenant:', error);
      }
    };

    loadSelectedTenant();
  }, []);

  // Sync with AuthContext when viewingAsTenantId changes externally
  useEffect(() => {
    // If AuthContext tenant ID doesn't match selected tenant, clear selected tenant
    if (viewingAsTenantId !== selectedTenant?.id) {
      if (!viewingAsTenantId) {
        setSelectedTenantState(null);
        AsyncStorage.removeItem(SELECTED_TENANT_KEY).catch(console.error);
      }
    }
  }, [viewingAsTenantId, selectedTenant?.id]);

  // Wrapper function to persist tenant selection to AsyncStorage AND sync with AuthContext
  const setSelectedTenant = async (tenant: Tenant | null) => {
    try {
      if (tenant) {
        await AsyncStorage.setItem(SELECTED_TENANT_KEY, JSON.stringify(tenant));
      } else {
        await AsyncStorage.removeItem(SELECTED_TENANT_KEY);
      }
      setSelectedTenantState(tenant);

      // CRITICAL: Sync with AuthContext to ensure X-Viewing-As-Tenant header is sent
      await switchTenant(tenant?.id || null);
    } catch (error) {
      console.error('Error saving selected tenant:', error);
      // Still update state even if storage fails
      setSelectedTenantState(tenant);
      // Try to sync with AuthContext even if storage failed
      try {
        await switchTenant(tenant?.id || null);
      } catch (err) {
        console.error('Error syncing with AuthContext:', err);
      }
    }
  };

  // Determine if we're in tenant browsing mode (i.e., a tenant is selected)
  const isSelectingForTenant = selectedTenant !== null;

  return (
    <TenantContext.Provider
      value={{
        selectedTenant,
        setSelectedTenant,
        isSelectingForTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
