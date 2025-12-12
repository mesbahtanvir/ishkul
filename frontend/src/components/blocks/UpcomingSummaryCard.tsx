/**
 * UpcomingSummaryCard - Shows a compact summary of upcoming blocks
 *
 * Instead of showing each locked block individually, this displays
 * a single card summarizing what's coming next in the lesson.
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
      elevation="sm"
      padding="md"
      style={{ ...styles.card, borderColor: colors.border }}
    >
      <View style={styles.header}>
        <Text style={[styles.headerIcon]}>📋</Text>
        <Text style={[styles.headerTitle, { color: colors.text.secondary }]}>
          Coming Up
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.text.tertiary + '20' }]}>
          <Text style={[styles.countText, { color: colors.text.tertiary }]}>
            {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
          </Text>
        </View>
      </View>

      <View style={styles.typeList}>
        {typeEntries.map(([type, count]) => (
          <View
            key={type}
            style={[styles.typeItem, { backgroundColor: colors.background.secondary }]}
          >
            <Text style={styles.typeIcon}>{getBlockIcon(type)}</Text>
            <Text style={[styles.typeLabel, { color: colors.text.secondary }]}>
              {count} {getBlockLabel(type)}
              {count > 1 ? 's' : ''}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: colors.text.tertiary }]}>
        Complete the current block to continue
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  headerTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.full,
  },
  countText: {
    ...Typography.label.small,
    fontWeight: '500',
  },
  typeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    ...Typography.label.small,
  },
  hint: {
    ...Typography.body.small,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UpcomingSummaryCard;
