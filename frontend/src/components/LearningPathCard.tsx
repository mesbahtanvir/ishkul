import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LearningPath } from '../types/app';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { ProgressBar } from './ProgressBar';

interface LearningPathCardProps {
  path: LearningPath;
  onPress: (path: LearningPath) => void;
  style?: ViewStyle;
}

const getLevelLabel = (level: string): string => {
  switch (level) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    default:
      return level;
  }
};

const getProgressColor = (progress: number, colors: ThemeColors): string => {
  if (progress >= 75) return colors.success;
  if (progress >= 50) return colors.ios.blue;
  if (progress >= 25) return colors.ios.orange;
  return colors.gray400;
};

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onPress,
  style,
}) => {
  const { colors } = useTheme();
  const progressColor = getProgressColor(path.progress, colors);
  const statsText =
    path.lessonsCompleted === 0
      ? 'Not started'
      : `${path.lessonsCompleted} lessons done`;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background.secondary, borderColor: colors.border }, style]}
      onPress={() => onPress(path)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{path.emoji}</Text>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>
            {path.goal}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.level, { color: colors.text.secondary }]}>{getLevelLabel(path.level)}</Text>
            <Text style={[styles.separator, { color: colors.text.tertiary }]}>•</Text>
            <Text style={[styles.stats, { color: colors.text.secondary }]}>{statsText}</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <ProgressBar
          progress={path.progress}
          height={6}
          progressColor={progressColor}
        />
        <Text style={[styles.progressText, { color: progressColor }]}>
          {Math.round(path.progress)}%
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.startButton, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.startButtonText, { color: colors.primary }]}>
            {path.lessonsCompleted === 0 ? 'Start' : 'Continue'} →
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 36,
    marginRight: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.heading.h4,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  level: {
    ...Typography.label.medium,
  },
  separator: {
    ...Typography.label.medium,
    marginHorizontal: Spacing.xs,
  },
  stats: {
    ...Typography.label.medium,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    ...Typography.label.medium,
    marginLeft: Spacing.sm,
    minWidth: 36,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  startButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
  },
  startButtonText: {
    ...Typography.button.small,
  },
});

export default LearningPathCard;
