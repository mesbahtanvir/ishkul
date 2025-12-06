import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LearningPath, PathStatus } from '../types/app';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { ProgressBar } from './ProgressBar';

interface LearningPathCardProps {
  path: LearningPath;
  onPress: (path: LearningPath) => void;
  onDelete?: (path: LearningPath) => void;
  onArchive?: (path: LearningPath) => void;
  onRestore?: (path: LearningPath) => void;
  showStatusActions?: boolean;
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

const getStatusBadge = (status: PathStatus | undefined): { label: string; color: string } | null => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', color: '#10B981' };
    case 'archived':
      return { label: 'Archived', color: '#6B7280' };
    default:
      return null;
  }
};

const formatDate = (timestamp: number | undefined): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const LearningPathCard: React.FC<LearningPathCardProps> = ({
  path,
  onPress,
  onDelete,
  onArchive,
  onRestore,
  showStatusActions = false,
  style,
}) => {
  const { colors } = useTheme();
  const isCompleted = path.status === 'completed' || path.progress >= 100;
  const isArchived = path.status === 'archived';
  const progressColor = isCompleted ? colors.success : getProgressColor(path.progress, colors);

  const statsText = isCompleted
    ? `Completed ${formatDate(path.completedAt)}`
    : isArchived
    ? `Archived ${formatDate(path.archivedAt)}`
    : path.lessonsCompleted === 0
    ? 'Not started'
    : `${path.lessonsCompleted} lessons done`;

  const statusBadge = getStatusBadge(path.status);

  const getActionButtonText = (): string => {
    if (isCompleted) return 'Review →';
    if (isArchived) return 'View →';
    if (path.lessonsCompleted === 0) return 'Start →';
    return 'Continue →';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.background.secondary,
          borderColor: isCompleted ? colors.success : isArchived ? colors.gray400 : colors.border,
          opacity: isArchived ? 0.8 : 1,
        },
        style,
      ]}
      onPress={() => onPress(path)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{path.emoji}</Text>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.completedIcon}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: isArchived ? colors.text.secondary : colors.text.primary },
              ]}
              numberOfLines={2}
            >
              {path.goal}
            </Text>
            {statusBadge && (
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
                <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.level, { color: colors.text.secondary }]}>
              {getLevelLabel(path.level)}
            </Text>
            <Text style={[styles.separator, { color: colors.text.tertiary }]}>•</Text>
            <Text style={[styles.stats, { color: colors.text.secondary }]}>{statsText}</Text>
          </View>
        </View>

        {/* Action icons in header */}
        {showStatusActions && (
          <View style={styles.headerActions}>
            {isArchived && onRestore ? (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.primaryLight }]}
                onPress={(e) => {
                  e.stopPropagation();
                  onRestore(path);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Restore course"
                accessibilityRole="button"
              >
                <Text style={[styles.iconButtonText, { color: colors.primary }]}>↩</Text>
              </TouchableOpacity>
            ) : onArchive ? (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.background.tertiary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  onArchive(path);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Archive course"
                accessibilityRole="button"
              >
                <Text style={[styles.iconButtonText, { color: colors.text.secondary }]}>📁</Text>
              </TouchableOpacity>
            ) : null}
            {onDelete && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.background.tertiary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(path);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete course"
                accessibilityRole="button"
              >
                <Text style={[styles.iconButtonText, { color: colors.danger }]}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarWrapper}>
          <ProgressBar
            progress={path.progress}
            height={6}
            progressColor={progressColor}
          />
        </View>
        <Text style={[styles.progressText, { color: progressColor }]}>
          {Math.min(100, Math.round(path.progress))}%
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1 }} />
        <View style={[styles.startButton, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.startButtonText, { color: colors.primary }]}>
            {getActionButtonText()}
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
    position: 'relative',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 14,
  },
  emojiContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: 36,
  },
  completedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIcon: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.heading.h4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
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
  progressBarWrapper: {
    flex: 1,
  },
  progressText: {
    ...Typography.label.medium,
    marginLeft: Spacing.sm,
    minWidth: 36,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
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
