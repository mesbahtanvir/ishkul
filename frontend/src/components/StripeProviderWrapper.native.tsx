/**
 * StripeProviderWrapper - Native implementation
 * Provides Stripe context for native payment sheet functionality.
 */

import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

// Stripe publishable key from environment or constants
const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

export const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({ children }) => {
  // If no publishable key, render without provider
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured. Native payments will not work.');
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.org.ishkul"
    >
      <>{children}</>
    </StripeProvider>
  );
};
