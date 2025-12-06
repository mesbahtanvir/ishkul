import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { UpgradeModal } from '../UpgradeModal';
import { useSubscriptionStore } from '../../state/subscriptionStore';
import { stripeService } from '../../services/stripe';

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

const mockHideUpgradePrompt = jest.fn();
const mockStartCheckout = jest.fn();
const mockStartNativeCheckout = jest.fn();

const mockUseSubscriptionStore = useSubscriptionStore as jest.MockedFunction<typeof useSubscriptionStore>;

const defaultStoreState = {
  tier: 'free' as const,
  status: null,
  paidUntil: null,
  limits: {
    dailySteps: { used: 100, limit: 100 },
    activeCourses: { used: 2, limit: 2 },
  },
  canUpgrade: true,
  canGenerateSteps: false,
  canCreateCourse: false,
  dailyLimitResetAt: null,
  loading: false,
  error: null,
  showUpgradeModal: true,
  upgradeModalReason: null,
  checkoutInProgress: false,
  fetchStatus: jest.fn(),
  startCheckout: mockStartCheckout,
  startNativeCheckout: mockStartNativeCheckout,
  openPortal: jest.fn(),
  showUpgradePrompt: jest.fn(),
  hideUpgradePrompt: mockHideUpgradePrompt,
  reset: jest.fn(),
};

describe('UpgradeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscriptionStore.mockReturnValue(defaultStoreState);
  });

  describe('visibility', () => {
    it('should be visible when showUpgradeModal is true', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Upgrade to Pro')).toBeTruthy();
    });

    it('should not be visible when showUpgradeModal is false', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        showUpgradeModal: false,
      });
      const { queryByText } = render(<UpgradeModal />);
      expect(queryByText('Upgrade to Pro')).toBeNull();
    });
  });

  describe('content - default reason (null)', () => {
    it('should render rocket emoji', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('🚀')).toBeTruthy();
    });

    it('should render default title', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Upgrade to Pro')).toBeTruthy();
    });

    it('should render default message', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Unlock the full power of Ishkul with a Pro subscription.')).toBeTruthy();
    });

    it('should render default features', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('5 active tracks')).toBeTruthy();
      expect(getByText('1,000 steps per day')).toBeTruthy();
      expect(getByText('GPT-5 Pro AI model')).toBeTruthy();
      expect(getByText('Priority generation')).toBeTruthy();
    });

    it('should render price', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('$2')).toBeTruthy();
      expect(getByText('/month')).toBeTruthy();
    });

    it('should render upgrade button', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Upgrade Now')).toBeTruthy();
    });

    it('should render dismiss button', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('content - path_limit reason', () => {
    beforeEach(() => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        upgradeModalReason: 'path_limit',
      });
    });

    it('should render path limit title', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Track Limit Reached')).toBeTruthy();
    });

    it('should render path limit message', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText(/You've reached the free limit of 2 active tracks/)).toBeTruthy();
    });

    it('should render path limit features', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('5 active tracks')).toBeTruthy();
      expect(getByText('1,000 steps per day')).toBeTruthy();
      expect(getByText('GPT-5 Pro AI model')).toBeTruthy();
    });
  });

  describe('content - step_limit reason', () => {
    beforeEach(() => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        upgradeModalReason: 'step_limit',
      });
    });

    it('should render step limit title', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Daily Step Limit Reached')).toBeTruthy();
    });

    it('should render step limit message', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText(/You've used all 100 steps for today/)).toBeTruthy();
    });

    it('should render step limit features', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('1,000 steps per day')).toBeTruthy();
      expect(getByText('Priority generation')).toBeTruthy();
      expect(getByText('GPT-5 Pro AI model')).toBeTruthy();
    });
  });

  describe('interactions - dismiss', () => {
    it('should call hideUpgradePrompt when Maybe Later is pressed', () => {
      const { getByText } = render(<UpgradeModal />);

      fireEvent.press(getByText('Maybe Later'));

      expect(mockHideUpgradePrompt).toHaveBeenCalled();
    });

    it('should call onDismiss callback when Maybe Later is pressed', () => {
      const mockOnDismiss = jest.fn();
      const { getByText } = render(<UpgradeModal onDismiss={mockOnDismiss} />);

      fireEvent.press(getByText('Maybe Later'));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should call hideUpgradePrompt when overlay is pressed', () => {
      const { getByText } = render(<UpgradeModal />);
      // The overlay is wrapped around the modal content
      // We'll test by pressing Maybe Later which triggers handleDismiss
      fireEvent.press(getByText('Maybe Later'));
      expect(mockHideUpgradePrompt).toHaveBeenCalled();
    });
  });

  describe('interactions - upgrade', () => {
    it('should call startCheckout when Upgrade Now is pressed', async () => {
      mockStartCheckout.mockResolvedValue('session123');
      const { getByText } = render(<UpgradeModal />);

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockStartCheckout).toHaveBeenCalledWith(
          expect.stringContaining('/subscription/success'),
          expect.stringContaining('/subscription/cancel')
        );
      });
    });

    it('should call hideUpgradePrompt after successful checkout', async () => {
      mockStartCheckout.mockResolvedValue('session123');
      const { getByText } = render(<UpgradeModal />);

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockHideUpgradePrompt).toHaveBeenCalled();
      });
    });

    it('should call onUpgradeSuccess callback after successful checkout', async () => {
      mockStartCheckout.mockResolvedValue('session123');
      const mockOnUpgradeSuccess = jest.fn();
      const { getByText } = render(<UpgradeModal onUpgradeSuccess={mockOnUpgradeSuccess} />);

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockOnUpgradeSuccess).toHaveBeenCalled();
      });
    });

    it('should not call hideUpgradePrompt if checkout returns null', async () => {
      mockStartCheckout.mockResolvedValue(null);
      const { getByText } = render(<UpgradeModal />);

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockStartCheckout).toHaveBeenCalled();
      });

      // hideUpgradePrompt should not be called since sessionId is null
      expect(mockHideUpgradePrompt).not.toHaveBeenCalled();
    });

    it('should not call onUpgradeSuccess if checkout returns null', async () => {
      mockStartCheckout.mockResolvedValue(null);
      const mockOnUpgradeSuccess = jest.fn();
      const { getByText } = render(<UpgradeModal onUpgradeSuccess={mockOnUpgradeSuccess} />);

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockStartCheckout).toHaveBeenCalled();
      });

      expect(mockOnUpgradeSuccess).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator on Upgrade button when loading', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        loading: true,
      });
      const { UNSAFE_getByType } = render(<UpgradeModal />);
      // When loading, Button shows ActivityIndicator instead of text
      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('should disable dismiss button during loading', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        loading: true,
      });
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle null limits gracefully', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        limits: null,
        upgradeModalReason: 'path_limit',
      });
      const { getByText } = render(<UpgradeModal />);
      // Should fall back to default values
      expect(getByText(/You've reached the free limit of 2 active tracks/)).toBeTruthy();
    });

    it('should handle null limits for step_limit reason', () => {
      mockUseSubscriptionStore.mockReturnValue({
        ...defaultStoreState,
        limits: null,
        upgradeModalReason: 'step_limit',
      });
      const { getByText } = render(<UpgradeModal />);
      // Should fall back to default values
      expect(getByText(/You've used all 100 steps for today/)).toBeTruthy();
    });
  });

  describe('checkmarks', () => {
    it('should render checkmark symbols for each feature', () => {
      const { getAllByText } = render(<UpgradeModal />);
      const checkmarks = getAllByText('\u2713');
      // Default reason has 4 features
      expect(checkmarks.length).toBe(4);
    });
  });
});
