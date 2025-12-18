/**
 * UI Preferences Store
 *
 * Persists user interface preferences like sidebar visibility across sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIPreferencesState {
  // Sidebar visibility state (for web/tablet)
  sidebarCollapsed: boolean;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },
    }),
    {
      name: 'ishkul-ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
