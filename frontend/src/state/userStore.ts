import { create } from 'zustand';
import { User, UserDocument } from '../types/app';

interface UserState {
  user: User | null;
  userDocument: UserDocument | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setUserDocument: (userDocument: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userDocument: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setUserDocument: (userDocument) => set({ userDocument }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearUser: () => set({ user: null, userDocument: null, error: null }),
}));
