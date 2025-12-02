import { useThemeStore, isDarkMode } from '../themeStore';
import { LightColors, DarkColors } from '../../theme/colors';
import { act } from '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock React Native Appearance
jest.mock('react-native', () => ({
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useThemeStore.setState({
        themeMode: 'system',
        resolvedTheme: 'light',
        colors: LightColors,
        _hasHydrated: 0,
      });
    });
  });

  describe('initial state', () => {
    it('should have system as default theme mode', () => {
      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('system');
    });

    it('should have light as resolved theme by default', () => {
      const state = useThemeStore.getState();
      expect(state.resolvedTheme).toBe('light');
    });

    it('should have light colors by default', () => {
      const state = useThemeStore.getState();
      expect(state.colors).toEqual(LightColors);
    });
  });

  describe('setThemeMode', () => {
    it('should set light mode', () => {
      act(() => {
        useThemeStore.getState().setThemeMode('light');
      });

      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('light');
      expect(state.resolvedTheme).toBe('light');
      expect(state.colors).toEqual(LightColors);
    });

    it('should set dark mode', () => {
      act(() => {
        useThemeStore.getState().setThemeMode('dark');
      });

      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('dark');
      expect(state.resolvedTheme).toBe('dark');
      expect(state.colors).toEqual(DarkColors);
    });

    it('should set system mode', () => {
      // First set to dark
      act(() => {
        useThemeStore.getState().setThemeMode('dark');
      });

      // Then set to system (mocked to return light)
      act(() => {
        useThemeStore.getState().setThemeMode('system');
      });

      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('system');
      expect(state.resolvedTheme).toBe('light'); // Based on mocked Appearance
    });
  });

  describe('isDarkMode', () => {
    it('should return false when in light mode', () => {
      act(() => {
        useThemeStore.getState().setThemeMode('light');
      });

      expect(isDarkMode()).toBe(false);
    });

    it('should return true when in dark mode', () => {
      act(() => {
        useThemeStore.getState().setThemeMode('dark');
      });

      expect(isDarkMode()).toBe(true);
    });
  });

  describe('colors', () => {
    it('should have all required color properties in light mode', () => {
      const { colors } = useThemeStore.getState();

      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('card');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
    });

    it('should switch colors when theme changes', () => {
      // Start in light mode
      expect(useThemeStore.getState().colors.background).toBe(LightColors.background);

      // Switch to dark mode
      act(() => {
        useThemeStore.getState().setThemeMode('dark');
      });

      expect(useThemeStore.getState().colors.background).toBe(DarkColors.background);
    });
  });
});
