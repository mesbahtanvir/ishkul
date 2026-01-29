/**
 * Tests for contextStore
 *
 * Tests the user context management store including:
 * - Context state management
 * - Pending updates handling
 * - Input history management
 * - Derived context updates
 */

import { act } from '@testing-library/react-native';
import { useContextStore } from '../contextStore';
import {
  UserContext,
  ParsedContext,
  DerivedContext,
  ContextUpdateResponse,
} from '../../types/app';

// Helper to create a mock parsed context
const createMockParsedContext = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  professional: {
    role: 'Software Engineer',
    company: 'Tech Corp',
    industry: 'Technology',
    experience: '5 years',
  },
  location: {
    country: 'USA',
    city: 'San Francisco',
    timezone: 'America/Los_Angeles',
  },
  skills: ['JavaScript', 'React', 'Node.js'],
  interests: ['AI', 'Machine Learning'],
  goals: ['Learn Python', 'Master Data Science'],
  preferences: {
    learningStyle: 'visual',
    pacePreference: 'moderate',
  },
  ...overrides,
});

// Helper to create a mock derived context
const createMockDerivedContext = (overrides: Partial<DerivedContext> = {}): DerivedContext => ({
  avgQuizScore: 85,
  completedCourses: 3,
  currentStreak: 7,
  mostActiveHours: [9, 10, 14, 15],
  topicsStudied: ['JavaScript', 'React'],
  totalLearningTime: 3600,
  lastUpdated: Date.now(),
  ...overrides,
});

// Helper to create a mock user context
const createMockUserContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  inputHistory: [],
  parsed: createMockParsedContext(),
  derived: createMockDerivedContext(),
  summary: 'Software engineer interested in learning data science',
  version: 1,
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  ...overrides,
});

// Helper to create a mock context update response
const createMockUpdateResponse = (
  overrides: Partial<ContextUpdateResponse> = {}
): ContextUpdateResponse => ({
  updatedContext: createMockParsedContext(),
  summary: 'Updated summary',
  changes: ['Added new skill', 'Updated goal'],
  ...overrides,
});

