import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Step, StepType } from '../types/app';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useTheme } from '../hooks/useTheme';

interface StepCardProps {
  step: Step;
  isCurrentStep?: boolean;
  onPress?: () => void;
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

export const StepCard: React.FC<StepCardProps> = ({
  step,
  isCurrentStep = false,
  onPress,
}) => {
  const { colors } = useTheme();

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

  const getScoreBadge = () => {
    if (step.type !== 'quiz' || !step.score) return null;
    const scoreColor = step.score >= 80 ? colors.success : step.score >= 60 ? colors.warning : colors.danger;
    return (
      <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
        <Text style={[styles.scoreBadgeText, { color: colors.white }]}>
          {Math.round(step.score)}%
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.background.secondary },
        isCurrentStep && [styles.currentContainer, { borderColor: colors.primary }],
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftSection}>
        {/* Completion indicator */}
        <View
          style={[
            styles.statusIndicator,
            step.completed
              ? { backgroundColor: colors.success }
              : isCurrentStep
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.border },
          ]}
        >
          {step.completed && <Text style={styles.checkmark}>✓</Text>}
          {isCurrentStep && !step.completed && (
            <View style={[styles.currentDot, { backgroundColor: colors.white }]} />
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>{getStepIcon(step.type)}</Text>
          <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>
              {getStepTypeLabel(step.type)}
            </Text>
          </View>
          {getScoreBadge()}
          {isCurrentStep && (
            <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.currentBadgeText, { color: colors.white }]}>NOW</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.title, { color: colors.text.primary }]}
          numberOfLines={2}
        >
          {step.title || step.topic}
        </Text>

        <Text
          style={[styles.topic, { color: colors.text.secondary }]}
          numberOfLines={1}
        >
          {step.topic}
        </Text>

        {step.completed && step.completedAt && (
          <Text style={[styles.completedText, { color: colors.text.tertiary }]}>
            Completed {new Date(step.completedAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {onPress && (
        <View style={styles.chevron}>
          <Text style={[styles.chevronText, { color: colors.text.tertiary }]}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  currentContainer: {
    borderWidth: 2,
  },
  leftSection: {
    marginRight: Spacing.md,
    alignItems: 'center',
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  icon: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.sm,
  },
  badgeText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.sm,
  },
  scoreBadgeText: {
    ...Typography.label.small,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.sm,
  },
  currentBadgeText: {
    ...Typography.label.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  topic: {
    ...Typography.body.small,
  },
  completedText: {
    ...Typography.label.small,
    marginTop: Spacing.xs,
  },
  chevron: {
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  chevronText: {
    fontSize: 24,
    fontWeight: '300',
  },
});

export default StepCard;
