/**
 * LessonBlockCard - Clean, immersive block wrapper
 *
 * Minimal design focused on content:
 * - No borders or status badges
 * - Full-width content
 * - Subtle visual distinction between states
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Block } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
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

  // For upcoming blocks, show a minimal locked preview
  if (isLocked && block.contentStatus === 'ready') {
    return (
      <View style={[styles.blockContainer, styles.lockedContainer]}>
        <View style={styles.lockedContent}>
          <Text style={[styles.lockedTitle, { color: colors.text.tertiary }]}>
            {block.title ||
              `${block.type.charAt(0).toUpperCase() + block.type.slice(1)}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.blockContainer,
        status === 'completed' && styles.completedContainer,
      ]}
    >
      {/* Clean block content - no borders, no status badges */}
      <View style={styles.contentWrapper}>
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

      {/* Subtle completed checkmark - bottom right */}
      {status === 'completed' && (
        <View style={[styles.completedCheck, { backgroundColor: colors.success }]}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Clean block container
  blockContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    position: 'relative',
  },
  completedContainer: {
    opacity: 0.7,
  },
  contentWrapper: {
    // Full width content
  },

  // Subtle completed indicator
  completedCheck: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.lg,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },

  // Locked state
  lockedContainer: {
    opacity: 0.4,
  },
  lockedContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  lockedTitle: {
    ...Typography.body.small,
  },
});

export default LessonBlockCard;
