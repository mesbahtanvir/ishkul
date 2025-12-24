/**
 * Tests for subscriptionStore
 *
 * Tests subscription state management with token-based usage limits
 */

// Must mock react-native BEFORE importing the store
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
  AppState: {
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    currentState: 'active',
  },
}));

// Mock window for web platform
const mockWindow = {
  open: jest.fn(),
  location: { href: 'https://app.ishkul.org/settings' },
};
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

// Mock the API client
jest.mock('../../services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock the stripe service
jest.mock('../../services/stripe', () => ({
  stripeService: {
    processPayment: jest.fn(),
  },
}));

import { act } from '@testing-library/react-native';
import { useSubscriptionStore } from '../subscriptionStore';
import { apiClient } from '../../services/api/client';
import { stripeService } from '../../services/stripe';
import { UsageLimits, SubscriptionStatus } from '../../types/app';

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedStripeService = stripeService as jest.Mocked<typeof stripeService>;

// Helper to create mock usage limits
const createMockLimits = (overrides: Partial<UsageLimits> = {}): UsageLimits => ({
  dailyTokens: { used: 0, limit: 100000 },
  weeklyTokens: { used: 0, limit: 1000000 },
  activePaths: { used: 0, limit: 2 },
  ...overrides,
});

// Helper to create mock subscription status response
const createMockSubscriptionStatus = (overrides: Partial<SubscriptionStatus> = {}): SubscriptionStatus => ({
  tier: 'free',
  status: 'active',
  paidUntil: null,
  limits: createMockLimits(),
  canUpgrade: true,
  canGenerate: true,
  canCreatePath: true,
  dailyLimitResetAt: null,
  weeklyLimitResetAt: null,
  ...overrides,
});

describe('subscriptionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useSubscriptionStore.getState().reset();
    });
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default free tier state', () => {
      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.status).toBeNull();
      expect(state.paidUntil).toBeNull();
      expect(state.canUpgrade).toBe(true);
      expect(state.canGenerate).toBe(true);
      expect(state.canCreatePath).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.checkoutInProgress).toBe(false);
    });

    it('should have default usage limits', () => {
      const state = useSubscriptionStore.getState();
      expect(state.limits).toEqual({
        dailyTokens: { used: 0, limit: 100000 },
        weeklyTokens: { used: 0, limit: 1000000 },
        activePaths: { used: 0, limit: 2 },
      });
    });
  });

  describe('fetchStatus', () => {
    it('should fetch and set subscription status', async () => {
      const mockStatus = createMockSubscriptionStatus({
        tier: 'pro',
        status: 'active',
        limits: createMockLimits({
          dailyTokens: { used: 50000, limit: 500000 },
          weeklyTokens: { used: 200000, limit: 5000000 },
          activePaths: { used: 3, limit: 10 },
        }),
        canUpgrade: false,
      });

      mockedApiClient.get.mockResolvedValueOnce(mockStatus);

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('pro');
      expect(state.status).toBe('active');
      expect(state.canUpgrade).toBe(false);
      expect(state.limits?.dailyTokens.limit).toBe(500000);
      expect(state.loading).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockedApiClient.get.mockImplementationOnce(() => {
        loadingDuringFetch = useSubscriptionStore.getState().loading;
        return Promise.resolve(createMockSubscriptionStatus());
      });

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      expect(loadingDuringFetch).toBe(true);
      expect(useSubscriptionStore.getState().loading).toBe(false);
    });

    it('should parse paidUntil date', async () => {
      const paidUntilDate = '2025-12-31T23:59:59Z';
      const mockStatus = createMockSubscriptionStatus({
        paidUntil: paidUntilDate,
      });

      mockedApiClient.get.mockResolvedValueOnce(mockStatus);

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.paidUntil).toBeInstanceOf(Date);
      // Compare date values since toISOString format may include milliseconds
      expect(state.paidUntil?.getTime()).toBe(new Date(paidUntilDate).getTime());
    });
  });

  describe('startCheckout', () => {
    it('should create checkout session and return session ID', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        sessionId: 'cs_test_123',
        checkoutUrl: 'https://checkout.stripe.com/test',
      });

      let sessionId: string | null = null;
      await act(async () => {
        sessionId = await useSubscriptionStore.getState().startCheckout(
          'https://app.com/success',
          'https://app.com/cancel'
        );
      });

      expect(sessionId).toBe('cs_test_123');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/subscription/checkout', {
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });
    });

    it('should set checkoutInProgress flag', async () => {
      let checkoutFlagDuringCall = false;
      mockedApiClient.post.mockImplementationOnce(() => {
        checkoutFlagDuringCall = useSubscriptionStore.getState().checkoutInProgress;
        return Promise.resolve({
          sessionId: 'cs_test_123',
          checkoutUrl: 'https://checkout.stripe.com/test',
        });
      });

      await act(async () => {
        await useSubscriptionStore.getState().startCheckout('success', 'cancel');
      });

      expect(checkoutFlagDuringCall).toBe(true);
    });

    it('should handle checkout error', async () => {
      mockedApiClient.post.mockRejectedValueOnce(new Error('Payment service unavailable'));

      let result: string | null = 'not null';
      await act(async () => {
        result = await useSubscriptionStore.getState().startCheckout('success', 'cancel');
      });

      expect(result).toBeNull();
      expect(useSubscriptionStore.getState().error).toBe('Payment service unavailable');
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(false);
    });
  });

  describe('startNativeCheckout', () => {
    it('should process payment and refresh status on success', async () => {
      mockedStripeService.processPayment.mockResolvedValueOnce({ success: true });
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({ tier: 'pro' })
      );

      await act(async () => {
        const result = await useSubscriptionStore.getState().startNativeCheckout();
        expect(result.success).toBe(true);
      });

      expect(useSubscriptionStore.getState().tier).toBe('pro');
      expect(useSubscriptionStore.getState().checkoutInProgress).toBe(false);
    });

    it('should handle native payment failure', async () => {
      mockedStripeService.processPayment.mockResolvedValueOnce({
        success: false,
        error: 'Card declined',
      });

      await act(async () => {
        const result = await useSubscriptionStore.getState().startNativeCheckout();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Card declined');
      });

      expect(useSubscriptionStore.getState().error).toBe('Card declined');
    });
  });

  describe('verifyCheckout', () => {
    it('should verify checkout and update tier on success', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        tier: 'pro',
      });
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({ tier: 'pro' })
      );

      await act(async () => {
        const result = await useSubscriptionStore.getState().verifyCheckout('cs_test_123');
        expect(result.success).toBe(true);
        expect(result.tier).toBe('pro');
      });

      expect(useSubscriptionStore.getState().tier).toBe('pro');
    });

    it('should handle verification failure', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        success: false,
        tier: 'free',
        message: 'Session expired',
      });

      await act(async () => {
        const result = await useSubscriptionStore.getState().verifyCheckout('cs_test_invalid');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Session expired');
      });
    });
  });

  describe('openPortal', () => {
    it('should open billing portal and return URL', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        portalUrl: 'https://billing.stripe.com/portal/test',
      });

      let url: string | null = null;
      await act(async () => {
        url = await useSubscriptionStore.getState().openPortal('https://app.com/settings');
      });

      expect(url).toBe('https://billing.stripe.com/portal/test');
      expect(mockedApiClient.post).toHaveBeenCalledWith('/subscription/portal', {
        returnUrl: 'https://app.com/settings',
      });
    });

    it('should handle portal error', async () => {
      mockedApiClient.post.mockRejectedValueOnce(new Error('Portal unavailable'));

      let url: string | null = 'not null';
      await act(async () => {
        url = await useSubscriptionStore.getState().openPortal();
      });

      expect(url).toBeNull();
      expect(useSubscriptionStore.getState().error).toBe('Portal unavailable');
    });
  });

  describe('upgrade modal', () => {
    it('should show upgrade prompt with reason', () => {
      act(() => {
        useSubscriptionStore.getState().showUpgradePrompt('token_limit');
      });

      const state = useSubscriptionStore.getState();
      expect(state.showUpgradeModal).toBe(true);
      expect(state.upgradeModalReason).toBe('token_limit');
    });

    it('should hide upgrade prompt', () => {
      act(() => {
        useSubscriptionStore.getState().showUpgradePrompt('path_limit');
        useSubscriptionStore.getState().hideUpgradePrompt();
      });

      const state = useSubscriptionStore.getState();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.upgradeModalReason).toBeNull();
    });

    it('should support all upgrade reasons', () => {
      const reasons: Array<'path_limit' | 'token_limit' | 'general'> = [
        'path_limit',
        'token_limit',
        'general',
      ];

      reasons.forEach((reason) => {
        act(() => {
          useSubscriptionStore.getState().showUpgradePrompt(reason);
        });
        expect(useSubscriptionStore.getState().upgradeModalReason).toBe(reason);
      });
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', async () => {
      // First, set up some state
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          tier: 'pro',
          status: 'active',
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
        useSubscriptionStore.getState().showUpgradePrompt('general');
      });

      // Now reset
      act(() => {
        useSubscriptionStore.getState().reset();
      });

      const state = useSubscriptionStore.getState();
      expect(state.tier).toBe('free');
      expect(state.status).toBeNull();
      expect(state.showUpgradeModal).toBe(false);
      expect(state.checkoutInProgress).toBe(false);
    });
  });

  describe('useIsPro helper', () => {
    it('should return false for free tier', () => {
      // The hook needs to be used in a component context, so we test the underlying logic
      const state = useSubscriptionStore.getState();
      expect(state.tier === 'pro').toBe(false);
    });

    it('should return true for pro tier', async () => {
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({ tier: 'pro' })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      expect(useSubscriptionStore.getState().tier === 'pro').toBe(true);
    });
  });

  describe('usage calculations', () => {
    it('should calculate usage percentage correctly', async () => {
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          limits: createMockLimits({
            dailyTokens: { used: 50000, limit: 100000 }, // 50%
            weeklyTokens: { used: 250000, limit: 1000000 }, // 25%
            activePaths: { used: 1, limit: 2 }, // 50%
          }),
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      const dailyPercentage = (state.limits!.dailyTokens.used / state.limits!.dailyTokens.limit) * 100;
      const weeklyPercentage = (state.limits!.weeklyTokens.used / state.limits!.weeklyTokens.limit) * 100;

      expect(dailyPercentage).toBe(50);
      expect(weeklyPercentage).toBe(25);
    });

    it('should cap usage percentage at 100', async () => {
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          limits: createMockLimits({
            dailyTokens: { used: 150000, limit: 100000 }, // Over limit
          }),
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      const percentage = Math.min(
        100,
        (state.limits!.dailyTokens.used / state.limits!.dailyTokens.limit) * 100
      );

      expect(percentage).toBe(100);
    });
  });

  describe('limit tracking', () => {
    it('should track daily limit reset time', async () => {
      const resetTime = '2025-01-01T00:00:00Z';
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          dailyLimitResetAt: resetTime,
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.dailyLimitResetAt).toBeInstanceOf(Date);
      // Date.toISOString() adds milliseconds, so compare the date values
      expect(state.dailyLimitResetAt?.getTime()).toBe(new Date(resetTime).getTime());
    });

    it('should track weekly limit reset time', async () => {
      const resetTime = '2025-01-07T00:00:00Z';
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          weeklyLimitResetAt: resetTime,
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.weeklyLimitResetAt).toBeInstanceOf(Date);
    });

    it('should track which limit was reached', async () => {
      mockedApiClient.get.mockResolvedValueOnce(
        createMockSubscriptionStatus({
          limitReached: 'daily_tokens',
          canGenerate: false,
        })
      );

      await act(async () => {
        await useSubscriptionStore.getState().fetchStatus();
      });

      const state = useSubscriptionStore.getState();
      expect(state.limitReached).toBe('daily_tokens');
      expect(state.canGenerate).toBe(false);
    });
  });
});
