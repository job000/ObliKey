# Theme Integration - Remaining Screens

## Summary
The following 10 screens need ThemeContext integration. Each requires the same standard pattern.

## Standard Pattern to Apply

### 1. Import ThemeContext
```typescript
import { useTheme } from '../contexts/ThemeContext';
```

### 2. Add Hook
```typescript
const { colors } = useTheme();
```

### 3. Remove StyleSheet Colors
Remove all color definitions from `StyleSheet.create()` at the bottom of each file.

### 4. Apply Inline Theme Colors
Replace hardcoded colors with `colors.*` throughout the component.

## Color Mapping Reference

```typescript
// Backgrounds
'#F9FAFB', '#F8F9FA', '#F3F4F6' → colors.background
'#FFFFFF', '#FFF'                → colors.cardBg

// Text
'#111827', '#212529', '#000'     → colors.text
'#6B7280', '#6C757D'             → colors.textSecondary
'#9CA3AF'                        → colors.textLight
'#374151'                        → colors.textSecondary (darker variant)

// UI Elements
'#3B82F6'                        → colors.primary
'#10B981'                        → colors.success
'#DC2626', '#EF4444'             → colors.danger
'#F59E0B'                        → colors.warning
'#E5E7EB', '#D1D5DB'             → colors.border
'#8B5CF6', '#EC4899'             → colors.accent
```

## Files to Update

### 1. DoorAccessScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/DoorAccessScreen.tsx`
**Lines**: 630 total
**Key Updates**:
- Line 14: Add `import { useTheme } from '../contexts/ThemeContext';`
- Line 43: Add `const { colors } = useTheme();` after existing hooks
- Line 310: `<ActivityIndicator color={colors.primary} />`
- Remove styles (lines 392-630), apply inline colors

**Example Changes**:
```typescript
// OLD
<View style={styles.container}>
  <ActivityIndicator size="large" color="#3B82F6" />
</View>

// NEW
const { colors } = useTheme();
<View style={{ flex: 1, backgroundColor: colors.background }}>
  <ActivityIndicator size="large" color={colors.primary} />
</View>
```

### 2. FeatureManagementScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/FeatureManagementScreen.tsx`
**Lines**: 1241 total
**Key Updates**:
- Line 17: Add ThemeContext import
- Line 45: Add `const { colors } = useTheme();`
- Line 703: `<ActivityIndicator size="large" color={colors.primary} />`
- Update modal backgrounds, borders, text colors throughout

### 3. TenantManagementScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/TenantManagementScreen.tsx`
**Lines**: 924 total
**Key Updates**:
- Line 16: Add ThemeContext import
- Line 42: Add `const { colors } = useTheme();`
- Line 336: `<ActivityIndicator size="large" color={colors.primary} />`
- Update all card backgrounds, text colors, borders

### 4. ReviewManagementScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/ReviewManagementScreen.tsx`
**Lines**: 579 total
**Key Updates**:
- Line 16: Add ThemeContext import
- Line 37: Add `const { colors } = useTheme();`
- Line 178: `<ActivityIndicator size="large" color={colors.primary} />`
- Update status badges, card colors

### 5. ActivityLogsScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/ActivityLogsScreen.tsx`
**Lines**: 633 total
**Key Updates**:
- Line 16: Add ThemeContext import
- Line 60: Add `const { colors } = useTheme();`
- Line 346: `<ActivityIndicator size="large" color={colors.primary} />`
- Update filter backgrounds, input colors

### 6. AccessLogsScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/AccessLogsScreen.tsx`
**Lines**: 960 total
**Key Updates**:
- Line 16: Add ThemeContext import
- Line 44: Add `const { colors } = useTheme();`
- Line 187: `<ActivityIndicator size="large" color={colors.primary} />`
- Update modal overlays, result badges

### 7. AccountingScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/AccountingScreen.tsx`
**Lines**: 446 total
**Key Updates**:
- Line 15: Add ThemeContext import
- Line 36: Add `const { colors } = useTheme();`
- Line 97: `<ActivityIndicator size="large" color={colors.primary} />`
- Update account cards, transaction colors

### 8. EnhancedAccountingScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/EnhancedAccountingScreen.tsx`
**Lines**: 2140 total (LARGEST FILE)
**Key Updates**:
- Line 20: Add ThemeContext import
- Line 71: Add `const { colors } = useTheme();`
- Line 771: `<ActivityIndicator size="large" color={colors.primary} />`
- Update all tabs, stats cards, modal inputs

