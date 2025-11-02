import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Appearance API
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should provide default theme values', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('system');
      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.colors).toBeDefined();
    });
  });

  it('should load saved theme from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  it('should toggle theme mode', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.themeMode).toBe('system');
    });

    // Toggle: system -> light
    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('light');
    });

    // Toggle: light -> dark
    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
    });

    // Toggle: dark -> system
    await act(async () => {
      result.current.toggleTheme();
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('system');
    });
  });

  it('should set specific theme mode', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('themeMode', 'dark');
    });
  });

  it('should provide different colors for light and dark themes', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Get light theme colors
    const lightColors = result.current.colors;
    expect(lightColors.background).toBe('#F8F9FA');
    expect(lightColors.text).toBe('#212529');

    // Switch to dark
    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    await waitFor(() => {
      const darkColors = result.current.colors;
      expect(darkColors.background).toBe('#111827');
      expect(darkColors.text).toBe('#F9FAFB');
      expect(darkColors).not.toEqual(lightColors);
    });
  });

  it('should throw error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('should provide all required color properties', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      const { colors } = result.current;

      // Primary colors
      expect(colors.primary).toBeDefined();
      expect(colors.primaryLight).toBeDefined();
      expect(colors.primaryDark).toBeDefined();

      // Status colors
      expect(colors.success).toBeDefined();
      expect(colors.successLight).toBeDefined();
      expect(colors.danger).toBeDefined();
      expect(colors.warning).toBeDefined();

      // Accent colors
      expect(colors.accent).toBeDefined();
      expect(colors.accentLight).toBeDefined();

      // Surface colors
      expect(colors.background).toBeDefined();
      expect(colors.cardBg).toBeDefined();

      // Text colors
      expect(colors.text).toBeDefined();
      expect(colors.textSecondary).toBeDefined();
      expect(colors.textLight).toBeDefined();

      // Border colors
      expect(colors.border).toBeDefined();
      expect(colors.borderLight).toBeDefined();

      // Effects
      expect(colors.shadow).toBeDefined();
    });
  });
});
