import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { CancellationFlow, CancellationReason } from '../components/CancellationFlow';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { apiClient } from '../services/api/client';

type ManageSubscriptionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ManageSubscription'
>;

interface ManageSubscriptionScreenProps {
  navigation: ManageSubscriptionScreenNavigationProp;
}

export const ManageSubscriptionScreen: React.FC<ManageSubscriptionScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const {
    tier,
    status,
    paidUntil,
    loading,
    fetchStatus,
    openPortal,
  } = useSubscriptionStore();

  const [canceling, setCanceling] = useState(false);
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isPro = tier === 'pro';
  const isCanceled = status === 'canceled';

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleUpdatePayment = async () => {
    await openPortal();
  };

  const handleCancelSubscription = () => {
    setShowCancellationFlow(true);
  };

  const handleCancelConfirm = async (reason: CancellationReason, feedback?: string) => {
    setCanceling(true);
    try {
      await apiClient.post('/subscription/cancel', { reason, feedback });
      await fetchStatus();
      setShowCancellationFlow(false);

      Alert.alert(
        'Subscription Canceled',
        `Your Pro features will remain active until ${formatDate(paidUntil)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      Alert.alert(
        'Error',
        'Failed to cancel subscription. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setCanceling(false);
    }
  };

  const handleAcceptOffer = async (offerType: 'discount' | 'pause') => {
    setCanceling(true);
    try {
      if (offerType === 'discount') {
        // Apply discount coupon via backend
        await apiClient.post('/subscription/apply-retention-offer', { offerType: 'discount' });
        await fetchStatus();
        setShowCancellationFlow(false);
        Alert.alert(
          'Offer Applied!',
          'You now have 50% off for the next 2 months. Thank you for staying with us!',
          [{ text: 'Great!' }]
        );
      } else if (offerType === 'pause') {
        // Pause subscription
        await apiClient.post('/subscription/pause', { months: 1 });
        await fetchStatus();
        setShowCancellationFlow(false);
        Alert.alert(
          'Subscription Paused',
          'Your subscription has been paused for 1 month. You can resume anytime.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Failed to apply offer:', error);
      Alert.alert(
        'Error',
        'Failed to apply offer. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    // For reactivation, send to Stripe portal
    await openPortal();
  };

  if (!isPro) {
    return (
      <Container>
        <ScreenHeader title="Manage Subscription" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            No Active Subscription
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            Upgrade to Pro to access premium features.
          </Text>
          <Button
            title="View Plans"
            onPress={() => navigation.navigate('Subscription')}
            style={styles.viewPlansButton}
          />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScreenHeader title="Manage Subscription" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Subscription Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card.default }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.proBadgeText, { color: colors.white }]}>PRO</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCanceled ? colors.ios.orange : colors.ios.green,
                },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: colors.white }]}>
                {isCanceled ? 'Canceling' : 'Active'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Plan</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              Pro ($2/month)
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
              {isCanceled ? 'Access Until' : 'Next Billing Date'}
            </Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {formatDate(paidUntil)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Status</Text>
            <Text
              style={[
                styles.detailValue,
                { color: isCanceled ? colors.ios.orange : colors.ios.green },
              ]}
            >
              {isCanceled ? 'Cancels at period end' : 'Auto-renews'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {(
          <View style={styles.actionsSection}>
            <Button
              title="Update Payment Method"
              onPress={handleUpdatePayment}
              variant="secondary"
              loading={loading}
              style={styles.actionButton}
            />

            {isCanceled ? (
              <Button
                title="Reactivate Subscription"
                onPress={handleReactivate}
                loading={loading}
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Cancel Subscription"
                onPress={handleCancelSubscription}
                variant="secondary"
                style={StyleSheet.flatten([styles.actionButton, styles.cancelActionButton])}
                textStyle={{ color: '#EF4444' }}
              />
            )}
          </View>
        )}

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
          <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
            Need Help?
          </Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            For billing questions or issues with your subscription, contact us at
            support@ishkul.org
          </Text>
        </View>
      </ScrollView>

      {/* Cancellation Flow Modal */}
      <CancellationFlow
        visible={showCancellationFlow}
        paidUntil={paidUntil}
        onCancel={handleCancelConfirm}
        onKeep={() => setShowCancellationFlow(false)}
        onAcceptOffer={handleAcceptOffer}
        loading={canceling}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  viewPlansButton: {
    minWidth: 150,
  },
  statusCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  proBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
    marginRight: Spacing.sm,
  },
  proBadgeText: {
    ...Typography.label.small,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
  },
  statusBadgeText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    ...Typography.body.medium,
  },
  detailValue: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  cancelConfirmCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  cancelConfirmTitle: {
    ...Typography.heading.h4,
    marginBottom: Spacing.sm,
  },
  cancelConfirmText: {
    ...Typography.body.medium,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  cancelConfirmButtons: {
    gap: Spacing.sm,
  },
  keepButton: {
    marginBottom: Spacing.sm,
  },
  cancelButton: {},
  actionsSection: {
    marginBottom: Spacing.lg,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
  cancelActionButton: {
    borderColor: 'transparent',
  },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
  },
  infoTitle: {
    ...Typography.heading.h4,
    marginBottom: Spacing.sm,
  },
  infoText: {
    ...Typography.body.small,
    lineHeight: 20,
  },
});
