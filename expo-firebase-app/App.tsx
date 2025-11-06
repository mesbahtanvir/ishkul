import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <PaperProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </PaperProvider>
  );
}
