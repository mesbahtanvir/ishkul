import { create } from 'zustand';
import { Linking, Platform } from 'react-native';
import { apiClient } from '../services/api/client';
import {
  TierType,
  SubscriptionStatusType,
  UsageLimits,
  SubscriptionStatus,
  CheckoutSessionResponse,
  PortalSessionResponse,
} from '../types/app';

interface SubscriptionState {
  // Subscription data
  tier: TierType;
  status: SubscriptionStatusType;
  paidUntil: Date | null;
  limits: UsageLimits | null;
  canUpgrade: boolean;
  canGenerateSteps: boolean;
  canCreatePath: boolean;
  dailyLimitResetAt: Date | null;

  // UI state
  loading: boolean;
  error: string | null;
  showUpgradeModal: boolean;
  upgradeModalReason: 'path_limit' | 'step_limit' | 'general' | null;

  // Actions
  fetchStatus: () => Promise<void>;
  startCheckout: (successUrl: string, cancelUrl: string) => Promise<string | null>;
  openPortal: (returnUrl?: string) => Promise<string | null>;
  showUpgradePrompt: (reason: 'path_limit' | 'step_limit' | 'general') => void;
  hideUpgradePrompt: () => void;
  reset: () => void;
}

const defaultLimits: UsageLimits = {
  dailySteps: { used: 0, limit: 100 },
  activePaths: { used: 0, limit: 2 },
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  // Initial state
  tier: 'free',
  status: null,
  paidUntil: null,
  limits: defaultLimits,
  canUpgrade: true,
  canGenerateSteps: true,
  canCreatePath: true,
  dailyLimitResetAt: null,
  loading: false,
  error: null,
  showUpgradeModal: false,
  upgradeModalReason: null,

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
        canCreatePath: response.canCreatePath,
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
    set({ loading: true, error: null });
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
        error: error instanceof Error ? error.message : 'Failed to start checkout',
      });
      return null;
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
      canCreatePath: true,
      dailyLimitResetAt: null,
      loading: false,
      error: null,
      showUpgradeModal: false,
      upgradeModalReason: null,
    });
  },
}));

// Helper to check if user is Pro
export const useIsPro = () => useSubscriptionStore((state) => state.tier === 'pro');

// Helper to get usage percentage
export const useUsagePercentage = (type: 'dailySteps' | 'activePaths') => {
  return useSubscriptionStore((state) => {
    if (!state.limits) return 0;
    const limit = state.limits[type];
    return Math.min(100, (limit.used / limit.limit) * 100);
  });
};
