/**
 * LessonSkeleton - Skeleton loading state for LessonScreen
 * Matches the exact layout of the lesson screen for seamless transition
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container } from '../Container';
import { Card } from '../Card';
import { ScreenHeader } from '../ScreenHeader';
import { Skeleton, SkeletonCircle } from '../Skeleton';
import { SkeletonText, SkeletonTitle } from '../SkeletonText';
import { Spacing } from '../../theme/spacing';

interface LessonSkeletonProps {
  /** Callback when back button is pressed */
  onBack?: () => void;
}

export const LessonSkeleton: React.FC<LessonSkeletonProps> = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <ScreenHeader title="" onBack={onBack} />
      <Container scrollable>
        <View style={styles.content}>
          {/* Header Card - Emoji, Badge, Title */}
          <Card elevation="md" padding="lg" style={styles.headerCard}>
            <View style={styles.header}>
              {/* Emoji placeholder */}
              <SkeletonCircle size={56} style={styles.emoji} />

              {/* Badge placeholder */}
              <Skeleton
                width={70}
                height={26}
                borderRadius="md"
                style={styles.badge}
              />

              {/* Title placeholder */}
              <SkeletonTitle size="large" width="80%" style={styles.title} />
            </View>
          </Card>

          {/* Content Card - Lesson content */}
          <Card elevation="sm" padding="lg" style={styles.contentCard}>
            {/* Multiple paragraphs of content */}
            <SkeletonText lines={4} pattern="varied" style={styles.paragraph} />
            <SkeletonText lines={3} pattern="varied" style={styles.paragraph} />
            <SkeletonText lines={4} pattern="varied" style={styles.paragraph} />
            <SkeletonText lines={2} pattern="varied" lastLineWidth={45} />
          </Card>

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
    gap: Spacing.md,
  },
  headerCard: {
    marginBottom: Spacing.sm,
  },
  header: {
    alignItems: 'center',
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
  contentCard: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  paragraph: {
    marginBottom: Spacing.lg,
  },
});

export default LessonSkeleton;
