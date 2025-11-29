import { useThemeStore } from '../state/themeStore';
import { ThemeColors, ThemeMode } from '../theme/colors';

interface UseThemeReturn {
  /** Current color palette based on active theme */
  colors: ThemeColors;
  /** User's theme preference: 'light', 'dark', or 'system' */
  themeMode: ThemeMode;
  /** Actual resolved theme: 'light' or 'dark' */
  resolvedTheme: 'light' | 'dark';
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Whether the theme has been loaded from storage */
  isHydrated: boolean;
  /** Set the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
}

/**
 * Hook to access theme colors and controls
 *
 * @example
 * ```tsx
 * const { colors, isDark, toggleTheme } = useTheme();
 *
 * return (
 *   <View style={{ backgroundColor: colors.background.primary }}>
 *     <Text style={{ color: colors.text.primary }}>
 *       {isDark ? 'Dark Mode' : 'Light Mode'}
 *     </Text>
 *     <Button onPress={toggleTheme} title="Toggle" />
 *   </View>
 * );
 * ```
 */
export const useTheme = (): UseThemeReturn => {
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isHydrated = useThemeStore((state) => state.isHydrated);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    // Toggle between light and dark directly (not system)
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return {
    colors,
    themeMode,
    resolvedTheme,
    isDark,
    isHydrated,
    setThemeMode,
    toggleTheme,
  };
};

export default useTheme;
