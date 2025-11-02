# Theme System Quick Start

## Import and Use

```typescript
import { useTheme } from './src/contexts/ThemeContext';

function MyComponent() {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  );
}
```

## Available Colors

### Surface Colors
- `colors.background` - Main app background
- `colors.cardBg` - Cards, modals, surfaces

### Text Colors
- `colors.text` - Primary text
- `colors.textSecondary` - Secondary text
- `colors.textLight` - Tertiary/light text

### Brand Colors
- `colors.primary` - Primary brand color
- `colors.primaryLight` - Lighter primary
- `colors.primaryDark` - Darker primary

### Status Colors
- `colors.success` - Success/positive states
- `colors.danger` - Error/negative states
- `colors.warning` - Warning states

### Accent Colors
- `colors.accent` - Accent/highlight color
- `colors.accentLight` - Lighter accent

### Border Colors
- `colors.border` - Standard borders
- `colors.borderLight` - Subtle borders

### Effects
- `colors.shadow` - Shadow color (use with shadowColor)

## Common Patterns

### Themed Card
```typescript
<View style={{
  backgroundColor: colors.cardBg,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 16,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 4,
  elevation: 3,
}}>
  {/* content */}
</View>
```

### Primary Button
```typescript
<TouchableOpacity style={{
  backgroundColor: colors.primary,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 8,
}}>
  <Text style={{ color: colors.cardBg, fontWeight: '600' }}>
    Button Text
  </Text>
</TouchableOpacity>
```

### Success Badge
```typescript
<View style={{
  backgroundColor: colors.success,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
}}>
  <Text style={{ color: colors.cardBg, fontSize: 12, fontWeight: '600' }}>
    SUCCESS
  </Text>
</View>
```

### Theme Toggle (Ready to Use)
```typescript
import { ThemeToggle } from './src/components/ThemeToggle';

function SettingsScreen() {
  return (
    <View>
      <ThemeToggle />
    </View>
  );
}
```

### Theme Mode Picker (Ready to Use)
```typescript
import { ThemeModePicker } from './src/components/ThemeToggle';

function SettingsScreen() {
  return (
    <View>
      <ThemeModePicker />
    </View>
  );
}
```

## useTheme() Returns

```typescript
{
  themeMode: 'light' | 'dark' | 'system',  // Current setting
  theme: 'light' | 'dark',                  // Actual theme (resolved)
  colors: ThemeColors,                      // Color palette
  isDark: boolean,                          // true if dark mode
  toggleTheme: () => void,                  // Cycle themes
  setThemeMode: (mode) => Promise<void>     // Set specific mode
}
```

## Files Created

- **Core**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/ThemeContext.tsx`
- **Components**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/components/ThemeToggle.tsx`
- **Tests**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/__tests__/ThemeContext.test.tsx`
- **Examples**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/contexts/ThemeContext.example.tsx`
- **Docs**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/THEME_SYSTEM.md`

## Tips

1. Always use `colors` from `useTheme()` - never hardcode colors
2. Test your UI in both light and dark modes
3. Use semantic color names (success, danger, warning) for consistency
4. The theme persists across app restarts automatically
5. System mode automatically follows device appearance changes
