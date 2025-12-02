/**
 * StripeProviderWrapper - Web implementation
 * On web, we use Stripe Checkout redirect, so no provider wrapper is needed.
 *
 * Note: This file serves as both the web implementation AND the TypeScript
 * type source. The .native.tsx file provides the native implementation.
 * Metro bundler picks the right file based on platform.
 */

import React from 'react';

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

export const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({ children }) => {
  // On web, just pass through children - no Stripe context needed
  return <>{children}</>;
};
