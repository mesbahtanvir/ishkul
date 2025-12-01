---
description: Create a new React Native screen for Ishkul
---

# Create New Screen

Create a new React Native screen following the Ishkul project patterns.

## Requirements

1. Create the screen component in `frontend/src/screens/`
2. Use TypeScript with proper type definitions
3. Follow the existing screen patterns in the codebase
4. Use Zustand for state management if needed
5. Add navigation types to `frontend/src/types/app.ts`
6. Register the screen in `frontend/src/navigation/AppNavigator.tsx`

## Template Structure

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
// Import from design system and existing components

interface Props {
  // Navigation props
}

export const NewScreen: React.FC<Props> = ({ }) => {
  return (
    <View style={styles.container}>
      {/* Screen content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Checklist

- [ ] Screen component created
- [ ] Types defined
- [ ] Navigation registered
- [ ] Follows design system