describe('contextStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useContextStore.getState().clearContext();
      useContextStore.setState({
        loading: false,
        updating: false,
        error: null,
        _hasHydrated: 0,
      });
    });
  });

  describe('initial state', () => {
    it('should start with default empty context', () => {
      const { context } = useContextStore.getState();
      expect(context.inputHistory).toEqual([]);
      expect(context.summary).toBe('');
      expect(context.version).toBe(1);
    });

    it('should start with empty parsed context', () => {
      const { context } = useContextStore.getState();
      expect(context.parsed.skills).toEqual([]);
      expect(context.parsed.interests).toEqual([]);
      expect(context.parsed.goals).toEqual([]);
    });

    it('should start with default derived context', () => {
      const { context } = useContextStore.getState();
      expect(context.derived.avgQuizScore).toBe(0);
      expect(context.derived.completedCourses).toBe(0);
      expect(context.derived.currentStreak).toBe(0);
    });

    it('should start with loading false', () => {
      const { loading } = useContextStore.getState();
      expect(loading).toBe(false);
    });

    it('should start with no pending update', () => {
      const { pendingUpdate } = useContextStore.getState();
      expect(pendingUpdate).toBeNull();
    });
  });

  describe('setContext', () => {
    it('should set full context', () => {
      const mockContext = createMockUserContext();

      act(() => {
        useContextStore.getState().setContext(mockContext);
      });

      const { context } = useContextStore.getState();
      expect(context).toEqual(mockContext);
    });

    it('should replace entire context', () => {
      const firstContext = createMockUserContext({ summary: 'First summary' });
      const secondContext = createMockUserContext({ summary: 'Second summary' });

      act(() => {
        useContextStore.getState().setContext(firstContext);
        useContextStore.getState().setContext(secondContext);
      });

      const { context } = useContextStore.getState();
      expect(context.summary).toBe('Second summary');
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      act(() => {
        useContextStore.getState().setLoading(true);
      });

      const { loading } = useContextStore.getState();
      expect(loading).toBe(true);
    });

    it('should set loading to false', () => {
      act(() => {
        useContextStore.getState().setLoading(true);
        useContextStore.getState().setLoading(false);
      });

      const { loading } = useContextStore.getState();
      expect(loading).toBe(false);
    });
  });

  describe('setUpdating', () => {
    it('should set updating to true', () => {
      act(() => {
        useContextStore.getState().setUpdating(true);
      });

      const { updating } = useContextStore.getState();
      expect(updating).toBe(true);
    });

    it('should set updating to false', () => {
      act(() => {
        useContextStore.getState().setUpdating(true);
        useContextStore.getState().setUpdating(false);
      });

      const { updating } = useContextStore.getState();
      expect(updating).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      act(() => {
        useContextStore.getState().setError('Failed to update context');
      });

      const { error } = useContextStore.getState();
      expect(error).toBe('Failed to update context');
    });

    it('should clear error with null', () => {
      act(() => {
        useContextStore.getState().setError('Error');
        useContextStore.getState().setError(null);
      });

      const { error } = useContextStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setPendingUpdate', () => {
    it('should set pending update', () => {
      const mockUpdate = createMockUpdateResponse();

      act(() => {
        useContextStore.getState().setPendingUpdate(mockUpdate);
      });

      const { pendingUpdate } = useContextStore.getState();
      expect(pendingUpdate).toEqual(mockUpdate);
    });

    it('should clear pending update with null', () => {
      const mockUpdate = createMockUpdateResponse();

      act(() => {
        useContextStore.getState().setPendingUpdate(mockUpdate);
        useContextStore.getState().setPendingUpdate(null);
      });

      const { pendingUpdate } = useContextStore.getState();
      expect(pendingUpdate).toBeNull();
    });
  });

  describe('applyPendingUpdate', () => {
    it('should apply pending update to context', () => {
      const initialContext = createMockUserContext({ version: 1 });
      const mockUpdate = createMockUpdateResponse({
        updatedContext: createMockParsedContext({
          skills: ['Python', 'Data Science'],
        }),
        summary: 'Now learning data science',
      });

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().setPendingUpdate(mockUpdate);
        useContextStore.getState().applyPendingUpdate();
      });

      const { context, pendingUpdate } = useContextStore.getState();
      expect(context.parsed.skills).toEqual(['Python', 'Data Science']);
      expect(context.summary).toBe('Now learning data science');
      expect(context.version).toBe(2);
      expect(pendingUpdate).toBeNull();
    });

    it('should do nothing if no pending update', () => {
      const initialContext = createMockUserContext({ version: 1 });

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().applyPendingUpdate();
      });

      const { context } = useContextStore.getState();
      expect(context.version).toBe(1);
    });

    it('should update timestamps', () => {
      const oldTime = Date.now() - 10000;
      const initialContext = createMockUserContext({
        createdAt: oldTime,
        updatedAt: oldTime,
      });
      const mockUpdate = createMockUpdateResponse();

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().setPendingUpdate(mockUpdate);
        useContextStore.getState().applyPendingUpdate();
      });

      const { context } = useContextStore.getState();
      expect(context.createdAt).toBe(oldTime); // Should preserve createdAt
      expect(context.updatedAt).toBeGreaterThan(oldTime);
    });
  });

  describe('addInputToHistory', () => {
    it('should add input to history', () => {
      act(() => {
        useContextStore.getState().addInputToHistory(
          'I am a software engineer',
          ['Added profession']
        );
      });

      const { context } = useContextStore.getState();
      expect(context.inputHistory).toHaveLength(1);
      expect(context.inputHistory[0].text).toBe('I am a software engineer');
      expect(context.inputHistory[0].changesApplied).toEqual(['Added profession']);
    });

    it('should append to existing history', () => {
      act(() => {
        useContextStore.getState().addInputToHistory('First input', ['Change 1']);
        useContextStore.getState().addInputToHistory('Second input', ['Change 2']);
      });

      const { context } = useContextStore.getState();
      expect(context.inputHistory).toHaveLength(2);
      expect(context.inputHistory[0].text).toBe('First input');
      expect(context.inputHistory[1].text).toBe('Second input');
    });

    it('should set timestamp on input', () => {
      const before = Date.now();

      act(() => {
        useContextStore.getState().addInputToHistory('Test', []);
      });

      const after = Date.now();
      const { context } = useContextStore.getState();
      expect(context.inputHistory[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(context.inputHistory[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should update context updatedAt', () => {
      const oldTime = Date.now() - 10000;
      const initialContext = createMockUserContext({ updatedAt: oldTime });

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().addInputToHistory('New input', []);
      });

      const { context } = useContextStore.getState();
      expect(context.updatedAt).toBeGreaterThan(oldTime);
    });
  });

  describe('updateDerivedContext', () => {
    it('should update derived context partially', () => {
      const initialContext = createMockUserContext();

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().updateDerivedContext({
          avgQuizScore: 95,
          currentStreak: 14,
        });
      });

      const { context } = useContextStore.getState();
      expect(context.derived.avgQuizScore).toBe(95);
      expect(context.derived.currentStreak).toBe(14);
      // Other values should be preserved
      expect(context.derived.completedCourses).toBe(3);
    });

    it('should update lastUpdated timestamp', () => {
      const oldTime = Date.now() - 10000;
      const initialContext = createMockUserContext({
        derived: createMockDerivedContext({ lastUpdated: oldTime }),
      });

      act(() => {
        useContextStore.getState().setContext(initialContext);
        useContextStore.getState().updateDerivedContext({ avgQuizScore: 90 });
      });

      const { context } = useContextStore.getState();
      expect(context.derived.lastUpdated).toBeGreaterThan(oldTime);
    });
  });

  describe('clearContext', () => {
    it('should reset context to default', () => {
      const mockContext = createMockUserContext();
      const mockUpdate = createMockUpdateResponse();

      act(() => {
        useContextStore.getState().setContext(mockContext);
        useContextStore.getState().setPendingUpdate(mockUpdate);
        useContextStore.getState().setError('Some error');
        useContextStore.getState().clearContext();
      });

      const { context, pendingUpdate, error } = useContextStore.getState();
      expect(context.inputHistory).toEqual([]);
      expect(context.summary).toBe('');
      expect(pendingUpdate).toBeNull();
      expect(error).toBeNull();
    });

    it('should not affect loading/updating states', () => {
      act(() => {
        useContextStore.getState().setLoading(true);
        useContextStore.getState().setUpdating(true);
        useContextStore.getState().clearContext();
      });

      const { loading, updating } = useContextStore.getState();
      expect(loading).toBe(true);
      expect(updating).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should handle context update flow: loading -> pending -> apply', () => {
      const initialContext = createMockUserContext({ version: 1 });
      const mockUpdate = createMockUpdateResponse();

      // Start with initial context
      act(() => {
        useContextStore.getState().setContext(initialContext);
      });

      // Start updating
      act(() => {
        useContextStore.getState().setUpdating(true);
      });
      expect(useContextStore.getState().updating).toBe(true);

      // Receive pending update
      act(() => {
        useContextStore.getState().setPendingUpdate(mockUpdate);
        useContextStore.getState().setUpdating(false);
      });
      expect(useContextStore.getState().pendingUpdate).toBeTruthy();

      // Apply update
      act(() => {
        useContextStore.getState().applyPendingUpdate();
      });
      expect(useContextStore.getState().context.version).toBe(2);
      expect(useContextStore.getState().pendingUpdate).toBeNull();
    });

    it('should handle error flow: updating -> error', () => {
      act(() => {
        useContextStore.getState().setUpdating(true);
      });

      act(() => {
        useContextStore.getState().setError('Update failed');
        useContextStore.getState().setUpdating(false);
      });

      const { error, updating } = useContextStore.getState();
      expect(error).toBe('Update failed');
      expect(updating).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty changes array in addInputToHistory', () => {
      act(() => {
        useContextStore.getState().addInputToHistory('Input with no changes', []);
      });

      const { context } = useContextStore.getState();
      expect(context.inputHistory[0].changesApplied).toEqual([]);
    });

    it('should handle context with zero timestamps', () => {
      const contextWithZeroTime = createMockUserContext({
        createdAt: 0,
        updatedAt: 0,
      });

      act(() => {
        useContextStore.getState().setContext(contextWithZeroTime);
        useContextStore.getState().setPendingUpdate(createMockUpdateResponse());
        useContextStore.getState().applyPendingUpdate();
      });

      const { context } = useContextStore.getState();
      expect(context.createdAt).toBeGreaterThan(0); // Should set createdAt if it was 0
    });
  });
});
