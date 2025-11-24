# Minimal Design Guide

A guide to building ultra-clean, minimal UI screens in Ishkul.

## Philosophy

**Less is More**

- Maximum whitespace
- Minimal elements
- Clean typography
- No unnecessary decorations
- Focus on content

## LoginScreen - The Minimal Example

```
┌─────────────────────┐
│                     │
│        🎓           │  <- Logo (56px)
│                     │
│     (Whitespace)    │
│                     │
│      Ishkul         │  <- Title (42px, bold)
│   Learn anything    │  <- Subtitle (18px, regular)
│                     │
│     (Whitespace)    │
│                     │
│  [Sign in Google]   │  <- Button (56px)
│                     │
│  Terms & Privacy    │  <- Legal (12px, light)
│                     │
└─────────────────────┘
```

**Key Features:**
- ✅ Simple 3-section layout (top, middle, bottom)
- ✅ Centered everything
- ✅ Max whitespace between sections
- ✅ Only essential text
- ✅ One clear CTA button
- ✅ Clean white background
- ✅ No shadows, no gradients, no decorations

## Screen Template

Use this structure for all new minimal screens:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { Colors, Spacing } from '../theme';

interface ScreenProps {
  navigation: any;
}

export const MyScreen: React.FC<ScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Container padding="none" scrollable>
        <View style={styles.content}>
          {/* Top Section */}
          <View style={styles.topSection}>
            {/* Icon or small content */}
          </View>

          {/* Middle Section */}
          <View style={styles.middleSection}>
            {/* Main content */}
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Buttons and CTAs */}
          </View>
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  topSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
});
```

## Typography Rules

### Minimal Typography Scale

| Use | Size | Weight | Color |
|-----|------|--------|-------|
| Logo/Icon | 56px | - | - |
| Main Title | 42px | 700 | primary |
| Subtitle | 18px | 400 | secondary |
| Body Text | 16px | 400 | secondary |
| Labels | 14px | 600 | primary |
| Helper Text | 12px | 400 | tertiary |

**Rules:**
- Use only 3 font weights: 400 (regular), 600 (semibold), 700 (bold)
- Limit to 3-4 different sizes max per screen
- No more than 20px difference between sizes
- Always center-align content

## Spacing Rules

### Vertical Spacing

```
Top Icon Area:       Spacing.xl (32px)
Between Sections:    Spacing.xl (32px)
Button Padding:      Spacing.md (16px)
Text Gap:            Spacing.sm (8px)
Bottom Padding:      Spacing.lg (24px)
```

**The Rule:** Let content breathe - lots of whitespace

### Horizontal Spacing

```
Screen Padding:  Spacing.lg (24px) on both sides
Max Width:       430px (for centered content)
```

## Button Rules

- **Primary buttons only** - one CTA per screen
- **Full width buttons** - `width: 100%`
- **Minimum height:** 56px
- **No shadows** - clean look
- **Rounded corners:** 10px (subtle)

```typescript
<Button
  title="Action"
  onPress={handleAction}
  variant="primary"
/>
```

## Color Rules

- **Background:** Always white (`Colors.white`)
- **Text Primary:** Dark gray (`Colors.text.primary`)
- **Text Secondary:** Medium gray (`Colors.text.secondary`)
- **Text Tertiary:** Light gray (`Colors.text.tertiary`)
- **Primary Button:** Blue (`Colors.primary`)
- **No decorative colors** - keep it simple

## Layout Examples

### Simple Form Screen

```typescript
<View style={styles.topSection}>
  <Text style={{ fontSize: 28, fontWeight: '700' }}>Title</Text>
</View>

<View style={styles.middleSection}>
  <Input label="Field 1" placeholder="..." />
  <Input label="Field 2" placeholder="..." />
</View>

<View style={styles.bottomSection}>
  <Button title="Submit" onPress={handleSubmit} />
