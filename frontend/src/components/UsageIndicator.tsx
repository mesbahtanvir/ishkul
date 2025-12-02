import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UsageIndicatorProps {
  /** Compact mode shows only the progress bar */
  compact?: boolean;
  /** Show upgrade button for free users */
  showUpgrade?: boolean;
}

/**
 * UsageIndicator - Shows current usage status for steps and paths.
 * Displays a subtle indicator that turns amber when approaching limits.
 */
export const UsageIndicator: React.FC<UsageIndicatorProps> = ({
  compact = false,
  showUpgrade = true,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { tier, limits, canGenerateSteps } = useSubscriptionStore();

  if (!limits) {
    return null;
  }

  const isPro = tier === 'pro';
  const { dailySteps } = limits;
  const usagePercent = Math.min(100, (dailySteps.used / dailySteps.limit) * 100);

  // Color based on usage level
  const getProgressColor = () => {
    if (usagePercent >= 90) return colors.danger;
    if (usagePercent >= 70) return colors.ios.orange;
    return colors.primary;
  };

  const getStatusText = () => {
    if (!canGenerateSteps) {
      return isPro ? 'Daily limit reached' : 'Upgrade for more steps';
    }
    if (usagePercent >= 90) {
      return `${dailySteps.limit - dailySteps.used} steps left today`;
    }
    if (usagePercent >= 70) {
      return 'Approaching daily limit';
    }
    return null;
  };

  const statusText = getStatusText();
  const progressColor = getProgressColor();

  const handlePress = () => {
    navigation.navigate('Subscription');
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.compactContainer}>
          <View style={[styles.compactProgress, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.compactProgressFill,
                { backgroundColor: progressColor, width: `${usagePercent}%` },
              ]}
            />
          </View>
          <Text style={[styles.compactText, { color: colors.text.tertiary }]}>
            {dailySteps.used}/{dailySteps.limit}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card.default }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isPro ? '⚡' : '✨'}</Text>
          </View>
          <View style={styles.textContainer}>
            <View style={styles.mainRow}>
              <Text style={[styles.usageText, { color: colors.text.primary }]}>
                {dailySteps.used}
                <Text style={[styles.limitText, { color: colors.text.tertiary }]}>
                  /{dailySteps.limit} steps
                </Text>
              </Text>
              {isPro && (
                <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.proBadgeText, { color: colors.white }]}>PRO</Text>
                </View>
              )}
            </View>
            {statusText && (
              <Text style={[styles.statusText, { color: progressColor }]}>
                {statusText}
              </Text>
            )}
          </View>
        </View>

        {!isPro && showUpgrade && (
          <View style={[styles.upgradeButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.upgradeText, { color: colors.white }]}>Upgrade</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: progressColor, width: `${usagePercent}%` },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  limitText: {
    fontWeight: '400',
  },
  proBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.xs,
  },
  proBadgeText: {
    ...Typography.label.small,
    fontWeight: '700',
    fontSize: 10,
  },
  statusText: {
    ...Typography.label.small,
    marginTop: 2,
  },
  upgradeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
  },
  upgradeText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactProgress: {
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: Spacing.xs,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactText: {
    ...Typography.label.small,
    fontSize: 11,
  },
});
