import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Button } from './Button';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface UpgradeModalProps {
  onDismiss?: () => void;
  onUpgradeSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onDismiss, onUpgradeSuccess }) => {
  const { colors } = useTheme();
  const {
    showUpgradeModal,
    upgradeModalReason,
    hideUpgradePrompt,
    startCheckout,
    loading,
    limits,
  } = useSubscriptionStore();

  const handleDismiss = () => {
    hideUpgradePrompt();
    onDismiss?.();
  };

  const handleUpgrade = async () => {
    const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://ishkul.org';
    const sessionId = await startCheckout(
      `${baseUrl}/subscription/success`,
      `${baseUrl}/subscription/cancel`
    );
    if (sessionId) {
      hideUpgradePrompt();
      onUpgradeSuccess?.();
    }
  };

  // Get title and message based on reason
  const getContent = () => {
    switch (upgradeModalReason) {
      case 'path_limit':
        return {
          title: 'Learning Path Limit Reached',
          message: `You've reached the free limit of ${limits?.activePaths.limit || 2} active learning paths. Upgrade to Pro for up to 5 active paths.`,
          features: [
            '5 active learning paths',
            '1,000 steps per day',
            'GPT-5 Pro AI model',
          ],
        };
      case 'step_limit':
        return {
          title: 'Daily Step Limit Reached',
          message: `You've used all ${limits?.dailySteps.limit || 100} steps for today. Upgrade to Pro for up to 1,000 steps per day.`,
          features: [
            '1,000 steps per day',
            'Priority generation',
            'GPT-5 Pro AI model',
          ],
        };
      default:
        return {
          title: 'Upgrade to Pro',
          message: 'Unlock the full power of Ishkul with a Pro subscription.',
          features: [
            '5 active learning paths',
            '1,000 steps per day',
            'GPT-5 Pro AI model',
            'Priority generation',
          ],
        };
    }
  };

  const content = getContent();

  return (
    <Modal
      visible={showUpgradeModal}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modal, { backgroundColor: colors.card.default }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Rocket Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.icon}>🚀</Text>
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>
            {content.title}
          </Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {content.message}
          </Text>

          {/* Feature List */}
          <View style={styles.featureList}>
            {content.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={[styles.checkmark, { color: colors.primary }]}>{'\u2713'}</Text>
                <Text style={[styles.featureText, { color: colors.text.primary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text.primary }]}>$2</Text>
            <Text style={[styles.period, { color: colors.text.secondary }]}>/month</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Upgrade Now"
              onPress={handleUpgrade}
              loading={loading}
              style={styles.upgradeButton}
            />
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.dismissButton}
              disabled={loading}
            >
              <Text style={[styles.dismissText, { color: colors.text.tertiary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: Spacing.sm,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    ...Typography.body.medium,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.lg,
  },
  price: {
    ...Typography.display.medium,
    fontWeight: '700',
  },
  period: {
    ...Typography.body.large,
    marginLeft: Spacing.xs,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  upgradeButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  dismissButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  dismissText: {
    ...Typography.body.medium,
  },
});
