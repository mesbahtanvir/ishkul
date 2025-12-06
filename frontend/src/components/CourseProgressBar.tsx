import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { CourseOutline, OutlinePosition } from '../types/app';

interface CourseProgressBarProps {
  outline: CourseOutline | null;
  currentPosition?: OutlinePosition | null;
  onPress: () => void;
}

export const CourseProgressBar: React.FC<CourseProgressBarProps> = ({
  outline,
  currentPosition,
  onPress,
}) => {
  const { colors } = useTheme();

  if (!outline) return null;

  const totalTopics = outline.modules.reduce((sum, m) => sum + m.topics.length, 0);
  const completedTopics = outline.modules.reduce(
    (sum, m) => sum + m.topics.filter((t) => t.status === 'completed').length,
    0
  );
  const progressPercent = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  // Get current module and topic info
  const currentModule = currentPosition
    ? outline.modules[currentPosition.moduleIndex]
    : null;
  const currentTopic = currentModule && currentPosition
    ? currentModule.topics[currentPosition.topicIndex]
    : null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background.secondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Progress info */}
        <View style={styles.progressInfo}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>
              {currentTopic ? (
                <>
                  <Text style={[styles.currentLabel, { color: colors.primary }]}>
                    Now:{' '}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.text.primary }}>
                    {currentTopic.title}
                  </Text>
                </>
              ) : (
                `${completedTopics} of ${totalTopics} topics`
              )}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
            {/* Module markers */}
            {outline.modules.map((module, idx) => {
              const moduleStartPosition = outline.modules
                .slice(0, idx)
                .reduce((sum, m) => sum + m.topics.length, 0);
              const markerPosition = (moduleStartPosition / totalTopics) * 100;

              if (idx === 0) return null; // Don't show marker at start

              return (
                <View
                  key={module.id}
                  style={[
                    styles.moduleMarker,
                    {
                      left: `${markerPosition}%`,
                      backgroundColor: colors.background.primary,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Tap indicator */}
        <View style={styles.tapIndicator}>
          <Text style={[styles.tapIcon, { color: colors.text.tertiary }]}>
            📋
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.body.small,
    flex: 1,
    marginRight: Spacing.sm,
  },
  currentLabel: {
    fontWeight: '600',
  },
  progressPercent: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  moduleMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.5,
  },
  tapIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapIcon: {
    fontSize: 18,
  },
});

export default CourseProgressBar;
