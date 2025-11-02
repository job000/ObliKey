import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ThemeToggle Component
 *
 * A reusable component that displays the current theme mode and allows users to cycle through
 * theme options (light -> dark -> system -> light).
 *
 * Usage:
 * ```tsx
 * import { ThemeToggle } from '../components/ThemeToggle';
 *
 * function SettingsScreen() {
 *   return (
 *     <View>
 *       <ThemeToggle />
 *     </View>
 *   );
 * }
 * ```
 */
export function ThemeToggle() {
  const { themeMode, toggleTheme, colors, isDark } = useTheme();

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '⚙️';
    }
  };

  const getThemeDescription = () => {
    switch (themeMode) {
      case 'light':
        return 'Always use light theme';
      case 'dark':
        return 'Always use dark theme';
      case 'system':
        return `Follow system (currently ${isDark ? 'dark' : 'light'})`;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <Text style={styles.icon}>{getThemeIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Appearance
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {getThemeDescription()}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.primaryLight + '20',
            borderColor: colors.primary,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.primary }]}>
          {getThemeLabel()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * ThemeModePicker Component
 *
 * A component that displays all three theme options as separate buttons,
 * allowing users to directly select their preferred theme mode.
 *
 * Usage:
 * ```tsx
 * import { ThemeModePicker } from '../components/ThemeToggle';
 *
 * function SettingsScreen() {
 *   return (
 *     <View>
 *       <ThemeModePicker />
 *     </View>
 *   );
 * }
 * ```
 */
export function ThemeModePicker() {
  const { themeMode, setThemeMode, colors } = useTheme();

  const modes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '⚙️' },
  ];

  return (
    <View style={styles.pickerContainer}>
      <Text style={[styles.pickerLabel, { color: colors.text }]}>
        Theme Mode
      </Text>
      <View style={styles.modesContainer}>
        {modes.map((mode) => {
          const isSelected = themeMode === mode.value;
          return (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.modeButton,
                {
                  backgroundColor: isSelected ? colors.primary : colors.cardBg,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setThemeMode(mode.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text
                style={[
                  styles.modeLabel,
                  { color: isSelected ? colors.cardBg : colors.text },
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ThemeToggle styles
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ThemeModePicker styles
  pickerContainer: {
    marginVertical: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
