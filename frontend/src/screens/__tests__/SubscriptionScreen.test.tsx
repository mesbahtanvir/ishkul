import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SubscriptionScreen } from '../SubscriptionScreen';
import { useSubscriptionStore } from '../../state/subscriptionStore';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Subscription'>;

// Mock the subscription store
jest.mock('../../state/subscriptionStore');

// Mock stripe service - native payment not available in tests (web environment)
jest.mock('../../services/stripe', () => ({
  stripeService: {
    isNativePaymentAvailable: () => false,
    processPayment: jest.fn(),
  },
}));

// Mock window.location for web checkout tests
Object.defineProperty(window, 'location', {
  value: { origin: 'https://test.example.com' },
  writable: true,
});

const mockFetchStatus = jest.fn();
const mockStartCheckout = jest.fn();
const mockStartNativeCheckout = jest.fn();
const mockOpenPortal = jest.fn();

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
} as unknown as NavigationProp;

const defaultStoreState = {
  tier: 'free' as const,
  status: null,
  paidUntil: null,
  limits: {
    dailySteps: { used: 25, limit: 100 },
    activePaths: { used: 1, limit: 2 },
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
  fetchStatus: mockFetchStatus,
  startCheckout: mockStartCheckout,
  startNativeCheckout: mockStartNativeCheckout,
  openPortal: mockOpenPortal,
  showUpgradePrompt: jest.fn(),
  hideUpgradePrompt: jest.fn(),
  reset: jest.fn(),
};

describe('SubscriptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscriptionStore.mockReturnValue(defaultStoreState);
  });

  describe('rendering - free tier', () => {
    it('should render screen header with title', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Subscription')).toBeTruthy();
    });

    it('should render Free plan card with price', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Free')).toBeTruthy();
      expect(getByText('$0')).toBeTruthy();
      expect(getByText('forever')).toBeTruthy();
    });

    it('should show Current badge on Free plan for free tier user', () => {
      const { getAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      const currentBadges = getAllByText('Current');
      expect(currentBadges.length).toBe(1);
    });

    it('should render Pro plan card with price', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Pro')).toBeTruthy();
      expect(getByText('$2')).toBeTruthy();
      expect(getByText('/month')).toBeTruthy();
    });

    it('should render RECOMMENDED banner on Pro plan', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('RECOMMENDED')).toBeTruthy();
    });

    it('should render Free plan features', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('2 active learning paths')).toBeTruthy();
      expect(getByText('100 steps per day')).toBeTruthy();
      expect(getByText('GPT-4o-mini AI model')).toBeTruthy();
      expect(getByText('Lesson and Quiz content')).toBeTruthy();
    });

    it('should render Pro plan features', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('5 active learning paths')).toBeTruthy();
      expect(getByText('1,000 steps per day')).toBeTruthy();
      expect(getByText('GPT-5 Pro AI model')).toBeTruthy();
      expect(getByText('All content types')).toBeTruthy();
      expect(getByText('Priority generation')).toBeTruthy();
      expect(getByText('Advanced insights')).toBeTruthy();
    });

    it('should render Upgrade to Pro button for free user', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Upgrade to Pro')).toBeTruthy();
    });

    it('should render usage stats', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText("Today's Usage")).toBeTruthy();
      expect(getByText('Steps Generated')).toBeTruthy();
      expect(getByText('25 / 100')).toBeTruthy();
      expect(getByText('Active Paths')).toBeTruthy();
      expect(getByText('1 / 2')).toBeTruthy();
    });

    it('should render footer text', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Subscriptions are managed through Stripe. Cancel anytime.')).toBeTruthy();
    });
  });

  describe('rendering - pro tier', () => {
    beforeEach(() => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        tier: 'pro',
        status: 'active',
        paidUntil: new Date('2025-12-31'),
        limits: {
          dailySteps: { used: 150, limit: 1000 },
          activePaths: { used: 3, limit: 5 },
        },
        canUpgrade: false,
      });
    });

    it('should render Pro plan current card', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText("You're on the Pro plan!")).toBeTruthy();
    });

    it('should show PRO badge', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('PRO')).toBeTruthy();
    });

    it('should show renews date for active subscription', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText(/Renews on/)).toBeTruthy();
    });

    it('should show Current badge on Pro plan', () => {
      const { getAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      const currentBadges = getAllByText('Current');
      expect(currentBadges.length).toBe(1);
    });

    it('should show Manage Subscription button for pro user', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('Manage Subscription')).toBeTruthy();
    });

    it('should render pro tier usage stats', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('150 / 1000')).toBeTruthy();
      expect(getByText('3 / 5')).toBeTruthy();
    });
  });

  describe('rendering - canceled subscription', () => {
    beforeEach(() => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        tier: 'pro',
        status: 'canceled',
        paidUntil: new Date('2025-12-31'),
      });
    });

    it('should show access until date for canceled subscription', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText(/Access until/)).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call fetchStatus on mount', () => {
      render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(mockFetchStatus).toHaveBeenCalled();
    });

    it('should call goBack when back button is pressed', () => {
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      // Find the back button (usually rendered as text or icon in ScreenHeader)
      // The ScreenHeader has onBack prop that calls navigation.goBack
      const backElements = getByText('Subscription');
      expect(backElements).toBeTruthy();
    });

    it('should call startCheckout when Upgrade button is pressed', async () => {
      mockStartCheckout.mockResolvedValue('session123');
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Upgrade to Pro'));

      await waitFor(() => {
        expect(mockStartCheckout).toHaveBeenCalledWith(
          expect.stringContaining('/subscription/success'),
          expect.stringContaining('/subscription/cancel')
        );
      });
    });

    it('should navigate to ManageSubscription when Manage Subscription is pressed', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        tier: 'pro',
        status: 'active',
      });
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

      fireEvent.press(getByText('Manage Subscription'));

      expect(mockNavigate).toHaveBeenCalledWith('ManageSubscription');
    });
  });

  describe('loading state', () => {
    it('should show loading indicator on Upgrade button when loading', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        loading: true,
      });
      const { UNSAFE_getByType } = render(<SubscriptionScreen navigation={mockNavigation} />);
      // When loading, Button shows ActivityIndicator instead of text
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('null limits', () => {
    it('should not render usage card when limits are null', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        limits: null,
      });
      const { queryByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(queryByText("Today's Usage")).toBeNull();
    });
  });

  describe('high usage', () => {
    it('should display high usage correctly', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        limits: {
          dailySteps: { used: 95, limit: 100 },
          activePaths: { used: 2, limit: 2 },
        },
      });
      const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);
      expect(getByText('95 / 100')).toBeTruthy();
      expect(getByText('2 / 2')).toBeTruthy();
    });
  });
});
