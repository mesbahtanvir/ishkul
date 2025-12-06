import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserContext,
  ParsedContext,
  DerivedContext,
  ContextChange,
  ContextUpdateResponse,
} from '../types/app';

// Default empty context
const defaultParsedContext: ParsedContext = {
  professional: {},
  location: {},
  skills: [],
  interests: [],
  goals: [],
  preferences: {},
};

const defaultDerivedContext: DerivedContext = {
  avgQuizScore: 0,
  completedCourses: 0,
  currentStreak: 0,
  mostActiveHours: [],
  topicsStudied: [],
  totalLearningTime: 0,
  lastUpdated: 0,
};

const defaultUserContext: UserContext = {
  inputHistory: [],
  parsed: defaultParsedContext,
  derived: defaultDerivedContext,
  summary: '',
  version: 1,
  createdAt: 0,
  updatedAt: 0,
};

interface ContextState {
  // User context data
  context: UserContext;
  // Loading states
  loading: boolean;
  updating: boolean;
  // Pending update (before user confirms)
  pendingUpdate: ContextUpdateResponse | null;
  // Error state
  error: string | null;
  // Hydration flag
  _hasHydrated: number;

  // Actions
  setContext: (context: UserContext) => void;
  setLoading: (loading: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setPendingUpdate: (update: ContextUpdateResponse | null) => void;
  setError: (error: string | null) => void;

  // Apply pending update to context
  applyPendingUpdate: () => void;

  // Add input to history
  addInputToHistory: (text: string, changes: string[]) => void;

  // Update derived context (from usage stats)
  updateDerivedContext: (derived: Partial<DerivedContext>) => void;

  // Clear context
  clearContext: () => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      context: defaultUserContext,
      loading: false,
      updating: false,
      pendingUpdate: null,
      error: null,
      _hasHydrated: 0,

      setContext: (context) => set({ context }),
      setLoading: (loading) => set({ loading }),
      setUpdating: (updating) => set({ updating }),
      setPendingUpdate: (pendingUpdate) => set({ pendingUpdate }),
      setError: (error) => set({ error }),

      applyPendingUpdate: () => {
        const { pendingUpdate, context } = get();
        if (!pendingUpdate) return;

        const now = Date.now();
        const updatedContext: UserContext = {
          ...context,
          parsed: pendingUpdate.updatedContext,
          summary: pendingUpdate.summary,
          version: context.version + 1,
          updatedAt: now,
          createdAt: context.createdAt || now,
        };

        set({
          context: updatedContext,
          pendingUpdate: null,
        });
      },

      addInputToHistory: (text, changes) => {
        const { context } = get();
        const now = Date.now();

        set({
          context: {
            ...context,
            inputHistory: [
              ...context.inputHistory,
              {
                text,
                timestamp: now,
                changesApplied: changes,
              },
            ],
            updatedAt: now,
          },
        });
      },

      updateDerivedContext: (derived) => {
        const { context } = get();
        set({
          context: {
            ...context,
            derived: {
              ...context.derived,
              ...derived,
              lastUpdated: Date.now(),
            },
          },
        });
      },

      clearContext: () => {
        set({
          context: defaultUserContext,
          pendingUpdate: null,
          error: null,
        });
      },
    }),
    {
      name: 'ishkul-context-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        context: state.context,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (!error && state) {
            state._hasHydrated = 1;
          }
        };
      },
    }
  )
);