### 9. ResultatregnskapScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/ResultatregnskapScreen.tsx`
**Lines**: 618 total
**Key Updates**:
- Line 15: Add ThemeContext import
- Line 30: Add `const { colors } = useTheme();`
- Line 99: `<ActivityIndicator size="large" color={colors.primary} />`
- Update summary cards, section backgrounds

### 10. SubscriptionManagementScreen.tsx
**Location**: `/Users/johnmichaelobligar/Documents/Development/ObliKey/frontend/src/screens/SubscriptionManagementScreen.tsx`
**Lines**: 801 total
**Key Updates**:
- Line 16: Add ThemeContext import
- Line 46: Add `const { colors } = useTheme();`
- Line 278: `<ActivityIndicator size="large" color={colors.primary} />`
- Update stats cards, table rows, badges

## Implementation Steps for Each File

1. **Add Import** (after other imports):
   ```typescript
   import { useTheme } from '../contexts/ThemeContext';
   ```

2. **Add Hook** (at start of component, after other hooks):
   ```typescript
   const { colors } = useTheme();
   ```

3. **Update ActivityIndicator**:
   ```typescript
   // OLD: <ActivityIndicator size="large" color="#3B82F6" />
   // NEW:
   <ActivityIndicator size="large" color={colors.primary} />
   ```

4. **Update placeholderTextColor**:
   ```typescript
   // OLD: placeholderTextColor="#9CA3AF"
   // NEW:
   placeholderTextColor={colors.textLight}
   ```

5. **Update RefreshControl**:
   ```typescript
   // OLD: colors={['#3B82F6']}
   // NEW:
   colors={[colors.primary]}
   ```

6. **Remove StyleSheet** (at bottom of file):
   - Delete entire `const styles = StyleSheet.create({...})`
   - Replace with inline styles using `colors.*`

7. **Convert Static Styles to Inline**:
   ```typescript
   // OLD:
   <View style={styles.container}>

   // NEW:
   <View style={{ flex: 1, backgroundColor: colors.background }}>
   ```

8. **Update Dynamic Color Logic**:
   ```typescript
   // OLD:
   style={[styles.text, isActive && { color: '#3B82F6' }]}

   // NEW:
   style={[{ color: colors.text }, isActive && { color: colors.primary }]}
   ```

## Common Patterns

### Container Backgrounds
```typescript
style={{ flex: 1, backgroundColor: colors.background }}
```

### Card Backgrounds
```typescript
style={{
  backgroundColor: colors.cardBg,
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border
}}
```

### Text Styles
```typescript
// Primary text
style={{ fontSize: 16, fontWeight: '600', color: colors.text }}

// Secondary text
style={{ fontSize: 14, color: colors.textSecondary }}

// Light text
style={{ fontSize: 12, color: colors.textLight }}
```

### Input Fields
```typescript
style={{
  backgroundColor: colors.cardBg,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 8,
  padding: 12,
  color: colors.text
}}
placeholderTextColor={colors.textLight}
```

### Buttons
```typescript
// Primary button
style={{
  backgroundColor: colors.primary,
  padding: 12,
  borderRadius: 8
}}

// Success button
style={{ backgroundColor: colors.success, ... }}

// Danger button
style={{ backgroundColor: colors.danger, ... }}
```

### Status Badges
```typescript
// Success
style={{
  backgroundColor: colors.success + '20',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12
}}

// Text color
style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}
```

## Testing After Update

After updating each file:
1. Check component renders without errors
2. Toggle dark mode to verify all colors update
3. Check modals, inputs, and interactive elements
4. Verify text readability in both themes

## Notes

- All files follow similar patterns
- Most complexity is in converting StyleSheet to inline styles
- Color mappings are consistent across all files
- Some files have complex nested styles that need careful conversion
- Modal overlays use `rgba(0, 0, 0, 0.5)` - this can remain as-is
- Shadow colors `#000` can remain as-is (shadows are typically black)

## Quick Reference Table

| Old Color | Theme Property | Usage |
|-----------|---------------|-------|
| `#F9FAFB` | `colors.background` | Main container backgrounds |
| `#FFFFFF` | `colors.cardBg` | Card and modal backgrounds |
| `#111827` | `colors.text` | Primary text |
| `#6B7280` | `colors.textSecondary` | Secondary text |
| `#9CA3AF` | `colors.textLight` | Placeholder, light text |
| `#3B82F6` | `colors.primary` | Primary buttons, accents |
| `#10B981` | `colors.success` | Success states |
| `#EF4444` | `colors.danger` | Error, delete actions |
| `#F59E0B` | `colors.warning` | Warning states |
| `#E5E7EB` | `colors.border` | Borders, dividers |
| `#8B5CF6` | `colors.accent` | Accent colors |
