import { create } from 'zustand';
import { Linking, Platform, AppState, AppStateStatus } from 'react-native';
import { apiClient } from '../services/api/client';
import { stripeService } from '../services/stripe';
import {
  TierType,
  SubscriptionStatusType,
  UsageLimits,
  SubscriptionStatus,
  CheckoutSessionResponse,
  PortalSessionResponse,
  VerifyCheckoutResponse,
} from '../types/app';

interface SubscriptionState {
  // Subscription data
  tier: TierType;
  status: SubscriptionStatusType;
  paidUntil: Date | null;
  limits: UsageLimits | null;
  canUpgrade: boolean;
  canGenerateSteps: boolean;
  canCreateCourse: boolean;
  dailyLimitResetAt: Date | null;

  // UI state
  loading: boolean;
  error: string | null;
  showUpgradeModal: boolean;
  upgradeModalReason: 'path_limit' | 'step_limit' | 'general' | null;

  // Checkout tracking
  checkoutInProgress: boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  startCheckout: (successUrl: string, cancelUrl: string) => Promise<string | null>;
  startNativeCheckout: () => Promise<{ success: boolean; error?: string }>;
  verifyCheckout: (sessionId: string) => Promise<{ success: boolean; tier: TierType; error?: string }>;
  openPortal: (returnUrl?: string) => Promise<string | null>;
  showUpgradePrompt: (reason: 'path_limit' | 'step_limit' | 'general') => void;
  hideUpgradePrompt: () => void;
  reset: () => void;
}

const defaultLimits: UsageLimits = {
  dailySteps: { used: 0, limit: 100 },
  activeCourses: { used: 0, limit: 2 },
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Initial state
  tier: 'free',
  status: null,
  paidUntil: null,
  limits: defaultLimits,
  canUpgrade: true,
  canGenerateSteps: true,
  canCreateCourse: true,
  dailyLimitResetAt: null,
  loading: false,
  error: null,
  showUpgradeModal: false,
  upgradeModalReason: null,
  checkoutInProgress: false,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<SubscriptionStatus>('/subscription/status');
      set({
        tier: response.tier,
        status: response.status,
        paidUntil: response.paidUntil ? new Date(response.paidUntil) : null,
        limits: response.limits,
        canUpgrade: response.canUpgrade,
        canGenerateSteps: response.canGenerateSteps,
        canCreateCourse: response.canCreateCourse,
        dailyLimitResetAt: response.dailyLimitResetAt ? new Date(response.dailyLimitResetAt) : null,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription status',
      });
    }
  },

  startCheckout: async (successUrl: string, cancelUrl: string) => {
    set({ loading: true, error: null, checkoutInProgress: true });
    try {
      const response = await apiClient.post<CheckoutSessionResponse>('/subscription/checkout', {
        successUrl,
        cancelUrl,
      });

      // Open checkout URL in browser
      const url = response.checkoutUrl;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      }

      set({ loading: false });
      return response.sessionId;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      set({
        loading: false,
        checkoutInProgress: false,
        error: error instanceof Error ? error.message : 'Failed to start checkout',
      });
      return null;
    }
  },

  startNativeCheckout: async () => {
    set({ loading: true, error: null, checkoutInProgress: true });
    try {
      const result = await stripeService.processPayment();

      if (result.success) {
        // Payment successful, refresh subscription status
        await get().fetchStatus();
        set({ loading: false, checkoutInProgress: false });
        return { success: true };
      } else {
        set({
          loading: false,
          checkoutInProgress: false,
          error: result.error || 'Payment failed',
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Native checkout failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      set({
        loading: false,
        checkoutInProgress: false,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },

  verifyCheckout: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post<VerifyCheckoutResponse>('/subscription/verify', {
        sessionId,
      });

      if (response.success) {
        // Verification successful - update local state and fetch full status
        set({ tier: response.tier, checkoutInProgress: false });
        await get().fetchStatus();
        set({ loading: false });
        return { success: true, tier: response.tier };
      } else {
        set({
          loading: false,
          checkoutInProgress: false,
          error: response.message || 'Verification failed',
        });
        return { success: false, tier: response.tier, error: response.message };
      }
    } catch (error) {
      console.error('Failed to verify checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      set({
        loading: false,
        checkoutInProgress: false,
        error: errorMessage,
      });
      return { success: false, tier: 'free', error: errorMessage };
    }
  },

  openPortal: async (returnUrl?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post<PortalSessionResponse>('/subscription/portal', {
        returnUrl: returnUrl || (Platform.OS === 'web' ? window.location.href : 'ishkul://settings'),
      });

      // Open portal URL in browser
      const url = response.portalUrl;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        }
      }

      set({ loading: false });
      return url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to open billing portal',
      });
      return null;
    }
  },

  showUpgradePrompt: (reason) => {
    set({ showUpgradeModal: true, upgradeModalReason: reason });
  },

  hideUpgradePrompt: () => {
    set({ showUpgradeModal: false, upgradeModalReason: null });
  },

  reset: () => {
    set({
      tier: 'free',
      status: null,
      paidUntil: null,
      limits: defaultLimits,
      canUpgrade: true,
      canGenerateSteps: true,
      canCreateCourse: true,
      dailyLimitResetAt: null,
      loading: false,
      error: null,
      showUpgradeModal: false,
      upgradeModalReason: null,
      checkoutInProgress: false,
    });
  },
}));

// Set up app state change listener to refresh subscription after checkout
// This handles the case where user returns from Stripe checkout (fallback for mobile)
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let visibilityHandler: (() => void) | null = null;

const setupVisibilityListener = () => {
  if (Platform.OS === 'web') {
    // Web: Use document visibility API
    // Note: The primary verification happens via session ID on the success page
    // This is a fallback for edge cases
    if (typeof document !== 'undefined' && !visibilityHandler) {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          const state = useSubscriptionStore.getState();
          if (state.checkoutInProgress) {
            // Refresh subscription status after returning from checkout
            state.fetchStatus().then(() => {
              useSubscriptionStore.setState({ checkoutInProgress: false });
            });
          }
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }
  } else {
    // Mobile: Use AppState
    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          const state = useSubscriptionStore.getState();
          if (state.checkoutInProgress) {
            // Refresh subscription status after returning from checkout
            state.fetchStatus().then(() => {
              useSubscriptionStore.setState({ checkoutInProgress: false });
            });
          }
        }
      });
    }
  }
};

// Initialize the listener
setupVisibilityListener();

// Helper to check if user is Pro
export const useIsPro = () => useSubscriptionStore((state) => state.tier === 'pro');

// Helper to get usage percentage
export const useUsagePercentage = (type: 'dailySteps' | 'activeCourses') => {
  return useSubscriptionStore((state) => {
    if (!state.limits) return 0;
    const limit = state.limits[type];
    return Math.min(100, (limit.used / limit.limit) * 100);
  });
};
