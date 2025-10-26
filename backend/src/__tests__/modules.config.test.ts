import {
  ModuleKey,
  MODULE_DEFINITIONS,
  getModulesForRole,
  isModuleVisible,
  getModuleConfig,
} from '../config/modules.config';

describe('Module Configuration System', () => {
  describe('MODULE_DEFINITIONS', () => {
    it('should have all required modules defined', () => {
      expect(MODULE_DEFINITIONS[ModuleKey.DASHBOARD]).toBeDefined();
      expect(MODULE_DEFINITIONS[ModuleKey.CLASSES]).toBeDefined();
      expect(MODULE_DEFINITIONS[ModuleKey.PT_SESSIONS]).toBeDefined();
      expect(MODULE_DEFINITIONS[ModuleKey.SHOP]).toBeDefined();
      expect(MODULE_DEFINITIONS[ModuleKey.ADMIN]).toBeDefined();
    });

    it('should have correct default enabled values for core modules', () => {
      expect(MODULE_DEFINITIONS[ModuleKey.DASHBOARD].defaultEnabled).toBe(true);
      expect(MODULE_DEFINITIONS[ModuleKey.ADMIN].defaultEnabled).toBe(true);
    });

    it('should have dependencies defined correctly', () => {
      const trainingPrograms = MODULE_DEFINITIONS[ModuleKey.TRAINING_PROGRAMS];
      expect(trainingPrograms.dependencies).toContain(ModuleKey.PT_SESSIONS);

      const bookings = MODULE_DEFINITIONS[ModuleKey.BOOKINGS];
      expect(bookings.dependencies).toContain(ModuleKey.CLASSES);
    });
  });

  describe('getModulesForRole', () => {
    it('should return correct modules for CUSTOMER role', () => {
      const modules = getModulesForRole('CUSTOMER');
      const moduleKeys = modules.map(m => m.key);

      expect(moduleKeys).toContain(ModuleKey.DASHBOARD);
      expect(moduleKeys).toContain(ModuleKey.CLASSES);
      expect(moduleKeys).toContain(ModuleKey.PT_SESSIONS);
      expect(moduleKeys).toContain(ModuleKey.SHOP);
      expect(moduleKeys).not.toContain(ModuleKey.ACCOUNTING);
    });

    it('should return correct modules for ADMIN role', () => {
      const modules = getModulesForRole('ADMIN');
      const moduleKeys = modules.map(m => m.key);

      expect(moduleKeys).toContain(ModuleKey.ADMIN);
      expect(moduleKeys).toContain(ModuleKey.ACCOUNTING);
      expect(moduleKeys).toContain(ModuleKey.LANDING_PAGE);
    });

    it('should return correct modules for TRAINER role', () => {
      const modules = getModulesForRole('TRAINER');
      const moduleKeys = modules.map(m => m.key);

      expect(moduleKeys).toContain(ModuleKey.DASHBOARD);
      expect(moduleKeys).toContain(ModuleKey.PT_SESSIONS);
      expect(moduleKeys).toContain(ModuleKey.TRAINING_PROGRAMS);
      expect(moduleKeys).not.toContain(ModuleKey.BOOKINGS);
    });
  });

  describe('isModuleVisible', () => {
    it('should hide module if not enabled', () => {
      const enabledModules = new Set([ModuleKey.DASHBOARD]);
      const visible = isModuleVisible(
        ModuleKey.CLASSES,
        enabledModules,
        'CUSTOMER'
      );
      expect(visible).toBe(false);
    });

    it('should hide module if user lacks role', () => {
      const enabledModules = new Set([ModuleKey.ADMIN]);
      const visible = isModuleVisible(
        ModuleKey.ADMIN,
        enabledModules,
        'CUSTOMER'
      );
      expect(visible).toBe(false);
    });

    it('should hide module if dependencies not met', () => {
      const enabledModules = new Set([ModuleKey.TRAINING_PROGRAMS]);
      const visible = isModuleVisible(
        ModuleKey.TRAINING_PROGRAMS,
        enabledModules,
        'CUSTOMER'
      );
      expect(visible).toBe(false); // PT_SESSIONS dependency not met
    });

    it('should show module if all conditions met', () => {
      const enabledModules = new Set([
        ModuleKey.PT_SESSIONS,
        ModuleKey.TRAINING_PROGRAMS,
      ]);
      const visible = isModuleVisible(
        ModuleKey.TRAINING_PROGRAMS,
        enabledModules,
        'CUSTOMER'
      );
      expect(visible).toBe(true);
    });
  });

  describe('getModuleConfig', () => {
    it('should enable core modules by default', () => {
      const config = getModuleConfig({});
      expect(config.has(ModuleKey.DASHBOARD)).toBe(true);
      expect(config.has(ModuleKey.ADMIN)).toBe(true);
    });

    it('should enable classes when classesEnabled is true', () => {
      const config = getModuleConfig({ classesEnabled: true });
      expect(config.has(ModuleKey.CLASSES)).toBe(true);
      expect(config.has(ModuleKey.BOOKINGS)).toBe(true);
    });

    it('should enable chat when chatEnabled is true', () => {
      const config = getModuleConfig({ chatEnabled: true });
      expect(config.has(ModuleKey.CHAT)).toBe(true);
    });

    it('should enable accounting when accountingEnabled is true', () => {
      const config = getModuleConfig({ accountingEnabled: true });
      expect(config.has(ModuleKey.ACCOUNTING)).toBe(true);
    });

    it('should handle all modules enabled', () => {
      const config = getModuleConfig({
        classesEnabled: true,
        chatEnabled: true,
        accountingEnabled: true,
        landingPageEnabled: true,
      });

      expect(config.has(ModuleKey.CLASSES)).toBe(true);
      expect(config.has(ModuleKey.CHAT)).toBe(true);
      expect(config.has(ModuleKey.ACCOUNTING)).toBe(true);
      expect(config.has(ModuleKey.LANDING_PAGE)).toBe(true);
    });
  });
});
