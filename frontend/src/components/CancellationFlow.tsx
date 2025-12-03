import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface CancellationFlowProps {
  visible: boolean;
  paidUntil: Date | null;
  onCancel: () => Promise<void>;
  onKeep: () => void;
  loading?: boolean;
}

/**
 * Simple cancellation confirmation dialog.
 */
export const CancellationFlow: React.FC<CancellationFlowProps> = ({
  visible,
  paidUntil,
  onCancel,
  onKeep,
  loading = false,
}) => {
  const { colors } = useTheme();

  const formatDate = (date: Date | null) => {
    if (!date) return 'your billing date';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeep}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Cancel subscription?
          </Text>

          <Text style={[styles.description, { color: colors.text.secondary }]}>
            Your Pro features will remain active until{' '}
            <Text style={{ fontWeight: '600' }}>{formatDate(paidUntil)}</Text>.
            After that, your account will revert to the Free plan.
          </Text>

          <View style={styles.buttonRow}>
            <Button
              title="Keep Pro"
              onPress={onKeep}
              style={styles.keepButton}
            />
            <TouchableOpacity
              onPress={onCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: colors.danger }]}>
                {loading ? 'Canceling...' : 'Cancel subscription'}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 340,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.xl,
  },
  title: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  buttonRow: {
    alignItems: 'center',
  },
  keepButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
});