</View>
```

### Selection Screen

```typescript
<View style={styles.topSection}>
  <Text style={{ fontSize: 28, fontWeight: '700' }}>Choose One</Text>
</View>

<View style={styles.middleSection}>
  {items.map(item => (
    <Button
      key={item.id}
      title={item.label}
      variant={selected === item.id ? 'primary' : 'outline'}
      onPress={() => selectItem(item.id)}
    />
  ))}
</View>

<View style={styles.bottomSection}>
  <Button title="Continue" onPress={handleNext} />
</View>
```

### Progress/Display Screen

```typescript
<View style={styles.topSection}>
  <Text style={{ fontSize: 56 }}>✓</Text>
</View>

<View style={styles.middleSection}>
  <Text style={{ fontSize: 28, fontWeight: '700' }}>Great Job!</Text>
  <Text style={{ fontSize: 16, color: Colors.text.secondary }}>
    You completed the lesson
  </Text>
</View>

<View style={styles.bottomSection}>
  <Button title="Next Lesson" onPress={handleNext} />
  <Button
    title="Review"
    variant="outline"
    onPress={handleReview}
  />
</View>
```

## Don'ts ❌

- ❌ No gradients
- ❌ No shadows
- ❌ No borders (except input focus states)
- ❌ No decorative icons
- ❌ No animations
- ❌ No multiple CTAs (max 2 buttons)
- ❌ No busy layouts
- ❌ No dark backgrounds
- ❌ No rounded corners > 10px
- ❌ No complex color schemes

## Do's ✅

- ✅ Whitespace first
- ✅ Clean typography
- ✅ Single accent color
- ✅ Clear hierarchy
- ✅ One focused action per screen
- ✅ Readable contrast
- ✅ Consistent spacing
- ✅ Simple, purposeful design
- ✅ Fast loading
- ✅ Mobile-first layout

## Accessibility Checklist

- ✅ Text size >= 14px
- ✅ Touch targets >= 48px height
- ✅ Color contrast >= AA standard
- ✅ No flashing animations
- ✅ Clear focus states
- ✅ Readable line heights
- ✅ Sufficient spacing
- ✅ No color-only information

## Mobile-First Responsive

**For small screens (< 360px):**
```typescript
paddingHorizontal: Spacing.md // 16px instead of 24px
fontSize: 16 // slightly smaller
```

**For large screens (> 430px):**
```typescript
// Keep same, let safe area handle it
```

**For tablets/web:**
```typescript
// Use maxWidth: 500px, center content
// Increase padding proportionally
```

## Component Combinations

### Clean Input Form

```typescript
<Input
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  hint="We'll never share your email"
/>
<Input
  label="Password"
  placeholder="••••••"
  secureTextEntry
  value={password}
  onChangeText={setPassword}
  error={errors.password}
/>
<Button title="Sign In" onPress={handleSignIn} />
```

### Button Variations

```typescript
{/* Primary - For main actions */}
<Button title="Continue" variant="primary" />

{/* Outline - For secondary actions */}
<Button title="Cancel" variant="outline" />

{/* Text-only - For tertiary actions */}
<Button title="Skip" variant="ghost" />
```

## Testing Your Design

Ask these questions:

1. **Can a user understand in 5 seconds?**
2. **Is there unnecessary clutter?**
3. **Can they focus on one action?**
4. **Is the text readable?**
5. **Do they know what to do next?**
6. **Would removing anything hurt?**

If you answer NO to any question, simplify further.

## Quick Checklist

Before launching a screen:

- ✅ Maximum whitespace
- ✅ One primary CTA
- ✅ Clear typography hierarchy
- ✅ Consistent spacing
- ✅ Clean white background
- ✅ No decorations
- ✅ Accessible touch targets
- ✅ Readable on all devices
- ✅ Clear visual flow
- ✅ Under 3 colors max

---

**Remember:** In minimal design, empty space is not wasted space. It's breathing room.

