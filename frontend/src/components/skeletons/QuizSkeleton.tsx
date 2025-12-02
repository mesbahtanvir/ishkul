/**
 * QuizSkeleton - Skeleton loading state for QuizScreen
 * Matches the exact layout of the quiz screen for seamless transition
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container } from '../Container';
import { Card } from '../Card';
import { ScreenHeader } from '../ScreenHeader';
import { Skeleton, SkeletonCircle } from '../Skeleton';
import { SkeletonText, SkeletonTitle } from '../SkeletonText';
import { Spacing } from '../../theme/spacing';

interface QuizSkeletonProps {
  /** Callback when back button is pressed */
  onBack?: () => void;
}

export const QuizSkeleton: React.FC<QuizSkeletonProps> = ({ onBack }) => {
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
                width={55}
                height={26}
                borderRadius="md"
                style={styles.badge}
              />

              {/* Title placeholder */}
              <SkeletonTitle size="large" width="75%" style={styles.title} />
            </View>
          </Card>

          {/* Question Card */}
          <Card elevation="sm" padding="lg" style={styles.questionCard}>
            <SkeletonText lines={3} pattern="varied" lineHeight={18} />
          </Card>

          {/* Input Card - Answer area */}
          <Card elevation="sm" padding="lg" style={styles.inputCard}>
            {/* Simulated text input area */}
            <Skeleton
              width="100%"
              height={100}
              borderRadius="md"
            />
          </Card>

          {/* Button placeholder */}
          <View style={styles.buttonContainer}>
            <Skeleton
              width="100%"
              height={48}
              borderRadius="lg"
            />
          </View>
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
  questionCard: {
    marginBottom: Spacing.sm,
  },
  inputCard: {
    marginBottom: Spacing.sm,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});

export default QuizSkeleton;
