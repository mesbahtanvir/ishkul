/**
 * LessonBlockCard - Modern block wrapper with status-based styling
 *
 * Renders a block with visual states:
 * - completed: subtle success indicator, clean checkmark
 * - active: gradient accent, prominent shadow
 * - upcoming: dimmed, minimal preview
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

export const LessonBlockCard: React.FC<LessonBlockCardProps> = ({
  block,
  status,
  isGenerating = false,
  onAnswer,
  onComplete,
  onGenerateContent,
}) => {
  const { colors } = useTheme();

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
          borderColor: colors.success + '40',
          borderWidth: 1,
        };
      case 'active':
        return {
          ...baseStyle,
          borderColor: colors.primary,
          borderWidth: 2,
          ...Platform.select({
            web: {
              boxShadow: `0 8px 32px ${colors.primary}20, 0 2px 8px rgba(0,0,0,0.08)`,
            },
            default: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 12,
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

  // For upcoming blocks, show a locked preview (shouldn't happen with new summary card)
  if (isLocked && block.contentStatus === 'ready') {
    return (
      <Card elevation="sm" padding="md" style={getCardStyle()}>
        <View style={styles.lockedContent}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={[styles.lockedTitle, { color: colors.text.secondary }]}>
            {block.title ||
              `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block`}
          </Text>
          <Text style={[styles.lockedHint, { color: colors.text.tertiary }]}>
            Complete previous blocks to unlock
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Active indicator bar */}
      {status === 'active' && (
        <View
          style={[styles.activeIndicator, { backgroundColor: colors.primary }]}
        />
      )}

      {/* Completed indicator bar */}
      {status === 'completed' && (
        <View
          style={[
            styles.completedIndicator,
            { backgroundColor: colors.success },
          ]}
        />
      )}

      <Card
        elevation={status === 'active' ? 'lg' : 'sm'}
        padding="lg"
        style={getCardStyle()}
      >
        {/* Status header */}
        <View style={styles.statusHeader}>
          {status === 'completed' && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.success + '15' },
              ]}
            >
              <View
                style={[
                  styles.checkCircle,
                  { backgroundColor: colors.success },
                ]}
              >
                <Text style={styles.checkIcon}>✓</Text>
              </View>
              <Text style={[styles.statusText, { color: colors.success }]}>
                Completed
              </Text>
            </View>
          )}
          {status === 'active' && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.primary + '15' },
              ]}
            >
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>
                In Progress
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
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Spacing.borderRadius.xl,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderRadius: 2,
    zIndex: 10,
  },
  completedIndicator: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderRadius: 2,
    zIndex: 10,
    opacity: 0.5,
  },
  statusHeader: {
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.borderRadius.full,
    gap: Spacing.xs,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  completedContent: {
    opacity: 0.85,
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    opacity: 0.4,
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
