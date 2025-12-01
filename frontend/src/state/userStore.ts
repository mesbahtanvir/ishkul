import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserDocument } from '../types/app';

interface UserState {
  user: User | null;
  userDocument: UserDocument | null;
  loading: boolean;
  error: string | null;
  // Whether the store has been hydrated from AsyncStorage (stored as 0 or 1 for new arch compatibility)
  _hasHydrated: number;
  setUser: (user: User | null) => void;
  setUserDocument: (userDocument: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      userDocument: null,
      loading: true,
      error: null,
      _hasHydrated: 0, // 0 = false, 1 = true (for new arch compatibility)
      setUser: (user) => set({ user }),
      setUserDocument: (userDocument) => set({ userDocument }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearUser: () => set({ user: null, userDocument: null, error: null }),
    }),
    {
      name: 'ishkul-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user and userDocument, not loading/error states
      partialize: (state) => ({
        user: state.user,
        userDocument: state.userDocument,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (!error && state) {
            // Set hydrated flag using number instead of boolean for new arch compatibility
            state._hasHydrated = 1;
          }
        };
      },
    }
  )
);
