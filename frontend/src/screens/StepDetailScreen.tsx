import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../types/navigation';
import { StepType } from '../types/app';
import { useScreenTracking } from '../services/analytics';

type StepDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'StepDetail'
>;
type StepDetailScreenRouteProp = RouteProp<RootStackParamList, 'StepDetail'>;

interface StepDetailScreenProps {
  navigation: StepDetailScreenNavigationProp;
  route: StepDetailScreenRouteProp;
}

const getStepIcon = (type: StepType): string => {
  switch (type) {
    case 'lesson':
      return '📖';
    case 'quiz':
      return '❓';
    case 'practice':
      return '💪';
    case 'review':
      return '🔄';
    case 'summary':
      return '📋';
    default:
      return '✨';
  }
};

const getStepTypeLabel = (type: StepType): string => {
  switch (type) {
    case 'lesson':
      return 'Lesson';
    case 'quiz':
      return 'Quiz';
    case 'practice':
      return 'Practice';
    case 'review':
      return 'Review';
    case 'summary':
      return 'Summary';
    default:
      return 'Step';
  }
};

export const StepDetailScreen: React.FC<StepDetailScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('StepDetail', 'StepDetailScreen');
  const { step, courseId } = route.params;
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  // Hide back button on web - navigation is via sidebar
  const showBackButton = Platform.OS !== 'web';

  const handleBack = () => {
    navigation.goBack();
  };

  const getBadgeColor = () => {
    switch (step.type) {
      case 'lesson':
        return colors.badge.lesson;
      case 'quiz':
        return colors.badge.quiz;
      case 'practice':
        return colors.badge.practice;
      default:
        return colors.badge.primary;
    }
  };

  // Responsive values
  const emojiSize = responsive(48, 56, 64, 72);
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Container>
      <View style={styles.content}>
        {/* Top bar with back button (mobile only) and completed badge */}
        <View style={styles.topBar}>
          {showBackButton ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={[styles.backButtonText, { color: colors.primary }]}>
                ← Back
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          {step.completed && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
              <Text style={[styles.completedBadgeText, { color: colors.white }]}>
                Completed
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>
              {getStepIcon(step.type)}
            </Text>
            <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
              <Text style={[styles.badgeText, { color: colors.white }]}>
                {getStepTypeLabel(step.type)}
              </Text>
            </View>
            <Text
              style={[
                styles.title,
                { fontSize: titleSize, color: colors.text.primary },
              ]}
            >
              {step.title || step.topic}
            </Text>
            <Text style={[styles.topic, { color: colors.text.secondary }]}>
              {step.topic}
            </Text>
          </View>

          {/* Step metadata */}
          {step.completedAt && (
            <View
              style={[
                styles.metaContainer,
                { backgroundColor: colors.background.secondary },
              ]}
            >
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>
                  Completed
                </Text>
                <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                  {formatDate(step.completedAt)}
                </Text>
              </View>
              {step.score !== undefined && step.score > 0 && (
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.text.secondary }]}>
                    Score
                  </Text>
                  <Text
                    style={[
                      styles.metaValue,
                      {
                        color:
                          step.score >= 80
                            ? colors.success
                            : step.score >= 60
                            ? colors.warning
                            : colors.danger,
                      },
                    ]}
                  >
                    {Math.round(step.score)}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Content based on step type */}
          <View style={styles.mainContent}>
            {/* Lesson/Review/Summary content */}
            {(step.type === 'lesson' ||
              step.type === 'review' ||
              step.type === 'summary') &&
              step.content && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Content
                  </Text>
                  <Text style={[styles.bodyText, { color: colors.text.primary }]}>
                    {step.content}
                  </Text>
                </View>
              )}

            {/* Quiz content */}
            {step.type === 'quiz' && (
              <>
                {step.question && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Question
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.text.primary }]}>
                      {step.question}
                    </Text>
                  </View>
                )}
                {step.userAnswer && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Your Answer
                    </Text>
                    <View
                      style={[
                        styles.answerBox,
                        { backgroundColor: colors.background.secondary },
                      ]}
                    >
                      <Text style={[styles.bodyText, { color: colors.text.primary }]}>
                        {step.userAnswer}
                      </Text>
                    </View>
                  </View>
                )}
                {step.expectedAnswer && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Expected Answer
                    </Text>
                    <View
                      style={[
                        styles.answerBox,
                        {
                          backgroundColor: colors.success + '15',
                          borderColor: colors.success,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text style={[styles.bodyText, { color: colors.text.primary }]}>
                        {step.expectedAnswer}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Practice content */}
            {step.type === 'practice' && (
              <>
                {step.task && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Task
                    </Text>
                    <Text style={[styles.bodyText, { color: colors.text.primary }]}>
                      {step.task}
                    </Text>
                  </View>
                )}
                {step.hints && step.hints.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Hints
                    </Text>
                    {step.hints.map((hint, index) => (
                      <View key={index} style={styles.hintRow}>
                        <Text style={[styles.hintNumber, { color: colors.text.secondary }]}>
                          {index + 1}.
                        </Text>
                        <Text style={[styles.hintText, { color: colors.text.primary }]}>
                          {hint}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  backButtonPlaceholder: {
    width: 48,
  },
  completedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
  },
  completedBadgeText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  topic: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  metaContainer: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  metaLabel: {
    ...Typography.body.medium,
  },
  metaValue: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.heading.h4,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    ...Typography.body.medium,
    lineHeight: 26,
  },
  answerBox: {
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
  },
  hintRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  hintNumber: {
    ...Typography.body.medium,
    marginRight: Spacing.sm,
    minWidth: 20,
  },
  hintText: {
    ...Typography.body.medium,
    flex: 1,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

export default StepDetailScreen;
