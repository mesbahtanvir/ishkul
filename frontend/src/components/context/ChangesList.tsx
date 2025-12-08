/**
 * ChangesList Component
 *
 * Displays a list of detected context changes with confirmation actions.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// =============================================================================
// Types
// =============================================================================

export interface ContextChange {
  type: 'added' | 'updated' | 'removed';
  description: string;
}

interface ChangesListProps {
  changes: ContextChange[];
  onApply: () => void;
  onCancel: () => void;
  applyDisabled?: boolean;
}

interface ChangeItemProps {
  change: ContextChange;
}

// =============================================================================
// ChangeItem Component
// =============================================================================

const ChangeItem: React.FC<ChangeItemProps> = ({ change }) => {
  const { colors } = useTheme();

  const iconConfig = {
    added: { icon: 'add-circle' as const, color: colors.success },
    updated: { icon: 'create' as const, color: colors.primary },
    removed: { icon: 'remove-circle' as const, color: colors.danger },
  };

  const { icon, color } = iconConfig[change.type];

  return (
    <View style={[styles.changeItem, { backgroundColor: colors.background.tertiary }]}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.changeContent}>
        <Text style={[styles.changeType, { color }]}>
          {change.type.toUpperCase()}
        </Text>
        <Text style={[styles.changeDescription, { color: colors.text.primary }]}>
          {change.description}
        </Text>
      </View>
    </View>
  );
};

// =============================================================================
// ChangesList Component
// =============================================================================

export const ChangesList: React.FC<ChangesListProps> = ({
  changes,
  onApply,
  onCancel,
  applyDisabled = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card.default }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Changes Detected
      </Text>

      <View style={styles.changesList}>
        {changes.length > 0 ? (
          changes.map((change, index) => (
            <ChangeItem key={`change-${index}`} change={change} />
          ))
        ) : (
          <Text style={[styles.noChanges, { color: colors.text.secondary }]}>
            No changes detected from your input.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="outline"
            size="medium"
          />
        </View>
        <View style={styles.actionButton}>
          <Button
            title="Apply Changes"
            onPress={onApply}
            disabled={applyDisabled || changes.length === 0}
            size="medium"
          />
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  changesList: {
    marginBottom: Spacing.md,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  changeContent: {
    flex: 1,
  },
  changeType: {
    ...Typography.label.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeDescription: {
    ...Typography.body.medium,
  },
  noChanges: {
    ...Typography.body.medium,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
