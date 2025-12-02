import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/components/ThemeProvider';
import { StripeProviderWrapper } from './src/components/StripeProviderWrapper';
import { useSessionTracking } from './src/services/analytics';

export default function App() {
  // Initialize analytics and track app sessions
  useSessionTracking();

  return (
    <SafeAreaProvider>
      <StripeProviderWrapper>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </StripeProviderWrapper>
    </SafeAreaProvider>
  );
}
