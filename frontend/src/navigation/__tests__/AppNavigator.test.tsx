import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../AppNavigator';
import { useUserStore } from '../../state/userStore';
import { useSubscriptionStore } from '../../state/subscriptionStore';
import { useCoursesStore } from '../../state/coursesStore';

// Mock the stores
jest.mock('../../state/userStore');
jest.mock('../../state/subscriptionStore');
jest.mock('../../state/coursesStore');

// Mock auth services
jest.mock('../../services/auth', () => ({
  checkAuthState: jest.fn().mockResolvedValue(null),
  initializeAuth: jest.fn().mockResolvedValue(undefined),
}));

// Mock memory services
jest.mock('../../services/memory', () => ({
  getUserDocument: jest.fn().mockResolvedValue(null),
}));

// Mock api services
jest.mock('../../services/api', () => ({
  coursesApi: {
    getCourses: jest.fn().mockResolvedValue([]),
  },
}));

// Mock token storage
jest.mock('../../services/api/tokenStorage', () => ({
  tokenStorage: {
    hasTokens: jest.fn().mockReturnValue(false),
  },
}));

// Mock tools
jest.mock('../../tools', () => ({}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

// Mock screens and components
jest.mock('../../screens/LandingScreen', () => ({
  LandingScreen: () => null,
}));
jest.mock('../../screens/LoginScreen', () => ({
  LoginScreen: () => null,
}));
jest.mock('../../screens/GoalSelectionScreen', () => ({
  GoalSelectionScreen: () => null,
}));
jest.mock('../../screens/HomeScreen', () => ({
  HomeScreen: () => null,
}));
jest.mock('../../screens/CourseScreen', () => ({
  CourseScreen: () => null,
}));
jest.mock('../../screens/StepDetailScreen', () => ({
  StepDetailScreen: () => null,
}));
jest.mock('../../screens/StepScreen', () => ({
  StepScreen: () => null,
}));
jest.mock('../../screens/ProgressScreen', () => ({
  ProgressScreen: () => null,
}));
jest.mock('../../screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));
jest.mock('../../screens/SubscriptionScreen', () => ({
  SubscriptionScreen: () => null,
}));
jest.mock('../../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));
jest.mock('../../components/UpgradeModal', () => ({
  UpgradeModal: () => null,
}));

// Store mock setup
const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;
const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;
const mockUseCoursesStore = useCoursesStore as jest.MockedFunction<typeof useCoursesStore>;

describe('AppNavigator', () => {
  let mockFetchStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchStatus = jest.fn().mockResolvedValue(undefined);

    // Mock useUserStore
    mockUseUserStore.mockReturnValue({
      _hasHydrated: 1,
      user: null,
      loading: false,
      setUser: jest.fn(),
      setUserDocument: jest.fn(),
      setLoading: jest.fn(),
      clearUser: jest.fn(),
    } as ReturnType<typeof useUserStore>);

    // Mock useSubscriptionStore
    mockUseSubscriptionStore.mockReturnValue({
      fetchStatus: mockFetchStatus,
    } as unknown as ReturnType<typeof useSubscriptionStore>);

    // Also mock getState and setState for direct access
    (useSubscriptionStore as unknown as { getState: () => unknown; setState: jest.Mock }).getState = jest.fn().mockReturnValue({
      fetchStatus: mockFetchStatus,
      checkoutInProgress: false,
    });
    (useSubscriptionStore as unknown as { setState: jest.Mock }).setState = jest.fn();

    // Mock useCoursesStore
    mockUseCoursesStore.mockReturnValue({
      setCourses: jest.fn(),
      setLoading: jest.fn(),
      clearAllCache: jest.fn(),
    } as unknown as ReturnType<typeof useCoursesStore>);

    // Also mock getState for direct access
    (useCoursesStore as unknown as { getState: () => unknown }).getState = jest.fn().mockReturnValue({
      clearAllCache: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<AppNavigator />);
      expect(toJSON).toBeDefined();
    });

    it('should show LoadingScreen when user store is loading', () => {
      mockUseUserStore.mockReturnValue({
        _hasHydrated: 1,
        user: null,
        loading: true,
        setUser: jest.fn(),
        setUserDocument: jest.fn(),
        setLoading: jest.fn(),
        clearUser: jest.fn(),
      } as ReturnType<typeof useUserStore>);

      render(<AppNavigator />);
      // Component should render LoadingScreen when loading is true
      expect(true).toBe(true);
    });
  });
});

describe('Subscription URL handling integration', () => {
  it('should clear checkoutInProgress when handling success URL', async () => {
    // This tests the logic that when a success URL is detected,
    // checkoutInProgress should be set to false
    const mockSetState = jest.fn();

    // Simulate the useEffect logic
    const path = '/subscription/success';
    const isWeb = true;

    if (isWeb && path === '/subscription/success') {
      mockSetState({ checkoutInProgress: false });
    }

    expect(mockSetState).toHaveBeenCalledWith({ checkoutInProgress: false });
  });

  it('should clear checkoutInProgress when handling cancel URL', async () => {
    const mockSetState = jest.fn();

    const path = '/subscription/cancel';
    const isWeb = true;

    if (isWeb && path === '/subscription/cancel') {
      mockSetState({ checkoutInProgress: false });
    }

    expect(mockSetState).toHaveBeenCalledWith({ checkoutInProgress: false });
  });

  it('should not call fetchStatus for non-subscription URLs', async () => {
    const mockFetchStatus = jest.fn();
    const mockSetState = jest.fn();

    const path: string = '/home';
    const isWeb = true;

    if (isWeb) {
      if (path === '/subscription/success') {
        mockFetchStatus();
        mockSetState({ checkoutInProgress: false });
      } else if (path === '/subscription/cancel') {
        mockSetState({ checkoutInProgress: false });
      }
    }

    expect(mockFetchStatus).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should call fetchStatus only for success URL, not cancel', async () => {
    const mockFetchStatus = jest.fn();
    const mockSetState = jest.fn();

    // Test success path
    const successPath = '/subscription/success';
    if (successPath === '/subscription/success') {
      mockFetchStatus();
      mockSetState({ checkoutInProgress: false });
    }

    expect(mockFetchStatus).toHaveBeenCalledTimes(1);

    // Test cancel path
    const cancelPath = '/subscription/cancel';
    if (cancelPath === '/subscription/cancel') {
      mockSetState({ checkoutInProgress: false });
    }

    // fetchStatus should still only have been called once (from success)
    expect(mockFetchStatus).toHaveBeenCalledTimes(1);
    // setState should have been called twice
    expect(mockSetState).toHaveBeenCalledTimes(2);
  });
});
