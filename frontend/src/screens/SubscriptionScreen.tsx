import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { stripeService } from '../services/stripe';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type SubscriptionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Subscription'>;

interface SubscriptionScreenProps {
  navigation: SubscriptionScreenNavigationProp;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    tier,
    status,
    paidUntil,
    limits,
    loading,
    fetchStatus,
    startCheckout,
    startNativeCheckout,
  } = useSubscriptionStore();

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleUpgrade = async () => {
    // Use native payment sheet on mobile, Stripe Checkout on web
    if (stripeService.isNativePaymentAvailable()) {
      const result = await startNativeCheckout();
      if (result.success) {
        // Navigate to success screen
        navigation.navigate('SubscriptionSuccess');
      } else if (result.error && result.error !== 'Payment canceled') {
        Alert.alert('Payment Failed', result.error);
      }
    } else {
      // Web: Use Stripe Checkout redirect
      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/subscription/cancel`;
      await startCheckout(successUrl, cancelUrl);
    }
  };

  const handleManageSubscription = () => {
    // Navigate to in-app management screen
    navigation.navigate('ManageSubscription');
  };

  const isPro = tier === 'pro';

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Container>
      <ScreenHeader title="Subscription" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Current Plan Card */}
        {isPro && (
          <View style={[styles.currentPlanCard, { backgroundColor: colors.primary }]}>
            <View style={styles.proBadge}>
              <Text style={[styles.proBadgeText, { color: colors.primary }]}>PRO</Text>
            </View>
            <Text style={[styles.currentPlanTitle, { color: colors.white }]}>
              You're on the Pro plan!
            </Text>
            {paidUntil && (
              <Text style={[styles.currentPlanSubtitle, { color: colors.white }]}>
                {status === 'canceled'
                  ? `Access until ${formatDate(paidUntil)}`
                  : `Renews on ${formatDate(paidUntil)}`}
              </Text>
            )}
          </View>
        )}

        {/* Free Plan */}
        <View style={[styles.planCard, { backgroundColor: colors.card.default }]}>
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: colors.text.primary }]}>Free</Text>
            {!isPro && (
              <View style={[styles.currentBadge, { backgroundColor: colors.ios.gray }]}>
                <Text style={[styles.currentBadgeText, { color: colors.white }]}>Current</Text>
              </View>
            )}
          </View>
          <Text style={[styles.planPrice, { color: colors.text.primary }]}>$0</Text>
          <Text style={[styles.planPeriod, { color: colors.text.secondary }]}>forever</Text>

          <View style={styles.featureList}>
            <FeatureItem text="2 active learning paths" colors={colors} />
            <FeatureItem text="100 steps per day" colors={colors} />
            <FeatureItem text="GPT-4o-mini AI model" colors={colors} />
            <FeatureItem text="Lesson and Quiz content" colors={colors} />
          </View>
        </View>

        {/* Pro Plan */}
        <View
          style={[
            styles.planCard,
            styles.proPlanCard,
            { backgroundColor: colors.card.default, borderColor: colors.primary },
          ]}
        >
          <View style={styles.recommendedBanner}>
            <Text style={[styles.recommendedText, { color: colors.primary }]}>RECOMMENDED</Text>
          </View>

          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: colors.text.primary }]}>Pro</Text>
            {isPro && (
              <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.currentBadgeText, { color: colors.white }]}>Current</Text>
              </View>
            )}
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.planPrice, { color: colors.text.primary }]}>$2</Text>
            <Text style={[styles.planPeriod, { color: colors.text.secondary }]}>/month</Text>
          </View>

          <View style={styles.featureList}>
            <FeatureItem text="5 active learning paths" colors={colors} highlight />
            <FeatureItem text="1,000 steps per day" colors={colors} highlight />
            <FeatureItem text="GPT-5 Pro AI model" colors={colors} highlight />
            <FeatureItem text="All content types" colors={colors} />
            <FeatureItem text="Priority generation" colors={colors} />
            <FeatureItem text="Advanced insights" colors={colors} />
          </View>

          {!isPro ? (
            <Button
              title="Upgrade to Pro"
              onPress={handleUpgrade}
              loading={loading}
              style={styles.upgradeButton}
            />
          ) : (
            <Button
              title="Manage Subscription"
              onPress={handleManageSubscription}
              variant="secondary"
              loading={loading}
              style={styles.upgradeButton}
            />
          )}
        </View>

        {/* Usage Stats */}
        {limits && (
          <View style={[styles.usageCard, { backgroundColor: colors.card.default }]}>
            <Text style={[styles.usageTitle, { color: colors.text.primary }]}>Today's Usage</Text>

            <View style={styles.usageRow}>
              <Text style={[styles.usageLabel, { color: colors.text.secondary }]}>
                Steps Generated
              </Text>
              <Text style={[styles.usageValue, { color: colors.text.primary }]}>
                {limits.dailySteps.used} / {limits.dailySteps.limit}
              </Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, (limits.dailySteps.used / limits.dailySteps.limit) * 100)}%`,
                  },
                ]}
              />
            </View>

            <View style={[styles.usageRow, { marginTop: Spacing.md }]}>
              <Text style={[styles.usageLabel, { color: colors.text.secondary }]}>
                Active Paths
              </Text>
              <Text style={[styles.usageValue, { color: colors.text.primary }]}>
                {limits.activePaths.used} / {limits.activePaths.limit}
              </Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, (limits.activePaths.used / limits.activePaths.limit) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
            Subscriptions are managed through Stripe. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
};

interface FeatureItemProps {
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
  highlight?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, colors, highlight }) => (
  <View style={styles.featureItem}>
    <Text style={[styles.featureCheck, { color: highlight ? colors.primary : colors.ios.green }]}>
      {'\u2713'}
    </Text>
    <Text
      style={[
        styles.featureText,
        { color: colors.text.primary },
        highlight && styles.featureTextHighlight,
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  currentPlanCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: 'white',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
    marginBottom: Spacing.sm,
  },
  proBadgeText: {
    ...Typography.label.small,
    fontWeight: '700',
  },
  currentPlanTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.xs,
  },
  currentPlanSubtitle: {
    ...Typography.body.medium,
    opacity: 0.9,
  },
  planCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.md,
  },
  proPlanCard: {
    borderWidth: 2,
  },
  recommendedBanner: {
    position: 'absolute',
    top: -1,
    right: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  recommendedText: {
    ...Typography.label.small,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planName: {
    ...Typography.heading.h3,
    marginRight: Spacing.sm,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.sm,
  },
  currentBadgeText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  planPrice: {
    ...Typography.display.large,
    fontWeight: '700',
  },
  planPeriod: {
    ...Typography.body.medium,
    marginLeft: Spacing.xs,
  },
  featureList: {
    marginTop: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureCheck: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: Spacing.sm,
    width: 20,
  },
  featureText: {
    ...Typography.body.medium,
    flex: 1,
  },
  featureTextHighlight: {
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: Spacing.md,
  },
  usageCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginTop: Spacing.md,
  },
  usageTitle: {
    ...Typography.heading.h4,
    marginBottom: Spacing.md,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  usageLabel: {
    ...Typography.body.medium,
  },
  usageValue: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    ...Typography.label.small,
    textAlign: 'center',
  },
});
