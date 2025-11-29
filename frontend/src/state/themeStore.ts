import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeMode, ThemeColors, LightColors, DarkColors } from '../theme/colors';

interface ThemeState {
  // User's preference: 'light', 'dark', or 'system'
  themeMode: ThemeMode;
  // Actual resolved theme based on preference and system setting
  resolvedTheme: 'light' | 'dark';
  // Current colors based on resolved theme
  colors: ThemeColors;
  // Whether the store has been hydrated from AsyncStorage
  isHydrated: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setIsHydrated: (hydrated: boolean) => void;
}

/**
 * Resolves the actual theme based on user preference and system setting
 */
const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    const systemTheme = Appearance.getColorScheme();
    return systemTheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
};

/**
 * Gets colors based on resolved theme
 */
const getColors = (resolvedTheme: 'light' | 'dark'): ThemeColors => {
  return resolvedTheme === 'dark' ? DarkColors : LightColors;
};

// Get initial values
const initialMode: ThemeMode = 'system';
const initialResolved = resolveTheme(initialMode);
const initialColors = getColors(initialResolved);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: initialMode,
      resolvedTheme: initialResolved,
      colors: initialColors,
      isHydrated: false,

      setThemeMode: (mode: ThemeMode) => {
        const resolved = resolveTheme(mode);
        set({
          themeMode: mode,
          resolvedTheme: resolved,
          colors: getColors(resolved),
        });
      },

      setIsHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },
    }),
    {
      name: 'ishkul-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the themeMode, not the resolved values
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate resolved theme after hydration
          const resolved = resolveTheme(state.themeMode);
          state.resolvedTheme = resolved;
          state.colors = getColors(resolved);
          state.isHydrated = true;
        }
      },
    }
  )
);

/**
 * Subscribe to system theme changes when using 'system' mode
 */
export const initializeThemeListener = (): (() => void) => {
  const subscription = Appearance.addChangeListener(() => {
    const { themeMode, setThemeMode } = useThemeStore.getState();
    if (themeMode === 'system') {
      // Re-trigger to update resolved theme
      setThemeMode('system');
    }
  });

  return () => subscription.remove();
};

/**
 * Helper to check if dark mode is active
 */
export const isDarkMode = (): boolean => {
  return useThemeStore.getState().resolvedTheme === 'dark';
};
