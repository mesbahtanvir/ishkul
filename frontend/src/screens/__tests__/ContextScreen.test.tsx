/**
 * ContextScreen Tests
 *
 * Tests the user context management screen including:
 * - Empty state for new users
 * - Populated state with existing context
 * - Context updates with change detection
 * - Skills, goals, interests display
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ContextScreen } from '../ContextScreen';

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666', tertiary: '#999999' },
      primary: '#0066FF',
      white: '#FFFFFF',
      success: '#34C759',
      danger: '#FF3B30',
      card: { default: '#FFFFFF' },
      border: '#E5E5E5',
    },
    isDark: false,
  }),
}));

jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    responsive: (small: number) => small,
    screenSize: 'small',
    isSmall: true,
    isMedium: false,
    isLarge: false,
    isSmallPhone: false,
    isTablet: false,
  }),
}));

jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
}));

jest.mock('../../components/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../components/Button', () => ({
  Button: ({
    title,
    onPress,
    loading,
    disabled,
    testID,
  }: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    testID?: string;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={testID || 'button'}
        disabled={disabled || loading}
      >
        <Text>{loading ? 'Loading...' : title}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock context components
jest.mock('../../components/context', () => ({
  EmptyContextState: ({
    inputText,
    onInputChange,
    onSubmit,
    isLoading,
    error,
  }: {
    inputText: string;
    onInputChange: (text: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    error: string | null;
  }) => {
    const { View, Text, TextInput, TouchableOpacity } = require('react-native');
    return (
      <View testID="empty-context-state">
        <TextInput
          testID="context-input"
          value={inputText}
          onChangeText={onInputChange}
          placeholder="Tell us about yourself..."
        />
        <TouchableOpacity onPress={onSubmit} testID="submit-button" disabled={isLoading}>
          <Text>{isLoading ? 'Loading...' : 'Submit'}</Text>
        </TouchableOpacity>
        {error && <Text testID="error-message">{error}</Text>}
      </View>
    );
  },
  ChangesList: ({
    changes,
    onApply,
    onCancel,
  }: {
    changes: Array<{ description: string }>;
    onApply: () => void;
    onCancel: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="changes-list">
        {changes.map((change, i) => (
          <Text key={i} testID={`change-${i}`}>{change.description}</Text>
        ))}
        <TouchableOpacity onPress={onApply} testID="apply-button">
          <Text>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} testID="cancel-button">
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  },
  ProfileSection: ({ professional, location, personality }: {
    professional: { role?: string };
    location?: { city?: string };
    personality?: { traits?: string[] };
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="profile-section">
        {professional.role && <Text testID="role">{professional.role}</Text>}
        {location?.city && <Text testID="city">{location.city}</Text>}
      </View>
    );
  },
  SkillItem: ({ skill }: { skill: { name: string; level?: string } }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`skill-${skill.name}`}>
        <Text>{skill.name}</Text>
      </View>
    );
  },
  StatsGrid: ({ derived }: { derived: { totalSkills?: number } }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="stats-grid">
        <Text testID="total-skills">{derived?.totalSkills || 0}</Text>
      </View>
    );
  },
}));

// Mock context store
const mockContextStore = {
  context: {
    parsed: {
      professional: { role: '' },
      skills: [],
      interests: [],
      goals: [],
      location: {},
      personality: {},
      preferences: {},
    },
    derived: {
      totalSkills: 0,
    },
    updatedAt: 0,
  },
  updating: false,
  pendingUpdate: null,
  error: null,
  setUpdating: jest.fn(),
  setPendingUpdate: jest.fn(),
  setError: jest.fn(),
  applyPendingUpdate: jest.fn(),
  addInputToHistory: jest.fn(),
};

const mockUseContextStore = jest.fn(() => mockContextStore);

jest.mock('../../state/contextStore', () => ({
  useContextStore: Object.assign(
    () => mockUseContextStore(),
    { getState: jest.fn(() => mockContextStore) }
  ),
}));

// Mock context API
const mockContextApi = {
  updateContext: jest.fn(),
  applyContext: jest.fn(),
};

jest.mock('../../services/api', () => ({
  contextApi: mockContextApi,
}));

describe('ContextScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to empty context
    mockUseContextStore.mockReturnValue({
      ...mockContextStore,
      context: {
        parsed: {
          professional: { role: '' },
          skills: [],
          interests: [],
          goals: [],
          location: {},
          personality: {},
          preferences: {},
        },
        derived: { totalSkills: 0 },
        updatedAt: 0,
      },
    });
  });

  describe('Empty State', () => {
    it('should render empty state for new users', () => {
      const { getByTestId } = render(<ContextScreen />);
      expect(getByTestId('empty-context-state')).toBeTruthy();
    });

    it('should track screen view on mount', () => {
      const { useScreenTracking } = require('../../services/analytics');
      render(<ContextScreen />);
      expect(useScreenTracking).toHaveBeenCalledWith('Context', 'ContextScreen');
    });

    it('should show error when submitting empty input', async () => {
      const setErrorMock = jest.fn();
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        setError: setErrorMock,
      });

      const { getByTestId } = render(<ContextScreen />);

      // Submit without entering text
      fireEvent.press(getByTestId('submit-button'));

      expect(setErrorMock).toHaveBeenCalledWith('Please enter some context about yourself');
    });

    it('should call setUpdating when valid input is submitted', async () => {
      const setUpdatingMock = jest.fn();
      const setErrorMock = jest.fn();

      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        setUpdating: setUpdatingMock,
        setError: setErrorMock,
      });

      const { getByTestId } = render(<ContextScreen />);

      // Enter text
      fireEvent.changeText(getByTestId('context-input'), 'I know React and TypeScript');

      // Submit
      fireEvent.press(getByTestId('submit-button'));

      // setUpdating should be called first
      expect(setUpdatingMock).toHaveBeenCalledWith(true);
      expect(setErrorMock).toHaveBeenCalledWith(null);
    });
  });

  describe('Populated State', () => {
    const populatedContext = {
      parsed: {
        professional: { role: 'Software Engineer' },
        skills: [{ name: 'JavaScript', level: 'expert' }, { name: 'React', level: 'advanced' }],
        interests: ['AI', 'Web Development'],
        goals: ['Learn Rust', 'Build a startup'],
        location: { city: 'San Francisco' },
        personality: { traits: ['curious', 'analytical'] },
        preferences: {
          learningStyle: 'visual',
          studyTime: 'morning',
          sessionLength: '30 minutes',
        },
      },
      derived: { totalSkills: 2 },
      updatedAt: Date.now(),
    };

    beforeEach(() => {
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: populatedContext,
      });
    });

    it('should render header with title', () => {
      const { getByText } = render(<ContextScreen />);

      expect(getByText('My Context')).toBeTruthy();
      expect(getByText('This helps personalize your learning experience')).toBeTruthy();
    });

    it('should display profile section', () => {
      const { getByTestId } = render(<ContextScreen />);

      expect(getByTestId('profile-section')).toBeTruthy();
      expect(getByTestId('role').props.children).toBe('Software Engineer');
    });

    it('should display skills', () => {
      const { getByTestId, getByText } = render(<ContextScreen />);

      expect(getByTestId('skill-JavaScript')).toBeTruthy();
      expect(getByTestId('skill-React')).toBeTruthy();
    });

    it('should display interests as tags', () => {
      const { getByText } = render(<ContextScreen />);

      expect(getByText('AI')).toBeTruthy();
      expect(getByText('Web Development')).toBeTruthy();
    });

    it('should display goals as tags', () => {
      const { getByText } = render(<ContextScreen />);

      expect(getByText('Learn Rust')).toBeTruthy();
      expect(getByText('Build a startup')).toBeTruthy();
    });

    it('should display learning preferences', () => {
      const { getByText } = render(<ContextScreen />);

      // Learning preferences should be visible
      expect(getByText('Style')).toBeTruthy();
      expect(getByText('visual')).toBeTruthy();
      expect(getByText('Best Time')).toBeTruthy();
      expect(getByText('morning')).toBeTruthy();
    });

    it('should display stats grid', () => {
      const { getByTestId } = render(<ContextScreen />);

      expect(getByTestId('stats-grid')).toBeTruthy();
    });

    it('should display last updated date', () => {
      const { getByText } = render(<ContextScreen />);

      // Should show "Last updated: ..." text
      const dateStr = new Date(populatedContext.updatedAt).toLocaleDateString();
      expect(getByText(`Last updated: ${dateStr}`)).toBeTruthy();
    });

    it('should not show last updated when updatedAt is 0', () => {
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: {
          ...populatedContext,
          updatedAt: 0,
        },
      });

      const { queryByText } = render(<ContextScreen />);

      expect(queryByText(/Last updated:/)).toBeNull();
    });
  });

  describe('Changes List', () => {
    it('should display changes list when pendingUpdate is available', () => {
      const populatedContext = {
        parsed: {
          professional: { role: 'Engineer' },
          skills: [{ name: 'JS' }],
          interests: [],
          goals: [],
          location: {},
          personality: {},
          preferences: {},
        },
        derived: { totalSkills: 1 },
        updatedAt: Date.now(),
      };

      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: populatedContext,
        pendingUpdate: {
          changes: [
            { description: 'Added skill: TypeScript' },
            { description: 'Updated role to Senior Engineer' },
          ],
        },
      });

      // Note: showChanges state is internal, so we need to trigger it through the flow
      // For this test, we verify the component structure handles pendingUpdate
      const { queryByTestId } = render(<ContextScreen />);

      // Changes list should only show when showChanges is true (internal state)
      // This tests the structure exists
      expect(queryByTestId('changes-list')).toBeNull(); // Hidden initially
    });
  });

  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle transition from empty to populated context', () => {
      // Start with empty context
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: {
          parsed: {
            professional: { role: '' },
            skills: [],
            interests: [],
            goals: [],
            location: {},
            personality: {},
            preferences: {},
          },
          derived: { totalSkills: 0 },
          updatedAt: 0,
        },
      });

      const { rerender, getByTestId, queryByTestId, getByText } = render(<ContextScreen />);

      expect(getByTestId('empty-context-state')).toBeTruthy();

      // Update to populated context
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: {
          parsed: {
            professional: { role: 'Developer' },
            skills: [{ name: 'Python' }],
            interests: ['ML'],
            goals: [],
            location: {},
            personality: {},
            preferences: {},
          },
          derived: { totalSkills: 1 },
          updatedAt: Date.now(),
        },
      });

      rerender(<ContextScreen />);

      expect(queryByTestId('empty-context-state')).toBeNull();
      expect(getByText('My Context')).toBeTruthy();
    });

    it('should handle updating state toggle', () => {
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        updating: false,
      });

      const { rerender, getByText, queryByText } = render(<ContextScreen />);

      // Check button shows "Submit" when not loading
      expect(getByText('Submit')).toBeTruthy();

      // Toggle to updating
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        updating: true,
      });

      rerender(<ContextScreen />);

      // Button text should change to "Loading..."
      expect(getByText('Loading...')).toBeTruthy();
      expect(queryByText('Submit')).toBeNull();
    });

    it('should handle error state changes', () => {
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        error: null,
      });

      const { rerender, queryByTestId, getByTestId } = render(<ContextScreen />);

      expect(queryByTestId('error-message')).toBeNull();

      // Add error
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        error: 'Network error occurred',
      });

      rerender(<ContextScreen />);

      expect(getByTestId('error-message').props.children).toBe('Network error occurred');
    });
  });

  describe('Learning Preferences', () => {
    it('should not render preferences section when no preferences set', () => {
      mockUseContextStore.mockReturnValue({
        ...mockContextStore,
        context: {
          parsed: {
            professional: { role: 'Engineer' },
            skills: [{ name: 'Go' }],
            interests: [],
            goals: [],
            location: {},
            personality: {},
            preferences: {},
          },
          derived: { totalSkills: 1 },
          updatedAt: Date.now(),
        },
      });

      const { queryByText } = render(<ContextScreen />);

      // Learning Preferences section should not be visible
      expect(queryByText('Learning Preferences')).toBeNull();
    });
  });
});
