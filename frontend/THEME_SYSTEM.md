# Theme System Documentation

## Overview

The ObliKey app now includes a complete theme system that supports light mode, dark mode, and automatic system theme detection. The theme persists across app restarts and automatically updates when the device's appearance changes.

## Files

### Core Files
- **`/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/ThemeContext.tsx`** - Main theme context implementation
- **`/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/App.tsx`** - App integration with ThemeProvider
- **`/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/ThemeContext.example.tsx`** - Usage examples

## Features

### 1. Three Theme Modes
- **Light Mode** - Bright, clean interface with light backgrounds
- **Dark Mode** - Dark backgrounds optimized for low-light environments
- **System Mode** - Automatically follows device appearance settings

### 2. Persistent Storage
Theme preference is saved to AsyncStorage and restored on app launch.

### 3. Automatic System Detection
When in "system" mode, the app automatically updates when the device switches between light and dark mode.

### 4. Cross-Platform Support
Works on iOS, Android, and web platforms with appropriate storage backends.

## Theme Colors

### Light Theme Colors
```typescript
{
  primary: '#3B82F6',        // Blue primary color
  primaryLight: '#60A5FA',   // Lighter blue
  primaryDark: '#2563EB',    // Darker blue

  success: '#10B981',        // Green for success states
  successLight: '#34D399',   // Lighter green
  danger: '#DC2626',         // Red for errors/warnings
  warning: '#F59E0B',        // Orange for warnings

  accent: '#8B5CF6',         // Purple accent
  accentLight: '#A78BFA',    // Lighter purple

  background: '#F8F9FA',     // Main background
  cardBg: '#FFFFFF',         // Card/surface background
  text: '#212529',           // Primary text
  textSecondary: '#6C757D',  // Secondary text
  textLight: '#9CA3AF',      // Tertiary text

  border: '#E5E7EB',         // Border color
  borderLight: '#F3F4F6',    // Lighter border
  shadow: 'rgba(0, 0, 0, 0.05)', // Shadow color
}
```

### Dark Theme Colors
```typescript
{
  primary: '#60A5FA',        // Brighter blue for dark mode
  primaryLight: '#93C5FD',   // Even lighter blue
  primaryDark: '#3B82F6',    // Standard blue

  success: '#34D399',        // Brighter green
  successLight: '#6EE7B7',   // Even lighter green
  danger: '#F87171',         // Softer red
  warning: '#FBBF24',        // Softer orange

  accent: '#A78BFA',         // Brighter purple
  accentLight: '#C4B5FD',    // Even lighter purple

  background: '#111827',     // Dark background
  cardBg: '#1F2937',         // Card/surface background
  text: '#F9FAFB',           // Light text
  textSecondary: '#D1D5DB',  // Secondary text
  textLight: '#9CA3AF',      // Tertiary text

  border: '#374151',         // Border color
  borderLight: '#4B5563',    // Lighter border
  shadow: 'rgba(0, 0, 0, 0.3)', // Darker shadow
}
```

## Usage

### Basic Usage

```typescript
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>
        Current mode: {isDark ? 'Dark' : 'Light'}
      </Text>
    </View>
  );
}
```

### Toggle Theme

```typescript
function ThemeToggle() {
  const { toggleTheme, themeMode } = useTheme();

  return (
    <TouchableOpacity onPress={toggleTheme}>
      <Text>Current: {themeMode}</Text>
    </TouchableOpacity>
  );
}
```

### Set Specific Theme Mode

```typescript
function ThemeSelector() {
  const { setThemeMode } = useTheme();

  return (
    <View>
      <Button title="Light" onPress={() => setThemeMode('light')} />
      <Button title="Dark" onPress={() => setThemeMode('dark')} />
      <Button title="System" onPress={() => setThemeMode('system')} />
    </View>
  );
}
```

### Using Theme Colors

```typescript
function StyledComponent() {
  const { colors } = useTheme();

  return (
    <View style={{
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadow,
    }}>
      <Text style={{ color: colors.text }}>Title</Text>
      <Text style={{ color: colors.textSecondary }}>Subtitle</Text>
    </View>
  );
}
```

### Status Colors

```typescript
function StatusBadge({ type }: { type: 'success' | 'warning' | 'danger' }) {
  const { colors } = useTheme();

  const statusColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[type];

  return (
    <View style={{ backgroundColor: statusColor, padding: 8 }}>
      <Text style={{ color: colors.cardBg }}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
}
```

## API Reference

### `useTheme()` Hook

Returns an object with the following properties:

- **`themeMode`**: `'light' | 'dark' | 'system'` - Current theme mode setting
- **`theme`**: `'light' | 'dark'` - Actual resolved theme (accounts for system preference)
- **`colors`**: `ThemeColors` - Current theme color palette
- **`isDark`**: `boolean` - True if current theme is dark
- **`toggleTheme`**: `() => void` - Cycles through light → dark → system
- **`setThemeMode`**: `(mode: ThemeMode) => Promise<void>` - Set specific theme mode

### `ThemeColors` Interface

```typescript
interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Status colors
  success: string;
  successLight: string;
  danger: string;
  warning: string;

  // Accent colors
  accent: string;
  accentLight: string;

  // Surface colors
  background: string;
  cardBg: string;

  // Text colors
  text: string;
  textSecondary: string;
  textLight: string;

  // Border colors
  border: string;
  borderLight: string;

  // Effects
  shadow: string;
}
```

## Integration

The theme system is already integrated into the app via the `ThemeProvider` in `App.tsx`:

```typescript
<SafeAreaProvider>
  <ThemeProvider>
    <AuthProvider>
      {/* ... other providers ... */}
    </AuthProvider>
  </ThemeProvider>
</SafeAreaProvider>
```

The `ThemeProvider` wraps all other providers to ensure theme context is available throughout the app.

## Best Practices

1. **Always use theme colors** - Don't hardcode colors; use `colors` from `useTheme()`
2. **Consider contrast** - Ensure text is readable on backgrounds in both themes
3. **Test both themes** - Always test your UI in both light and dark modes
4. **Use semantic colors** - Use `success`, `warning`, `danger` for consistent status indicators
5. **Respect system preferences** - Default to 'system' mode when possible

## Migration Guide

To migrate existing components to use the theme system:

1. Import the `useTheme` hook:
   ```typescript
   import { useTheme } from '../contexts/ThemeContext';
   ```

2. Get colors in your component:
   ```typescript
   const { colors } = useTheme();
   ```

3. Replace hardcoded colors with theme colors:
   ```typescript
   // Before
   backgroundColor: '#FFFFFF'
   color: '#000000'

   // After
   backgroundColor: colors.cardBg
   color: colors.text
   ```

4. Update StyleSheets to use dynamic colors:
   ```typescript
   // Before
   const styles = StyleSheet.create({
     container: {
       backgroundColor: '#FFFFFF',
     }
   });

   // After
   function MyComponent() {
     const { colors } = useTheme();
     const styles = StyleSheet.create({
       container: {
         backgroundColor: colors.cardBg,
       }
     });

     return <View style={styles.container} />;
   }
   ```

## Examples

See `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/ThemeContext.example.tsx` for complete working examples including:
- Basic usage
- Themed cards
- Theme toggle buttons
- Mode selectors
- Status indicators
- StyleSheet factories
