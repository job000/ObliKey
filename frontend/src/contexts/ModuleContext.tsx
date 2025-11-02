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
  pt: boolean;
  workout: boolean;
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
    shop: false, // Start with false, will be fetched from API
    classes: false,
    accounting: false,
    chat: false,
    landingPage: false,
    membership: false,
    doorAccess: false,
    pt: false,
    workout: false,
  });
  const [loading, setLoading] = useState(true); // Start as loading
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
        pt: false,
        workout: false,
      });
      return;
    }

    try {
      setLoading(true);
      console.log('[Modules] Fetching module statuses for user:', user?.email);

      // Fetch all module statuses in a single call
      const response = await api.getAllModuleStatuses();
      console.log('[Modules] API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const newModules = {
          shop: response.data.shop === true,
          classes: response.data.classes === true,
          accounting: response.data.accounting === true,
          chat: response.data.chat === true,
          landingPage: response.data.landingPage === true,
          membership: response.data.membership === true,
          doorAccess: response.data.doorAccess === true,
          pt: response.data.pt === true,
          workout: response.data.workout === true,
        };
        console.log('[Modules] Loaded tenant features:', newModules);
        setModules(newModules);
      } else {
        console.log('[Modules] Invalid response from API, disabling all modules. Response:', response);
        setModules({
          shop: false,
          classes: false,
          accounting: false,
          chat: false,
          landingPage: false,
          membership: false,
          doorAccess: false,
          pt: false,
          workout: false,
        });
      }
    } catch (error: any) {
      // Check if it's a 403 error (likely deactivated tenant)
      if (error?.response?.status === 403) {
        console.log('[Modules] Tenant is deactivated or access denied, disabling all modules');
      } else {
        // On other errors, log and default to all disabled for safety
        console.error('[Modules] Failed to fetch module statuses, disabling all modules:', error);
      }

      setModules({
        shop: false,
        classes: false,
        accounting: false,
        chat: false,
        landingPage: false,
        membership: false,
        doorAccess: false,
        pt: false,
        workout: false,
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
