/**
 * LessonBlockCard - Block wrapper with status-based styling
 *
 * Renders a block with visual states:
 * - completed: checkmark badge, reduced opacity, green accent
 * - active: highlighted border, full opacity, primary accent
 * - upcoming: dimmed, locked indicator
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Block } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Card } from '../Card';
import { BlockRenderer } from './BlockRenderer';
import { BlockStatus } from './ScrollableLessonBlocks';

interface LessonBlockCardProps {
  block: Block;
  status: BlockStatus;
  isGenerating?: boolean;
  onAnswer?: (answer: string | string[]) => void;
  onComplete?: () => void;
  onGenerateContent?: () => void;
}

/**
 * Get status badge configuration
 */
const getStatusBadge = (
  status: BlockStatus,
  colors: ReturnType<typeof useTheme>['colors']
): { icon: string; label: string; color: string } | null => {
  switch (status) {
    case 'completed':
      return {
        icon: '✓',
        label: 'Done',
        color: colors.success,
      };
    case 'active':
      return {
        icon: '●',
        label: 'Active',
        color: colors.primary,
      };
    case 'upcoming':
      return {
        icon: '○',
        label: 'Upcoming',
        color: colors.text.tertiary,
      };
    default:
      return null;
  }
};

export const LessonBlockCard: React.FC<LessonBlockCardProps> = ({
  block,
  status,
  isGenerating = false,
  onAnswer,
  onComplete,
  onGenerateContent,
}) => {
  const { colors } = useTheme();
  const statusBadge = getStatusBadge(status, colors);

  // Determine if block content should be interactive
  const isInteractive = status === 'active';
  const isLocked = status === 'upcoming';

  // Card styling based on status
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.card,
    };

    switch (status) {
      case 'completed':
        return {
          ...baseStyle,
          borderColor: colors.success,
          borderWidth: 1,
          opacity: 0.85,
        };
      case 'active':
        return {
          ...baseStyle,
          borderColor: colors.primary,
          borderWidth: 2,
          ...Platform.select({
            web: {
              boxShadow: `0 4px 12px ${colors.primary}25`,
            },
            default: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 8,
            },
          }),
        };
      case 'upcoming':
        return {
          ...baseStyle,
          borderColor: colors.border,
          borderWidth: 1,
          opacity: 0.6,
        };
      default:
        return baseStyle;
    }
  };

  // For upcoming blocks, show a locked preview
  if (isLocked && block.contentStatus === 'ready') {
    return (
      <Card
        elevation="sm"
        padding="md"
        style={getCardStyle()}
      >
        {/* Status badge */}
        <View style={styles.statusHeader}>
          {statusBadge && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusBadge.color}15` },
              ]}
            >
              <Text style={[styles.statusIcon, { color: statusBadge.color }]}>
                {statusBadge.icon}
              </Text>
              <Text style={[styles.statusLabel, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          )}
        </View>

        {/* Locked preview */}
        <View style={styles.lockedContent}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={[styles.lockedTitle, { color: colors.text.secondary }]}>
            {block.title || `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
          </Text>
          <Text style={[styles.lockedHint, { color: colors.text.tertiary }]}>
            Complete previous blocks to unlock
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card
      elevation={status === 'active' ? 'lg' : 'md'}
      padding="lg"
      style={getCardStyle()}
    >
      {/* Status badge in corner */}
      <View style={styles.statusHeader}>
        {statusBadge && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusBadge.color}15` },
            ]}
          >
            <Text style={[styles.statusIcon, { color: statusBadge.color }]}>
              {statusBadge.icon}
            </Text>
            <Text style={[styles.statusLabel, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        )}
      </View>

      {/* Block content */}
      <View style={status === 'completed' ? styles.completedContent : undefined}>
        <BlockRenderer
          block={block}
          onAnswer={isInteractive ? onAnswer : undefined}
          onComplete={isInteractive ? onComplete : undefined}
          onGenerateContent={onGenerateContent}
          isActive={isInteractive}
          showHeader={true}
          isGenerating={isGenerating}
        />
      </View>

      {/* Completed overlay indicator */}
      {status === 'completed' && (
        <View style={styles.completedOverlay}>
          <View
            style={[
              styles.completedCheck,
              { backgroundColor: colors.success },
            ]}
          >
            <Text style={styles.completedCheckIcon}>✓</Text>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
  },
  statusHeader: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Spacing.borderRadius.full,
    gap: 4,
  },
  statusIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusLabel: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  completedContent: {
    // Slight desaturation for completed blocks
  },
  completedOverlay: {
    position: 'absolute',
    top: -20,
    left: -20,
    zIndex: 5,
  },
  completedCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  completedCheckIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    transform: [{ rotate: '45deg' }, { translateX: 8 }, { translateY: 8 }],
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    opacity: 0.5,
  },
  lockedTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  lockedHint: {
    ...Typography.body.small,
  },
});

export default LessonBlockCard;
