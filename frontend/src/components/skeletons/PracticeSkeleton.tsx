/**
 * PracticeSkeleton - Skeleton loading state for PracticeScreen
 * Matches the exact layout of the practice screen for seamless transition
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container } from '../Container';
import { ScreenHeader } from '../ScreenHeader';
import { Skeleton, SkeletonCircle } from '../Skeleton';
import { SkeletonText, SkeletonTitle } from '../SkeletonText';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../theme/spacing';

interface PracticeSkeletonProps {
  /** Callback when back button is pressed */
  onBack?: () => void;
}

export const PracticeSkeleton: React.FC<PracticeSkeletonProps> = ({ onBack }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScreenHeader title="" onBack={onBack} />
      <Container scrollable>
        <View style={styles.content}>
          {/* Header - Emoji, Badge, Title */}
          <View style={styles.header}>
            {/* Emoji placeholder */}
            <SkeletonCircle size={56} style={styles.emoji} />

            {/* Badge placeholder */}
            <Skeleton
              width={75}
              height={26}
              borderRadius="md"
              style={styles.badge}
            />

            {/* Title placeholder */}
            <SkeletonTitle size="large" width="70%" style={styles.title} />
          </View>

          {/* Body container */}
          <View style={styles.bodyContainer}>
            {/* Task label placeholder */}
            <Skeleton
              width={80}
              height={14}
              borderRadius="xs"
              style={styles.taskLabel}
            />

            {/* Task text placeholder */}
            <SkeletonText
              lines={3}
              pattern="varied"
              lineHeight={18}
              style={styles.task}
            />

            {/* Hints container */}
            <View style={[styles.hintsContainer, { backgroundColor: colors.card.default }]}>
              {/* Hints title */}
              <Skeleton
                width={70}
                height={16}
                borderRadius="xs"
                style={styles.hintsTitle}
              />

              {/* Hint items */}
              <View style={styles.hintItem}>
                <Skeleton width={8} height={8} borderRadius="full" style={styles.bullet} />
                <Skeleton width="85%" height={14} borderRadius="xs" />
              </View>
              <View style={styles.hintItem}>
                <Skeleton width={8} height={8} borderRadius="full" style={styles.bullet} />
                <Skeleton width="70%" height={14} borderRadius="xs" />
              </View>
              <View style={styles.hintItem}>
                <Skeleton width={8} height={8} borderRadius="full" style={styles.bullet} />
                <Skeleton width="90%" height={14} borderRadius="xs" />
              </View>
            </View>
          </View>

          {/* Button placeholder */}
          <Skeleton
            width="100%"
            height={48}
            borderRadius="lg"
          />
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    marginBottom: Spacing.sm,
  },
  title: {
    alignSelf: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  taskLabel: {
    marginBottom: Spacing.sm,
  },
  task: {
    marginBottom: Spacing.xl,
  },
  hintsContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  hintsTitle: {
    marginBottom: Spacing.sm,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  bullet: {
    marginRight: Spacing.sm,
  },
});

export default PracticeSkeleton;
