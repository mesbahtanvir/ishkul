import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export type CancellationReason =
  | 'too_expensive'
  | 'not_using_enough'
  | 'missing_features'
  | 'technical_issues'
  | 'found_alternative'
  | 'other';

interface CancellationFlowProps {
  visible: boolean;
  paidUntil: Date | null;
  onCancel: (reason: CancellationReason, feedback?: string) => Promise<void>;
  onKeep: () => void;
  loading?: boolean;
}

type Step = 'reason' | 'confirm';

const REASONS: { value: CancellationReason; label: string; icon: string }[] = [
  { value: 'too_expensive', label: 'Too expensive', icon: '💰' },
  { value: 'not_using_enough', label: 'Not using it enough', icon: '📉' },
  { value: 'missing_features', label: 'Missing features I need', icon: '🔧' },
  { value: 'technical_issues', label: 'Technical issues', icon: '🐛' },
  { value: 'found_alternative', label: 'Found an alternative', icon: '🔄' },
  { value: 'other', label: 'Other reason', icon: '💭' },
];

export const CancellationFlow: React.FC<CancellationFlowProps> = ({
  visible,
  paidUntil,
  onCancel,
  onKeep,
  loading = false,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('reason');
  const [selectedReason, setSelectedReason] = useState<CancellationReason | null>(null);
  const [feedback, setFeedback] = useState('');

  const formatDate = (date: Date | null) => {
    if (!date) return 'your billing date';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleReasonSelect = (reason: CancellationReason) => {
    setSelectedReason(reason);
  };

  const handleContinue = () => {
    if (selectedReason) {
      setStep('confirm');
    }
  };

  const handleConfirmCancel = async () => {
    if (selectedReason) {
      await onCancel(selectedReason, feedback);
    }
  };

  const handleClose = () => {
    setStep('reason');
    setSelectedReason(null);
    setFeedback('');
    onKeep();
  };

  const renderReasonStep = () => (
    <>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        We're sorry to see you go
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        Help us improve by sharing why you're canceling:
      </Text>

      <View style={styles.reasonList}>
        {REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.value}
            style={[
              styles.reasonItem,
              { backgroundColor: colors.card.default },
              selectedReason === reason.value && {
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => handleReasonSelect(reason.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.reasonIcon}>{reason.icon}</Text>
            <Text style={[styles.reasonLabel, { color: colors.text.primary }]}>
              {reason.label}
            </Text>
            <View
              style={[
                styles.radioOuter,
                { borderColor: selectedReason === reason.value ? colors.primary : colors.border },
              ]}
            >
              {selectedReason === reason.value && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedReason}
          style={styles.button}
        />
        <TouchableOpacity onPress={handleClose} style={styles.keepButton}>
          <Text style={[styles.keepText, { color: colors.primary }]}>
            Keep my subscription
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <View style={[styles.warningIcon, { backgroundColor: colors.ios.orange + '20' }]}>
        <Text style={styles.warningIconText}>⚠️</Text>
      </View>

      <Text style={[styles.title, { color: colors.text.primary }]}>
        Confirm cancellation
      </Text>
      <Text style={[styles.confirmDescription, { color: colors.text.secondary }]}>
        Your Pro features will remain active until{' '}
        <Text style={{ fontWeight: '600' }}>{formatDate(paidUntil)}</Text>.
        After that, your account will revert to the Free plan.
      </Text>

      <View style={[styles.infoBox, { backgroundColor: colors.card.default }]}>
        <Text style={[styles.infoTitle, { color: colors.text.primary }]}>
          What you'll lose:
        </Text>
        <View style={styles.infoItem}>
          <Text style={[styles.infoIcon, { color: colors.danger }]}>✕</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            1,000 daily steps → 100 steps
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoIcon, { color: colors.danger }]}>✕</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            5 active paths → 2 paths
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoIcon, { color: colors.danger }]}>✕</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            GPT-5 Pro → GPT-4o-mini
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Keep Pro"
          onPress={handleClose}
          style={styles.button}
        />
        <TouchableOpacity
          onPress={handleConfirmCancel}
          style={styles.cancelButton}
          disabled={loading}
        >
          <Text style={[styles.cancelText, { color: colors.danger }]}>
            {loading ? 'Canceling...' : 'Cancel subscription'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {step === 'reason' && renderReasonStep()}
            {step === 'confirm' && renderConfirmStep()}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '90%',
    borderRadius: Spacing.borderRadius.xl,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  title: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  reasonList: {
    marginBottom: Spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  reasonLabel: {
    ...Typography.body.medium,
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  buttonRow: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  keepButton: {
    paddingVertical: Spacing.sm,
  },
  keepText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  warningIconText: {
    fontSize: 32,
  },
  confirmDescription: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  infoBox: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
    width: 20,
  },
  infoText: {
    ...Typography.body.small,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
});
