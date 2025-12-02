import { useSubscriptionStore, useIsPro, useUsagePercentage } from '../subscriptionStore';
import { apiClient } from '../../services/api/client';
import { renderHook, act } from '@testing-library/react-native';

// Mock apiClient
jest.mock('../../services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock react-native Linking, Platform, and AppState
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(true),
  },
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

describe('subscriptionStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useSubscriptionStore.setState({
      tier: 'free',
      status: null,
      paidUntil: null,
      limits: {
        dailySteps: { used: 0, limit: 100 },
        activePaths: { used: 0, limit: 2 },
      },
      canUpgrade: true,
      canGenerateSteps: true,
      canCreatePath: true,
      dailyLimitResetAt: null,
      loading: false,
      error: null,
      showUpgradeModal: false,
      upgradeModalReason: null,
      checkoutInProgress: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.status).toBeNull();
      expect(state.paidUntil).toBeNull();
      expect(state.limits?.dailySteps.limit).toBe(100);
      expect(state.limits?.activePaths.limit).toBe(2);
      expect(state.canUpgrade).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.checkoutInProgress).toBe(false);
    });
  });

  describe('fetchStatus', () => {
    it('should fetch and update subscription status', async () => {
      const mockResponse = {
        tier: 'pro' as const,
        status: 'active' as const,
        paidUntil: '2025-12-31T00:00:00Z',
        limits: {
          dailySteps: { used: 50, limit: 1000 },
          activePaths: { used: 3, limit: 5 },
        },
        canUpgrade: false,
        canGenerateSteps: true,
        canCreatePath: true,
        dailyLimitResetAt: '2025-12-03T00:00:00Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.status).toBe('active');
      expect(state.limits?.dailySteps.limit).toBe(1000);
      expect(state.canUpgrade).toBe(false);
      expect(state.loading).toBe(false);
      expect(apiClient.get).toHaveBeenCalledWith('/subscription/status');
    });

    it('should handle fetch error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      (apiClient.get as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const fetchPromise = useSubscriptionStore.getState().fetchStatus();
      expect(useSubscriptionStore.getState().loading).toBe(true);

      await act(async () => {
        await fetchPromise;
      });
    });
  });

  describe('startCheckout', () => {
    it('should create checkout session and return session ID', async () => {
      const mockResponse = {
        checkoutUrl: 'https://checkout.stripe.com/session123',
        sessionId: 'session123',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      let sessionId: string | null = null;
      await act(async () => {
        sessionId = await useSubscriptionStore
          .getState()
          .startCheckout('https://success.url', 'https://cancel.url');
      });

      expect(sessionId).toBe('session123');
      expect(apiClient.post).toHaveBeenCalledWith('/subscription/checkout', {
        successUrl: 'https://success.url',
        cancelUrl: 'https://cancel.url',
      });
    });

    it('should set checkoutInProgress to true when starting checkout', async () => {
      const mockResponse = {
        checkoutUrl: 'https://checkout.stripe.com/session123',
        sessionId: 'session123',
      };

      (apiClient.post as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      const checkoutPromise = useSubscriptionStore
        .getState()
        .startCheckout('https://success.url', 'https://cancel.url');

      // Check that checkoutInProgress is set during checkout
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(true);

      await act(async () => {
        await checkoutPromise;
      });

      // checkoutInProgress should still be true after successful checkout
      // (it's cleared by the visibility listener when user returns)
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(true);
    });

    it('should handle checkout error and reset checkoutInProgress', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Checkout failed'));

      let sessionId: string | null = null;
      await act(async () => {
        sessionId = await useSubscriptionStore
          .getState()
          .startCheckout('https://success.url', 'https://cancel.url');
      });

      expect(sessionId).toBeNull();
      expect(useSubscriptionStore.getState().error).toBe('Checkout failed');
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(false);
    });
  });

  describe('openPortal', () => {
    it('should create portal session and open URL', async () => {
      const mockResponse = {
        portalUrl: 'https://billing.stripe.com/portal123',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      let portalUrl: string | null = null;
      await act(async () => {
        portalUrl = await useSubscriptionStore.getState().openPortal('https://return.url');
      });

      expect(portalUrl).toBe('https://billing.stripe.com/portal123');
      expect(apiClient.post).toHaveBeenCalledWith('/subscription/portal', {
        returnUrl: 'https://return.url',
      });
    });

    it('should handle portal error', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Portal failed'));

      let portalUrl: string | null = null;
      await act(async () => {
        portalUrl = await useSubscriptionStore.getState().openPortal();
      });

      expect(portalUrl).toBeNull();
      expect(useSubscriptionStore.getState().error).toBe('Portal failed');
    });
  });

  describe('showUpgradePrompt / hideUpgradePrompt', () => {
    it('should show upgrade prompt with reason', () => {
      act(() => {
        useSubscriptionStore.getState().showUpgradePrompt('path_limit');
      });

      const state = useSubscriptionStore.getState();
      expect(state.showUpgradeModal).toBe(true);
      expect(state.upgradeModalReason).toBe('path_limit');
    });

    it('should hide upgrade prompt', () => {
      act(() => {
        useSubscriptionStore.getState().showUpgradePrompt('step_limit');
      });

      act(() => {
        useSubscriptionStore.getState().hideUpgradePrompt();
      });

      const state = useSubscriptionStore.getState();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.upgradeModalReason).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to default values', async () => {
      // First, modify the state
      useSubscriptionStore.setState({
        tier: 'pro',
        status: 'active',
        paidUntil: new Date(),
        error: 'Some error',
        showUpgradeModal: true,
        checkoutInProgress: true,
      });

      act(() => {
        useSubscriptionStore.getState().reset();
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.status).toBeNull();
      expect(state.paidUntil).toBeNull();
      expect(state.error).toBeNull();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.checkoutInProgress).toBe(false);
    });
  });

  describe('checkoutInProgress state', () => {
    it('should be able to set checkoutInProgress directly', () => {
      useSubscriptionStore.setState({ checkoutInProgress: true });
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(true);

      useSubscriptionStore.setState({ checkoutInProgress: false });
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(false);
    });

    it('should persist checkoutInProgress through fetchStatus calls', async () => {
      useSubscriptionStore.setState({ checkoutInProgress: true });

      const mockResponse = {
        tier: 'pro' as const,
        status: 'active' as const,
        paidUntil: '2025-12-31T00:00:00Z',
        limits: {
          dailySteps: { used: 50, limit: 1000 },
          activePaths: { used: 3, limit: 5 },
        },
        canUpgrade: false,
        canGenerateSteps: true,
        canCreatePath: true,
        dailyLimitResetAt: '2025-12-03T00:00:00Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      // fetchStatus should not clear checkoutInProgress
      // (that's done by the visibility listener)
      expect(useSubscriptionStore.getState().tier).toBe('pro');
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(true);
    });
  });
});

