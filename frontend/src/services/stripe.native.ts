/**
 * Stripe payment service - Native implementation
 * Uses native payment sheet on iOS/Android via @stripe/stripe-react-native.
 */

import { apiClient } from './api/client';
import { PaymentSheetParams } from '../types/app';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

export interface PaymentResult {
  success: boolean;
  error?: string;
  subscriptionId?: string;
}

export const stripeService = {
  /**
   * Initialize the Stripe payment sheet with subscription parameters
   */
  async initPaymentSheet(): Promise<{ initialized: boolean; error?: string }> {
    try {
      // Fetch payment sheet parameters from backend
      const params = await apiClient.post<PaymentSheetParams>('/subscription/payment-sheet', {});

      // Initialize the payment sheet
      const { error } = await initPaymentSheet({
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
    try {
      const { error } = await presentPaymentSheet();

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
    return true;
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
