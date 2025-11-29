import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LearningPath } from '../types/app';
import { Colors } from '../theme/colors';
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

const getProgressColor = (progress: number): string => {
  if (progress >= 75) return Colors.success;
  if (progress >= 50) return Colors.ios.blue;
  if (progress >= 25) return Colors.ios.orange;
  return Colors.gray400;
};

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onPress,
  style,
}) => {
  const progressColor = getProgressColor(path.progress);
  const statsText =
    path.lessonsCompleted === 0
      ? 'Not started'
      : `${path.lessonsCompleted} lessons done`;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(path)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{path.emoji}</Text>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {path.goal}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.level}>{getLevelLabel(path.level)}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.stats}>{statsText}</Text>
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
        <View style={styles.startButton}>
          <Text style={styles.startButtonText}>
            {path.lessonsCompleted === 0 ? 'Start' : 'Continue'} →
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  level: {
    ...Typography.label.medium,
    color: Colors.text.secondary,
  },
  separator: {
    ...Typography.label.medium,
    color: Colors.text.tertiary,
    marginHorizontal: Spacing.xs,
  },
  stats: {
    ...Typography.label.medium,
    color: Colors.text.secondary,
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
  },
  startButtonText: {
    ...Typography.button.small,
    color: Colors.primary,
  },
});

export default LearningPathCard;
