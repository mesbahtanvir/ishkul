import React, { useEffect, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeThemeListener } from '../state/themeStore';
import { useTheme } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that:
 * - Initializes system theme change listener
 * - Shows loading state while theme hydrates from storage
 * - Provides dynamic StatusBar styling
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { colors, isDark, isHydrated } = useTheme();

  // Initialize system theme listener
  useEffect(() => {
    const cleanup = initializeThemeListener();
    return cleanup;
  }, []);

  // Show loading while hydrating theme from storage
  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default ThemeProvider;
