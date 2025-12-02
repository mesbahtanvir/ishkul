import { Platform } from 'react-native';
import { apiClient } from './api/client';
import { PaymentSheetParams } from '../types/app';

// Stripe payment service
// Uses native payment sheet on mobile, falls back to checkout redirect on web

export interface PaymentResult {
  success: boolean;
  error?: string;
  subscriptionId?: string;
}

// Dynamically import Stripe React Native only on mobile
let stripeModule: typeof import('@stripe/stripe-react-native') | null = null;

const getStripeModule = async () => {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!stripeModule) {
    try {
      stripeModule = await import('@stripe/stripe-react-native');
    } catch (error) {
      console.warn('Failed to load Stripe React Native:', error);
      return null;
    }
  }
  return stripeModule;
};

export const stripeService = {
  /**
   * Initialize the Stripe payment sheet with subscription parameters
   */
  async initPaymentSheet(): Promise<{ initialized: boolean; error?: string }> {
    const stripe = await getStripeModule();
    if (!stripe) {
      return { initialized: false, error: 'Stripe not available on this platform' };
    }

    try {
      // Fetch payment sheet parameters from backend
      const params = await apiClient.post<PaymentSheetParams>('/subscription/payment-sheet', {});

      // Initialize the payment sheet
      const { error } = await stripe.initPaymentSheet({
        merchantDisplayName: 'Ishkul',
        customerId: params.customer,
        customerEphemeralKeySecret: params.ephemeralKey,
        paymentIntentClientSecret: params.paymentIntent,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: '',
        },
        // Enable Apple Pay / Google Pay
        applePay: {
          merchantCountryCode: 'US',
        },
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: __DEV__,
        },
      });

      if (error) {
        console.error('Error initializing payment sheet:', error);
        return { initialized: false, error: error.message };
      }

      return { initialized: true };
    } catch (error) {
      console.error('Error fetching payment sheet params:', error);
      return {
        initialized: false,
        error: error instanceof Error ? error.message : 'Failed to initialize payment',
      };
    }
  },

  /**
   * Present the native payment sheet
   */
  async presentPaymentSheet(): Promise<PaymentResult> {
    const stripe = await getStripeModule();
    if (!stripe) {
      return { success: false, error: 'Stripe not available on this platform' };
    }

    try {
      const { error } = await stripe.presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          return { success: false, error: 'Payment canceled' };
        }
        console.error('Payment sheet error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error presenting payment sheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  },

  /**
   * Check if native payment sheet is available
   */
  isNativePaymentAvailable(): boolean {
    return Platform.OS !== 'web';
  },

  /**
   * Full payment flow: initialize and present payment sheet
   */
  async processPayment(): Promise<PaymentResult> {
    // Initialize payment sheet
    const initResult = await this.initPaymentSheet();
    if (!initResult.initialized) {
      return { success: false, error: initResult.error };
    }

    // Present payment sheet
    return this.presentPaymentSheet();
  },
};
