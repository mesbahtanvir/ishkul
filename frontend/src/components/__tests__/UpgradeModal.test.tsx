/**
 * UpgradeModal Tests
 *
 * Tests the upgrade modal component including:
 * - Different upgrade reasons
 * - Feature lists
 * - Button interactions
 * - Dismiss behavior
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { UpgradeModal } from '../UpgradeModal';

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666', tertiary: '#999999' },
      primary: '#0066FF',
      white: '#FFFFFF',
      card: { default: '#FFFFFF' },
    },
  }),
}));

jest.mock('../Button', () => ({
  Button: ({
    title,
    onPress,
    loading,
    testID,
  }: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    testID?: string;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={testID || 'button'} disabled={loading}>
        <Text>{loading ? 'Loading...' : title}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock subscription store
const mockHideUpgradePrompt = jest.fn();
const mockStartCheckout = jest.fn();
const mockStartNativeCheckout = jest.fn();

const mockSubscriptionStore = {
  showUpgradeModal: true,
  upgradeModalReason: null as string | null,
  hideUpgradePrompt: mockHideUpgradePrompt,
  startCheckout: mockStartCheckout,
  startNativeCheckout: mockStartNativeCheckout,
  loading: false,
  limits: {
    activePaths: { limit: 2 },
  },
};

jest.mock('../../state/subscriptionStore', () => ({
  useSubscriptionStore: () => mockSubscriptionStore,
}));

// Mock stripe service
jest.mock('../../services/stripe', () => ({
  stripeService: {
    isNativePaymentAvailable: jest.fn(() => false),
  },
}));

describe('UpgradeModal', () => {
  const mockOnDismiss = jest.fn();
  const mockOnUpgradeSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionStore.showUpgradeModal = true;
    mockSubscriptionStore.upgradeModalReason = null;
    mockSubscriptionStore.loading = false;
  });

  describe('Rendering', () => {
    it('should render when showUpgradeModal is true', () => {
      const { getByText } = render(
        <UpgradeModal onDismiss={mockOnDismiss} onUpgradeSuccess={mockOnUpgradeSuccess} />
      );

      expect(getByText('Upgrade to Pro')).toBeTruthy();
    });

    it('should display rocket icon', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('🚀')).toBeTruthy();
    });

    it('should display price information', () => {
      const { getByText } = render(<UpgradeModal />);

      expect(getByText('$2')).toBeTruthy();
      expect(getByText('/month')).toBeTruthy();
    });

    it('should display Upgrade Now button', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Upgrade Now')).toBeTruthy();
    });

    it('should display Maybe Later button', () => {
      const { getByText } = render(<UpgradeModal />);
      expect(getByText('Maybe Later')).toBeTruthy();
    });
  });

  describe('Content based on reason', () => {
    it('should show path limit content when reason is path_limit', () => {
      mockSubscriptionStore.upgradeModalReason = 'path_limit';

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('Track Limit Reached')).toBeTruthy();
      expect(getByText(/free limit of 2 active tracks/)).toBeTruthy();
    });

    it('should show token limit content when reason is token_limit', () => {
      mockSubscriptionStore.upgradeModalReason = 'token_limit';

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('Token Limit Reached')).toBeTruthy();
      expect(getByText(/token limit/)).toBeTruthy();
    });

    it('should show default content when no reason', () => {
      mockSubscriptionStore.upgradeModalReason = null;

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('Upgrade to Pro')).toBeTruthy();
      expect(getByText('Unlock the full power of Ishkul with a Pro subscription.')).toBeTruthy();
    });
  });

  describe('Feature lists', () => {
    it('should display features for default upgrade', () => {
      mockSubscriptionStore.upgradeModalReason = null;

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('5 active tracks')).toBeTruthy();
      expect(getByText('500K tokens per day')).toBeTruthy();
      expect(getByText('5M tokens per week')).toBeTruthy();
      expect(getByText('Priority AI generation')).toBeTruthy();
    });

    it('should display features for path limit', () => {
      mockSubscriptionStore.upgradeModalReason = 'path_limit';

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('5 active tracks')).toBeTruthy();
      expect(getByText('500K tokens per day')).toBeTruthy();
      expect(getByText('Priority AI generation')).toBeTruthy();
    });

    it('should display features for token limit', () => {
      mockSubscriptionStore.upgradeModalReason = 'token_limit';

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('500K tokens per day')).toBeTruthy();
      expect(getByText('5M tokens per week')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call hideUpgradePrompt and onDismiss when Maybe Later is pressed', () => {
      const { getByText } = render(
        <UpgradeModal onDismiss={mockOnDismiss} />
      );

      fireEvent.press(getByText('Maybe Later'));

      expect(mockHideUpgradePrompt).toHaveBeenCalled();
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should call startCheckout when Upgrade Now is pressed on web', async () => {
      const { stripeService } = require('../../services/stripe');
      stripeService.isNativePaymentAvailable.mockReturnValue(false);

      mockStartCheckout.mockResolvedValue('session-123');

      // Mock window.location.origin for web
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      });

      const { getByText } = render(
        <UpgradeModal onUpgradeSuccess={mockOnUpgradeSuccess} />
      );

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockStartCheckout).toHaveBeenCalled();
      });
    });

    it('should call startNativeCheckout when on native platform', async () => {
      const { stripeService } = require('../../services/stripe');
      stripeService.isNativePaymentAvailable.mockReturnValue(true);

      mockStartNativeCheckout.mockResolvedValue({ success: true });

      const { getByText } = render(
        <UpgradeModal onUpgradeSuccess={mockOnUpgradeSuccess} />
      );

      fireEvent.press(getByText('Upgrade Now'));

      await waitFor(() => {
        expect(mockStartNativeCheckout).toHaveBeenCalled();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading state on upgrade button', () => {
      mockSubscriptionStore.loading = true;

      const { getByText } = render(<UpgradeModal />);

      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('State Transitions', () => {
    it('should handle reason change', () => {
      mockSubscriptionStore.upgradeModalReason = null;
      const { rerender, getByText } = render(<UpgradeModal />);

      expect(getByText('Upgrade to Pro')).toBeTruthy();

      mockSubscriptionStore.upgradeModalReason = 'path_limit';
      rerender(<UpgradeModal />);

      expect(getByText('Track Limit Reached')).toBeTruthy();
    });

    it('should handle loading state change', () => {
      mockSubscriptionStore.loading = false;
      const { rerender, getByText, queryByText } = render(<UpgradeModal />);

      expect(getByText('Upgrade Now')).toBeTruthy();

      mockSubscriptionStore.loading = true;
      rerender(<UpgradeModal />);

      expect(getByText('Loading...')).toBeTruthy();
      expect(queryByText('Upgrade Now')).toBeNull();
    });
  });
});
