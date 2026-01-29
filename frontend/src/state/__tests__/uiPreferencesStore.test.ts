/**
 * Tests for uiPreferencesStore
 *
 * Tests the UI preferences management including:
 * - Sidebar state management
 * - Toggle functionality
 * - State persistence
 */

import { act } from '@testing-library/react-native';
import { useUIPreferencesStore } from '../uiPreferencesStore';

describe('uiPreferencesStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useUIPreferencesStore.setState({
        sidebarCollapsed: false,
      });
    });
  });

  describe('initial state', () => {
    it('should start with sidebar expanded (not collapsed)', () => {
      const { sidebarCollapsed } = useUIPreferencesStore.getState();
      expect(sidebarCollapsed).toBe(false);
    });
  });

  describe('setSidebarCollapsed', () => {
    it('should set sidebar to collapsed', () => {
      act(() => {
        useUIPreferencesStore.getState().setSidebarCollapsed(true);
      });

      const { sidebarCollapsed } = useUIPreferencesStore.getState();
      expect(sidebarCollapsed).toBe(true);
    });

    it('should set sidebar to expanded', () => {
      // Start collapsed
      act(() => {
        useUIPreferencesStore.setState({ sidebarCollapsed: true });
      });

      // Set to expanded
      act(() => {
        useUIPreferencesStore.getState().setSidebarCollapsed(false);
      });

      const { sidebarCollapsed } = useUIPreferencesStore.getState();
      expect(sidebarCollapsed).toBe(false);
    });

    it('should handle setting to same value', () => {
      act(() => {
        useUIPreferencesStore.getState().setSidebarCollapsed(true);
        useUIPreferencesStore.getState().setSidebarCollapsed(true);
      });

      const { sidebarCollapsed } = useUIPreferencesStore.getState();
      expect(sidebarCollapsed).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle from expanded to collapsed', () => {
      // Start expanded
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);

      act(() => {
        useUIPreferencesStore.getState().toggleSidebar();
      });

      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should toggle from collapsed to expanded', () => {
      // Start collapsed
      act(() => {
        useUIPreferencesStore.setState({ sidebarCollapsed: true });
      });

      act(() => {
        useUIPreferencesStore.getState().toggleSidebar();
      });

      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should toggle multiple times', () => {
      // Toggle 4 times
      act(() => {
        useUIPreferencesStore.getState().toggleSidebar(); // false -> true
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true);

      act(() => {
        useUIPreferencesStore.getState().toggleSidebar(); // true -> false
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);

      act(() => {
        useUIPreferencesStore.getState().toggleSidebar(); // false -> true
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true);

      act(() => {
        useUIPreferencesStore.getState().toggleSidebar(); // true -> false
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should handle mixed set and toggle operations', () => {
      // Set collapsed
      act(() => {
        useUIPreferencesStore.getState().setSidebarCollapsed(true);
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true);

      // Toggle
      act(() => {
        useUIPreferencesStore.getState().toggleSidebar();
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);

      // Set again
      act(() => {
        useUIPreferencesStore.getState().setSidebarCollapsed(true);
      });
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should handle rapid toggles', () => {
      const toggles = 10;

      act(() => {
        for (let i = 0; i < toggles; i++) {
          useUIPreferencesStore.getState().toggleSidebar();
        }
      });

      // After even number of toggles, should be back to initial state (false)
      expect(useUIPreferencesStore.getState().sidebarCollapsed).toBe(false);
    });
  });
});
