import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

/**
 * PastDueBanner - Shows a warning banner when subscription payment has failed.
 * This component should be rendered at the top level of the app to appear on all screens.
 */
export const PastDueBanner: React.FC = () => {
  const { colors } = useTheme();
  const { status, openPortal, loading } = useSubscriptionStore();

  // Only show banner if subscription is past due
  if (status !== 'past_due') {
    return null;
  }

  const handleUpdatePayment = async () => {
    await openPortal();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.ios.orange }]}>
      <View style={styles.content}>
        <Text style={[styles.icon]}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.white }]}>
            Payment Failed
          </Text>
          <Text style={[styles.message, { color: colors.white }]}>
            Update your payment method to keep Pro features.
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleUpdatePayment}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.white }]}
        >
          <Text style={[styles.buttonText, { color: colors.ios.orange }]}>
            {loading ? 'Loading...' : 'Update'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  message: {
    ...Typography.body.small,
    opacity: 0.9,
  },
  button: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
    marginLeft: Spacing.sm,
  },
  buttonText: {
    ...Typography.label.small,
    fontWeight: '700',
  },
});
