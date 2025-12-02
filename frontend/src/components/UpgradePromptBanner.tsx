import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type PromptType =
  | 'approaching_limit'      // 70-89% usage
  | 'near_limit'            // 90%+ usage
  | 'limit_reached'         // 100% usage
  | 'milestone'             // After completing X steps
  | 'path_limit'            // Approaching path limit
  | 'trial_available';      // New user can start trial

interface UpgradePromptBannerProps {
  type: PromptType;
  stepsRemaining?: number;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

const PROMPT_CONFIG: Record<PromptType, {
  icon: string;
  title: string;
  message: (stepsRemaining?: number) => string;
  buttonText: string;
  urgency: 'low' | 'medium' | 'high';
}> = {
  approaching_limit: {
    icon: '💡',
    title: 'Keep the momentum!',
    message: (remaining) => `${remaining} steps left today. Pro users get 1,000/day.`,
    buttonText: 'See Pro',
    urgency: 'low',
  },
  near_limit: {
    icon: '⏰',
    title: 'Almost at your limit',
    message: (remaining) => `Only ${remaining} steps left. Upgrade to continue learning.`,
    buttonText: 'Upgrade',
    urgency: 'medium',
  },
  limit_reached: {
    icon: '🔒',
    title: 'Daily limit reached',
    message: () => 'Upgrade to Pro for 1,000 steps per day.',
    buttonText: 'Upgrade Now',
    urgency: 'high',
  },
  milestone: {
    icon: '🎉',
    title: "You're on fire!",
    message: () => 'Unlock unlimited learning with Pro.',
    buttonText: 'Try Pro',
    urgency: 'low',
  },
  path_limit: {
    icon: '📚',
    title: 'Want to learn more?',
    message: () => 'Pro users can have 5 active learning paths.',
    buttonText: 'Upgrade',
    urgency: 'medium',
  },
  trial_available: {
    icon: '🎁',
    title: 'Try Pro free for 7 days',
    message: () => 'Experience unlimited learning. Cancel anytime.',
    buttonText: 'Start Trial',
    urgency: 'low',
  },
};

export const UpgradePromptBanner: React.FC<UpgradePromptBannerProps> = ({
  type,
  stepsRemaining,
  onDismiss,
  onUpgrade,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const config = PROMPT_CONFIG[type];

  const getBackgroundColor = () => {
    switch (config.urgency) {
      case 'high':
        return colors.danger + '15';
      case 'medium':
        return colors.ios.orange + '15';
      default:
        return colors.primary + '10';
    }
  };

  const getAccentColor = () => {
    switch (config.urgency) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.ios.orange;
      default:
        return colors.primary;
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigation.navigate('Subscription');
    }
  };

  const accentColor = getAccentColor();

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {config.title}
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {config.message(stepsRemaining)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: accentColor }]}
          onPress={handleUpgrade}
          activeOpacity={0.7}
        >
          <Text style={[styles.upgradeText, { color: colors.white }]}>
            {config.buttonText}
          </Text>
        </TouchableOpacity>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={[styles.dismissText, { color: colors.text.tertiary }]}>
              Later
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    ...Typography.body.small,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.sm,
  },
  upgradeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  dismissButton: {
    marginLeft: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  dismissText: {
    ...Typography.label.small,
  },
});
