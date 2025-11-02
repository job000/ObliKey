/**
 * ThemeContext Usage Examples
 *
 * This file demonstrates how to use the theme system in your components.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext';

// Example 1: Basic usage with useTheme hook
export function ExampleComponent() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>
        Current theme: {isDark ? 'Dark' : 'Light'}
      </Text>
    </View>
  );
}

// Example 2: Creating themed cards
export function ThemedCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, {
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      shadowColor: colors.shadow
    }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// Example 3: Theme toggle button
export function ThemeToggleButton() {
  const { themeMode, toggleTheme, colors } = useTheme();

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      case 'system': return 'System Default';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={toggleTheme}
    >
      <Text style={[styles.buttonText, { color: colors.cardBg }]}>
        {getThemeLabel()}
      </Text>
    </TouchableOpacity>
  );
}

// Example 4: Manual theme mode selection
export function ThemeModeSelector() {
  const { themeMode, setThemeMode, colors } = useTheme();

  return (
    <View style={styles.selector}>
      {(['light', 'dark', 'system'] as const).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.modeButton,
            {
              backgroundColor: themeMode === mode ? colors.primary : colors.cardBg,
              borderColor: colors.border
            }
          ]}
          onPress={() => setThemeMode(mode)}
        >
          <Text style={{
            color: themeMode === mode ? colors.cardBg : colors.text
          }}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Example 5: Status-based colors
export function StatusIndicator({ status }: { status: 'success' | 'warning' | 'danger' }) {
  const { colors } = useTheme();

  const statusColors = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusColors[status] }]}>
      <Text style={{ color: colors.cardBg }}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// Example 6: Creating a themed StyleSheet factory
export function createThemedStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 3,
    },
    text: {
      color: colors.text,
      fontSize: 16,
    },
    textSecondary: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.cardBg,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

// Example 7: Using the StyleSheet factory in a component
export function ThemedScreen() {
  const { colors } = useTheme();
  const styles = createThemedStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.text}>Main Text</Text>
        <Text style={styles.textSecondary}>Secondary Text</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Action Button</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
});
