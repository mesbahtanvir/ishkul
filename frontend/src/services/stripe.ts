/**
 * Stripe payment service - Web implementation
 * On web, native payment sheet is not available. Uses Stripe Checkout redirect instead.
 *
 * Note: This file serves as both the web implementation AND the TypeScript
 * type source. The .native.ts file provides the native implementation.
 * Metro bundler picks the right file based on platform.
 */

export interface PaymentResult {
  success: boolean;
  error?: string;
  subscriptionId?: string;
}

export const stripeService = {
  /**
   * Initialize the Stripe payment sheet with subscription parameters
   * Not available on web - use Stripe Checkout redirect instead
   */
  async initPaymentSheet(): Promise<{ initialized: boolean; error?: string }> {
    return { initialized: false, error: 'Native payment sheet not available on web' };
  },

  /**
   * Present the native payment sheet
   * Not available on web - use Stripe Checkout redirect instead
   */
  async presentPaymentSheet(): Promise<PaymentResult> {
    return { success: false, error: 'Native payment sheet not available on web' };
  },

  /**
   * Check if native payment sheet is available
   */
  isNativePaymentAvailable(): boolean {
    return false;
  },

  /**
   * Full payment flow: initialize and present payment sheet
   * Not available on web - use Stripe Checkout redirect instead
   */
  async processPayment(): Promise<PaymentResult> {
    return { success: false, error: 'Native payment sheet not available on web' };
  },
};
