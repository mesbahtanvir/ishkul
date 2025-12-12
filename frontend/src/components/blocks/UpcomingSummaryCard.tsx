/**
 * UpcomingSummaryCard - Modern compact summary of upcoming blocks
 *
 * Shows a clean, minimal preview of what's coming next in the lesson.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Block, BlockType } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Card } from '../Card';

interface UpcomingSummaryCardProps {
  blocks: Block[];
}

/**
 * Get icon for block type
 */
const getBlockIcon = (type: BlockType): string => {
  switch (type) {
    case 'text':
      return '📖';
    case 'code':
      return '💻';
    case 'question':
      return '❓';
    case 'task':
      return '✅';
    case 'flashcard':
      return '🃏';
    case 'summary':
      return '📝';
    default:
      return '📄';
  }
};

/**
 * Get label for block type
 */
const getBlockLabel = (type: BlockType): string => {
  switch (type) {
    case 'text':
      return 'Learn';
    case 'code':
      return 'Code';
    case 'question':
      return 'Quiz';
    case 'task':
      return 'Practice';
    case 'flashcard':
      return 'Flashcard';
    case 'summary':
      return 'Summary';
    default:
      return 'Content';
  }
};

export const UpcomingSummaryCard: React.FC<UpcomingSummaryCardProps> = ({
  blocks,
}) => {
  const { colors } = useTheme();

  if (blocks.length === 0) {
    return null;
  }

  // Count blocks by type
  const typeCounts = blocks.reduce(
    (acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    },
    {} as Record<BlockType, number>
  );

  const typeEntries = Object.entries(typeCounts) as [BlockType, number][];

  return (
    <Card
      elevation="none"
      padding="md"
      style={{
        ...styles.card,
        backgroundColor: colors.background.secondary,
        borderColor: colors.border,
      }}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: colors.text.tertiary + '15' }]}>
            <Text style={styles.headerIcon}>→</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text.secondary }]}>
            Up Next
          </Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.background.tertiary }]}>
          <Text style={[styles.countText, { color: colors.text.tertiary }]}>
            {blocks.length} more
          </Text>
        </View>
      </View>

      {/* Type chips row */}
      <View style={styles.chipRow}>
        {typeEntries.map(([type, count]) => (
          <View
            key={type}
            style={[styles.chip, { backgroundColor: colors.background.tertiary }]}
          >
            <Text style={styles.chipIcon}>{getBlockIcon(type)}</Text>
            <Text style={[styles.chipLabel, { color: colors.text.secondary }]}>
              {count}× {getBlockLabel(type)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Spacing.borderRadius.full,
  },
  countText: {
    ...Typography.label.small,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    gap: 4,
  },
  chipIcon: {
    fontSize: 12,
  },
  chipLabel: {
    ...Typography.label.small,
    fontWeight: '500',
  },
});

export default UpcomingSummaryCard;
