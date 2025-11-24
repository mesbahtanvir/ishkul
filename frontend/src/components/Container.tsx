import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

interface ContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  scrollable = false,
  padding = 'medium',
  ...scrollViewProps
}) => {
  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return Spacing.md;
      case 'large':
        return Spacing.lg;
      default:
        return Spacing.md;
    }
  };

  const paddingValue = getPaddingValue();

  const content = (
    <View style={[styles.container, { padding: paddingValue }, style]}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: paddingValue,
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
  },
});
