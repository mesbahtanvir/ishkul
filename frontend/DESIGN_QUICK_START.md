# Design System Quick Start

Ultra-minimal design reference for building clean, simple screens.

## Import Theme

```typescript
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
```

## Colors

```typescript
// Primary
Colors.primary          // #0066FF
Colors.primaryLight     // #E6F0FF
Colors.primaryDark      // #0052CC

// Semantic
Colors.success          // #10B981
Colors.warning          // #F59E0B
Colors.danger           // #EF4444
Colors.info             // #3B82F6

// Text
Colors.text.primary     // #111827
Colors.text.secondary   // #6B7280
Colors.text.tertiary    // #9CA3AF

// Background
Colors.background.primary    // #FFFFFF
Colors.background.secondary  // #F9FAFB
Colors.background.tertiary   // #F3F4F6
```

## Typography

```typescript
// Use spread operator
const styles = StyleSheet.create({
  heading: {
    ...Typography.heading.h1,
  },
  body: {
    ...Typography.body.medium,
  },
  label: {
    ...Typography.label.large,
  },
});
```

Available:
- `Typography.heading.h1` to `h4`
- `Typography.body.large`, `.medium`, `.small`
- `Typography.label.large`, `.medium`, `.small`
- `Typography.button.large`, `.medium`, `.small`
- `Typography.display.large`, `.medium`, `.small`

## Spacing

```typescript
// All values in pixels
Spacing.xs   // 4px
Spacing.sm   // 8px
Spacing.md   // 16px
Spacing.lg   // 24px
Spacing.xl   // 32px
Spacing.xxl  // 48px
Spacing.xxxl // 64px

// Use in styles
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
});

// Button heights
Spacing.buttonHeight.small   // 40px
Spacing.buttonHeight.medium  // 48px
Spacing.buttonHeight.large   // 56px
```

## Common Components

### Button

```typescript
<Button
  title="Click me"
  onPress={handlePress}
  variant="primary"  // or secondary, outline, ghost
  size="medium"      // or small, large
  loading={false}
  disabled={false}
/>
```

### Input

```typescript
<Input
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  hint="We'll never share your email"
/>
```

### Container

```typescript
<Container
  padding="medium"  // or none, small, large
  scrollable={true}
>
  {/* Your content */}
</Container>
```

## Common Patterns

### Full Screen Form

```typescript
<Container padding="medium" scrollable>
  <View style={{ flex: 1, justifyContent: 'space-between' }}>
    <View>
      <Text style={{ ...Typography.heading.h2 }}>Title</Text>
      <Input label="Field" />
    </View>
    <Button title="Continue" onPress={handleNext} />
  </View>
</Container>
```

### Card

```typescript
<View
  style={{
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  }}
>
  <Text style={{ ...Typography.heading.h3 }}>Card Title</Text>
</View>
```

### Section

```typescript
<View>
  <Text style={{
    ...Typography.heading.h3,
    marginBottom: Spacing.md,
  }}>
    Section Title
  </Text>
  {/* Section content */}
</View>
```

## Colors by Intent

### For Actions
- Primary button: `Colors.primary`
- Secondary button: `Colors.gray100`
- Text: `Colors.text.primary`

### For Messages
- Success: `Colors.success`
- Warning: `Colors.warning`
- Error: `Colors.danger`
- Info: `Colors.info`

### For Emphasis
- Heading: `Colors.text.primary` with `Typography.heading`
- Secondary: `Colors.text.secondary` with lighter typography
- Disabled/Muted: `Colors.text.tertiary`

## Responsive Sizes

```typescript
import { useWindowDimensions } from 'react-native';

export function MyComponent() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;

  return (
    <View
      style={{
        padding: isSmallScreen ? Spacing.md : Spacing.lg,
      }}
    >
      {/* Content */}
    </View>
  );
}
```

## Don'ts ❌

- ❌ Don't hardcode colors: `backgroundColor: '#000000'`
- ❌ Don't hardcode sizes: `padding: 20`
- ❌ Don't use arbitrary fonts: Define in Typography
- ❌ Don't mix old and new: Use theme consistently
- ❌ Don't forget safeareas: Use Container component

## Do's ✅

- ✅ Use Colors theme: `backgroundColor: Colors.primary`
- ✅ Use Spacing scale: `padding: Spacing.md`
- ✅ Spread typography: `...Typography.heading.h2`
- ✅ Use Container: Handles SafeArea automatically
- ✅ Test on multiple screen sizes

## Need More?

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for complete documentation.

---

**Quick Tip**: Copy-paste a component from the existing screens as a template!
