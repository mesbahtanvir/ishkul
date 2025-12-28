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

const mockUseCoursesSubscription = jest.fn(() => ({
  isSubscribed: true,
  connectionError: null,
  isLoading: false,
}));

jest.mock('../../hooks/useCoursesSubscription', () => ({
  useCoursesSubscription: () => mockUseCoursesSubscription(),
}));

const mockStoreState = {
  courses: [],
  setCourses: jest.fn(),
  setActiveCourse: jest.fn(),
  deleteCourse: jest.fn(),
  archiveCourse: jest.fn(),
  restoreCourse: jest.fn(),
  loading: false,
  listCache: null,
  isCacheValid: jest.fn().mockReturnValue(false),
};

jest.mock('../../state/coursesStore', () => {
  const fn = jest.fn(() => ({
    courses: [],
    setCourses: jest.fn(),
    setActiveCourse: jest.fn(),
    deleteCourse: jest.fn(),
    archiveCourse: jest.fn(),
    restoreCourse: jest.fn(),
    loading: false,
    listCache: null,
    isCacheValid: jest.fn().mockReturnValue(false),
  })) as jest.Mock & { getState: jest.Mock };
  fn.getState = jest.fn(() => ({
    courses: [],
    listCache: null,
    isCacheValid: jest.fn().mockReturnValue(false),
  }));
  return { useCoursesStore: fn };
});

jest.mock('../../services/api', () => ({
  coursesApi: {
    getCourses: jest.fn().mockResolvedValue([]),
    deleteCourse: jest.fn().mockResolvedValue(undefined),
    archiveCourse: jest.fn().mockResolvedValue(undefined),
    restoreCourse: jest.fn().mockResolvedValue(undefined),
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

jest.mock('../../components/CourseCard', () => ({
  CourseCard: () => null,
}));

jest.mock('../../components/SegmentedControl', () => ({
  SegmentedControl: ({
    options,
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
    const { useCoursesStore } = require('../../state/coursesStore');
    useCoursesStore.mockReturnValue({
      ...mockStoreState,
      loading: false,
    });
    useCoursesStore.getState.mockReturnValue({
      courses: [],
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
    // Mock the subscription hook to return loading state
    mockUseCoursesSubscription.mockReturnValue({
      isSubscribed: false,
      connectionError: null,
      isLoading: true,
    });

    // LoadingScreen is mocked to return null, so toJSON returns null
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).toBeNull();

    // Reset mock for other tests
    mockUseCoursesSubscription.mockReturnValue({
      isSubscribed: true,
      connectionError: null,
      isLoading: false,
    });
  });

  it('should display FAB on active tab', () => {
    const { getByLabelText } = render(<HomeScreen />);
    expect(getByLabelText('Create new course')).toBeTruthy();
  });

  it('should switch tabs when tab is pressed', () => {
    const { getByTestId, queryByText } = render(<HomeScreen />);

    // Switch to completed tab
    fireEvent.press(getByTestId('tab-completed'));

    // Should show completed tab empty state
    expect(queryByText('No Completed Courses Yet')).toBeTruthy();
  });
});

describe('HomeScreen with courses', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useCoursesStore } = require('../../state/coursesStore');
    const stateWithPaths = {
      ...mockStoreState,
      courses: [
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
    useCoursesStore.mockReturnValue(stateWithPaths);
    useCoursesStore.getState.mockReturnValue(stateWithPaths);
  });

  it('should render with courses', () => {
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
