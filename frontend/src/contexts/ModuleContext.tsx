import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useTenant } from './TenantContext';

interface ModuleStatus {
  shop: boolean;
  classes: boolean;
  accounting: boolean;
  chat: boolean;
  landingPage: boolean;
  membership: boolean;
  doorAccess: boolean;
}

interface ModuleContextType {
  modules: ModuleStatus;
  loading: boolean;
  refreshModules: () => Promise<void>;
  isModuleEnabled: (moduleName: keyof ModuleStatus) => boolean;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within ModuleProvider');
  }
  return context;
};

interface ModuleProviderProps {
  children: ReactNode;
}

export const ModuleProvider: React.FC<ModuleProviderProps> = ({ children }) => {
  const [modules, setModules] = useState<ModuleStatus>({
    shop: true, // Default to true for backwards compatibility
    classes: true,
    accounting: true,
    chat: true,
    landingPage: true,
    membership: true,
    doorAccess: true, // Enabled for testing
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { selectedTenant } = useTenant();

  const fetchModuleStatuses = async () => {
    if (!user) {
      // Reset to disabled when no user
      setModules({
        shop: false,
        classes: false,
        accounting: false,
        chat: false,
        landingPage: false,
        membership: false,
        doorAccess: false,
      });
      return;
    }

    try {
      setLoading(true);

      // Fetch all module statuses in a single call
      const response = await api.getAllModuleStatuses();

      if (response.success && response.data) {
        setModules({
          shop: response.data.shop === true,
          classes: response.data.classes === true,
          accounting: response.data.accounting === true,
          chat: response.data.chat === true,
          landingPage: response.data.landingPage === true,
          membership: response.data.membership === true,
          doorAccess: response.data.doorAccess === true,
        });
      }
    } catch (error) {
      // On error, default to all disabled for safety
      console.log('[Modules] Failed to fetch module statuses, disabling all modules:', error);
      setModules({
        shop: false,
        classes: false,
        accounting: false,
        chat: false,
        landingPage: false,
        membership: false,
        doorAccess: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshModules = async () => {
    await fetchModuleStatuses();
  };

  const isModuleEnabled = (moduleName: keyof ModuleStatus): boolean => {
    return modules[moduleName];
  };

  useEffect(() => {
    fetchModuleStatuses();
  }, [user, selectedTenant]); // Reload modules when user changes OR when SUPER_ADMIN selects a different tenant

  const value: ModuleContextType = {
    modules,
    loading,
    refreshModules,
    isModuleEnabled,
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};
