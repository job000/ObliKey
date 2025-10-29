/**
 * Modern Design System for ObliKey
 * Inspired by top fitness apps like Nike Training Club, Strava, and Peloton
 */

export const theme = {
  // Modern Color Palette
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },

    // Accent Colors
    accent: {
      purple: '#8B5CF6',
      pink: '#EC4899',
      orange: '#F97316',
      teal: '#14B8A6',
    },

    // Semantic Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Neutral Grays
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },

    // Background Colors
    background: {
      primary: '#FFFFFF',
      secondary: '#F9FAFB',
      tertiary: '#F3F4F6',
      dark: '#111827',
    },

    // Text Colors
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },

    // Gradients
    gradients: {
      primary: ['#3B82F6', '#2563EB'],
      success: ['#10B981', '#059669'],
      purple: ['#8B5CF6', '#7C3AED'],
      sunset: ['#F97316', '#EC4899'],
      ocean: ['#3B82F6', '#14B8A6'],
    },
  },

  // Typography
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // Border Radius
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // Component Styles
  components: {
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      ...{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    },
    button: {
      primary: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
      },
      secondary: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
      },
    },
    input: {
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
    },
  },
};

export type Theme = typeof theme;