describe('useIsPro hook', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({ tier: 'free' });
  });

  it('should return false for free tier', () => {
    const { result } = renderHook(() => useIsPro());
    expect(result.current).toBe(false);
  });

  it('should return true for pro tier', () => {
    useSubscriptionStore.setState({ tier: 'pro' });
    const { result } = renderHook(() => useIsPro());
    expect(result.current).toBe(true);
  });
});

describe('useUsagePercentage hook', () => {
  beforeEach(() => {
    useSubscriptionStore.setState({
      limits: {
        dailySteps: { used: 50, limit: 100 },
        activePaths: { used: 1, limit: 2 },
      },
    });
  });

  it('should calculate daily steps percentage correctly', () => {
    const { result } = renderHook(() => useUsagePercentage('dailySteps'));
    expect(result.current).toBe(50);
  });

  it('should calculate active paths percentage correctly', () => {
    const { result } = renderHook(() => useUsagePercentage('activePaths'));
    expect(result.current).toBe(50);
  });

  it('should cap percentage at 100', () => {
    useSubscriptionStore.setState({
      limits: {
        dailySteps: { used: 150, limit: 100 },
        activePaths: { used: 3, limit: 2 },
      },
    });

    const { result: dailyResult } = renderHook(() => useUsagePercentage('dailySteps'));
    const { result: pathsResult } = renderHook(() => useUsagePercentage('activePaths'));

    expect(dailyResult.current).toBe(100);
    expect(pathsResult.current).toBe(100);
  });

  it('should return 0 when limits are null', () => {
    useSubscriptionStore.setState({ limits: null });
    const { result } = renderHook(() => useUsagePercentage('dailySteps'));
    expect(result.current).toBe(0);
  });
});
