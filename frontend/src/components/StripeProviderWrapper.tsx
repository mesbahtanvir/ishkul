import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

// Stripe publishable key from environment or constants
const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

/**
 * Wrapper component that provides Stripe context on mobile platforms.
 * On web, it just renders children directly since we use Stripe Checkout redirect.
 */
export const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({ children }) => {
  // On web, just render children directly (we use Stripe Checkout redirect)
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  // On mobile, wrap with StripeProvider
  // Dynamic import to avoid loading Stripe on web
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [StripeProvider, setStripeProvider] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    const loadStripe = async () => {
      try {
        const stripeModule = await import('@stripe/stripe-react-native');
        setStripeProvider(() => stripeModule.StripeProvider as React.ComponentType<any>);
      } catch (error) {
        console.warn('Failed to load Stripe Provider:', error);
      }
    };
    loadStripe();
  }, []);

  // While loading Stripe, render children without provider
  if (!StripeProvider) {
    return <>{children}</>;
  }

  // If no publishable key, warn and render without provider
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured. Native payments will not work.');
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.org.ishkul"
    >
      {children}
    </StripeProvider>
  );
};
