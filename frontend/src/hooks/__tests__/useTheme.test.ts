import { renderHook, act } from '@testing-library/react-native';
import { useTheme } from '../useTheme';
import { useThemeStore } from '../../state/themeStore';
import { LightColors } from '../../theme/colors';

// Mock the themeStore
jest.mock('../../state/themeStore', () => ({
  useThemeStore: jest.fn(),
}));

const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>;

describe('useTheme', () => {
  // Use the complete LightColors object to satisfy TypeScript
  const mockColors = LightColors;

  const mockSetThemeMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('colors', () => {
    it('should return colors from store', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.colors).toEqual(mockColors);
    });
  });

  describe('themeMode', () => {
    it('should return light theme mode', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.themeMode).toBe('light');
    });

    it('should return dark theme mode', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'dark' as const,
          resolvedTheme: 'dark' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.themeMode).toBe('dark');
    });

    it('should return system theme mode', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'system' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.themeMode).toBe('system');
    });
  });

  describe('resolvedTheme', () => {
    it('should return resolved theme as light', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'system' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should return resolved theme as dark', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'system' as const,
          resolvedTheme: 'dark' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.resolvedTheme).toBe('dark');
    });
  });

  describe('isDark', () => {
    it('should return true when resolved theme is dark', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'dark' as const,
          resolvedTheme: 'dark' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });

    it('should return false when resolved theme is light', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
    });
  });

  describe('isHydrated', () => {
    it('should return true when store is hydrated (1)', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.isHydrated).toBe(true);
    });

    it('should return false when store is not hydrated (0)', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 0,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current.isHydrated).toBe(false);
    });
  });

  describe('setThemeMode', () => {
    it('should call store setThemeMode with correct value', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
    });

    it('should support system theme mode', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setThemeMode('system');
      });

      expect(mockSetThemeMode).toHaveBeenCalledWith('system');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'dark' as const,
          resolvedTheme: 'dark' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetThemeMode).toHaveBeenCalledWith('light');
    });

    it('should toggle based on resolved theme when in system mode', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'system' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      // Should toggle to dark since resolved theme is light
      expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
    });
  });

  describe('return value structure', () => {
    it('should return all expected properties', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(result.current).toHaveProperty('colors');
      expect(result.current).toHaveProperty('themeMode');
      expect(result.current).toHaveProperty('resolvedTheme');
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('isHydrated');
      expect(result.current).toHaveProperty('setThemeMode');
      expect(result.current).toHaveProperty('toggleTheme');
    });

    it('should return functions that are callable', () => {
      mockUseThemeStore.mockImplementation((selector) => {
        const state = {
          colors: mockColors,
          themeMode: 'light' as const,
          resolvedTheme: 'light' as const,
          _hasHydrated: 1,
          setThemeMode: mockSetThemeMode,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useTheme());

      expect(typeof result.current.setThemeMode).toBe('function');
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });
});
