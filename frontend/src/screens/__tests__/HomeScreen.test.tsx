import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../HomeScreen';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      white: '#FFFFFF',
      border: '#E0E0E0',
    },
    isDark: false,
  }),
}));

const mockStoreState = {
  paths: [],
  setPaths: jest.fn(),
  setActivePath: jest.fn(),
  deletePath: jest.fn(),
  archivePath: jest.fn(),
  restorePath: jest.fn(),
  loading: false,
  listCache: null,
  isCacheValid: jest.fn().mockReturnValue(false),
};

jest.mock('../../state/learningPathsStore', () => {
  const fn = jest.fn(() => ({
    paths: [],
    setPaths: jest.fn(),
    setActivePath: jest.fn(),
    deletePath: jest.fn(),
    archivePath: jest.fn(),
    restorePath: jest.fn(),
    loading: false,
    listCache: null,
    isCacheValid: jest.fn().mockReturnValue(false),
  })) as jest.Mock & { getState: jest.Mock };
  fn.getState = jest.fn(() => ({
    paths: [],
    listCache: null,
    isCacheValid: jest.fn().mockReturnValue(false),
  }));
  return { useLearningPathsStore: fn };
});

jest.mock('../../services/api', () => ({
  learningPathsApi: {
    getPaths: jest.fn().mockResolvedValue([]),
    deletePath: jest.fn().mockResolvedValue(undefined),
    archivePath: jest.fn().mockResolvedValue(undefined),
    restorePath: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
}));

jest.mock('../../components/Container', () => ({
  Container: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

jest.mock('../../components/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

jest.mock('../../components/LearningPathCard', () => ({
  LearningPathCard: () => null,
}));

jest.mock('../../components/SegmentedControl', () => ({
  SegmentedControl: ({
    options,
    selectedValue,
    onValueChange,
  }: {
    options: Array<{ value: string; label: string }>;
    selectedValue: string;
    onValueChange: (value: string) => void;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return options.map((opt: { value: string; label: string }) => (
      <TouchableOpacity
        key={opt.value}
        onPress={() => onValueChange(opt.value)}
        testID={`tab-${opt.value}`}
      >
        <Text>{opt.label}</Text>
      </TouchableOpacity>
    ));
  },
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default state (non-loading)
    const { useLearningPathsStore } = require('../../state/learningPathsStore');
    useLearningPathsStore.mockReturnValue({
      ...mockStoreState,
      loading: false,
    });
    useLearningPathsStore.getState.mockReturnValue({
      paths: [],
      listCache: null,
      isCacheValid: jest.fn().mockReturnValue(false),
    });
  });

  it('should render without crashing', () => {
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('should display empty state for active tab', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Start Your Learning Journey')).toBeTruthy();
  });

  it('should track screen view on mount', () => {
    const { useScreenTracking } = require('../../services/analytics');
    render(<HomeScreen />);
    expect(useScreenTracking).toHaveBeenCalledWith('Home', 'HomeScreen');
  });

  it('should return LoadingScreen when loading', () => {
    const { useLearningPathsStore } = require('../../state/learningPathsStore');
    const loadingState = {
      ...mockStoreState,
      loading: true,
    };
    useLearningPathsStore.mockReturnValue(loadingState);
    useLearningPathsStore.getState.mockReturnValue(loadingState);

    // LoadingScreen is mocked to return null, so toJSON returns null
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).toBeNull();
  });

  it('should display FAB on active tab', () => {
    const { getByLabelText } = render(<HomeScreen />);
    expect(getByLabelText('Create new track')).toBeTruthy();
  });

  it('should switch tabs when tab is pressed', () => {
    const { getByTestId, queryByText } = render(<HomeScreen />);

    // Switch to completed tab
    fireEvent.press(getByTestId('tab-completed'));

    // Should show completed tab empty state
    expect(queryByText('No Completed Tracks Yet')).toBeTruthy();
  });
});

describe('HomeScreen with paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useLearningPathsStore } = require('../../state/learningPathsStore');
    const stateWithPaths = {
      ...mockStoreState,
      paths: [
        {
          id: 'path-1',
          goal: 'Learn JavaScript',
          level: 'beginner',
          progress: 50,
          status: 'active',
          steps: [],
        },
        {
          id: 'path-2',
          goal: 'Learn Python',
          level: 'intermediate',
          progress: 100,
          status: 'completed',
          steps: [],
        },
      ],
    };
    useLearningPathsStore.mockReturnValue(stateWithPaths);
    useLearningPathsStore.getState.mockReturnValue(stateWithPaths);
  });

  it('should render with paths', () => {
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
