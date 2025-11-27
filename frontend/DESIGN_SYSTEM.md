# Ishkul Design System

A modern, minimalist, mobile-first design system for the Ishkul adaptive learning platform.

## Overview

The design system is built on principles of simplicity, clarity, and user-focused
design. It's optimized for mobile devices first, then scales to tablets and web.

**Key Features:**
- Minimalist aesthetic
- Clean typography
- Consistent spacing
- Accessible colors
- Flexible component library
- Dark/Light mode ready

## Color Palette

### Primary Colors

```
Primary Blue: #0066FF
  - Light: #E6F0FF
  - Dark: #0052CC
```

Use the primary blue for:
- Call-to-action buttons
- Links
- Active states
- Key brand elements

### Semantic Colors

| Color | Usage | Hex |
|-------|-------|-----|
| Success | Positive actions, confirmations | #10B981 |
| Warning | Warnings, alerts | #F59E0B |
| Danger | Errors, destructive actions | #EF4444 |
| Info | Information messages | #3B82F6 |

### Neutral Colors

- **White**: #FFFFFF
- **Black**: #000000
- **Gray50-900**: Full spectrum from light to dark

**Text Colors:**
- Primary: #111827 (gray-900)
- Secondary: #6B7280 (gray-500)
- Tertiary: #9CA3AF (gray-400)

**Background Colors:**
- Primary: #FFFFFF
- Secondary: #F9FAFB (gray-50)
- Tertiary: #F3F4F6 (gray-100)

### Implementation

Import colors in any component:

```typescript
import { Colors } from '../theme/colors';

// Usage
backgroundColor: Colors.primary
color: Colors.text.secondary
```

## Typography

All typography is defined in `src/theme/typography.ts`.

### Display Sizes (Hero Content)

```
Display Large:  32px, Bold, -0.5px letter-spacing
Display Medium: 28px, Bold, -0.3px letter-spacing
Display Small:  24px, Bold, 0px letter-spacing
```

### Headings

```
H1: 28px, Bold
H2: 24px, Bold
H3: 20px, Bold
H4: 18px, Semibold
```

### Body Text

```
Body Large:  18px, Regular
Body Medium: 16px, Regular
Body Small:  14px, Regular
```

### Usage

```typescript
import { Typography } from '../theme/typography';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  heading: {
    ...Typography.heading.h1,
    color: Colors.text.primary,
  },
  body: {
    ...Typography.body.medium,
  },
});
```

## Spacing Scale

Based on 4px base unit:

```
xs:   4px
sm:   8px
md:  16px
lg:  24px
xl:  32px
xxl: 48px
xxxl: 64px
```

**Common Combinations:**
- Padding: xs-xl
- Margin: xs-xl
- Gap: xs-xl
- Screen padding: 16px (medium)
- Button height: 40px (small), 48px (medium), 56px (large)

### Usage

```typescript
import { Spacing } from '../theme/spacing';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
});
```

## Components

### Button

A flexible button component with multiple variants and sizes.

**Props:**
- `title` (required): Button text
- `onPress` (required): Press handler
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' (default: 'primary')
- `size`: 'small' | 'medium' | 'large' (default: 'medium')
- `loading`: boolean
- `disabled`: boolean

**Usage:**

```typescript
import { Button } from '../components/Button';

<Button
  title="Get Started"
  onPress={handleStart}
  variant="primary"
  size="large"
/>

<Button
  title="Cancel"
  onPress={handleCancel}
  variant="ghost"
/>
```

### Input

A text input with label, error, and hint support.

**Props:**
- `label`: Optional label text
- `error`: Optional error message
- `hint`: Optional hint text
- `placeholder`: Placeholder text
- All standard TextInputProps

**Usage:**

```typescript
import { Input } from '../components/Input';

<Input
  label="Learning Goal"
  placeholder="e.g., Learn Python"
  value={goal}
  onChangeText={setGoal}
  hint="Be specific for better recommendations"
/>

<Input
  label="Username"
  placeholder="Enter username"
  error={errors.username}
/>
```

### Container

A flexible container that wraps content in SafeAreaView.

**Props:**
- `scrollable`: boolean (enable scrolling)
- `padding`: 'none' | 'small' | 'medium' | 'large'
- Standard View props

**Usage:**

```typescript
import { Container } from '../components/Container';

<Container padding="medium" scrollable>
  {/* Content */}
</Container>

<Container padding="large">
  {/* Fixed content */}
</Container>
```

## Layout Patterns

### Full-Screen Form

```typescript
<Container padding="medium" scrollable>
  <View style={{ flex: 1, justifyContent: 'space-between' }}>
    {/* Content */}
    <View>{/* Top content */}</View>
    <Button title="Continue" onPress={handleNext} />
  </View>
</Container>
```

### Card Layout

```typescript
<View style={{
  backgroundColor: Colors.background.tertiary,
  borderRadius: 12,
  padding: Spacing.lg,
  marginBottom: Spacing.md,
}}>
  {/* Card content */}
</View>
```

### Section Headers

```typescript
<Text style={{
  ...Typography.heading.h3,
  color: Colors.text.primary,
  marginBottom: Spacing.md,
}}>
  Section Title
</Text>
```

## Best Practices

### Do's

✅ Use the spacing scale consistently
✅ Use semantic color names (success, danger) for intent
✅ Import and use Typography spread operators
✅ Keep components simple and focused
✅ Use the theme for all styling values
✅ Test on small (320px) and large (430px+) screens

### Don'ts

❌ Don't hardcode colors or sizes
❌ Don't use arbitrary padding values
❌ Don't mix old and new design patterns
❌ Don't ignore safe area on mobile
❌ Don't create components without considering accessibility
❌ Don't use font sizes below 14px for body text

## Creating New Components

1. Import theme utilities:

```typescript
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
```

2. Define styles using theme values:

```typescript
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  title: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
});
```

3. Keep components composable and flexible

## Responsive Design

### Mobile-First Breakpoints

| Screen Size | Use Case |
|-------------|----------|
| 320-390px | Small phones |
| 390-430px | Standard phones |
| 430-768px | Large phones |
| 768px+ | Tablets & web |

Use `Dimensions` API for responsive layouts:

```typescript
import { Dimensions, useWindowDimensions } from 'react-native';

const { width } = useWindowDimensions();
const isSmallScreen = width < 360;
```

## Accessibility

- **Color**: Don't rely solely on color to convey information
- **Touch Targets**: Minimum 48px height for buttons
- **Text**: Maintain sufficient contrast (WCAG AA standard)
- **Labels**: All inputs should have visible labels
- **Spacing**: Adequate spacing between interactive elements

## Dark Mode Support

The design system is ready for dark mode implementation. Use semantic color names:

```typescript
// Instead of hardcoding
backgroundColor: '#000000'

// Use
backgroundColor: Colors.background.primary // Adapts to theme
```

## Resources

- **Colors**: `src/theme/colors.ts`
- **Typography**: `src/theme/typography.ts`
- **Spacing**: `src/theme/spacing.ts`
- **Components**: `src/components/`
- **Theme Index**: `src/theme/index.ts`

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
