import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Section, Lesson } from '../../types/app';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

/**
 * Get status-based styling for outline items
 */
export const getOutlineStatusStyle = (status: string, colors: ThemeColors) => {
  switch (status) {
    case 'completed':
      return { bg: colors.success + '20', text: colors.success, icon: '✓' };
    case 'in_progress':
      return { bg: colors.primary + '20', text: colors.primary, icon: '→' };
    case 'skipped':
      return { bg: colors.ios.gray + '20', text: colors.ios.gray, icon: '–' };
    case 'locked':
      return { bg: colors.ios.gray + '10', text: colors.ios.gray, icon: '🔒' };
    default:
      return { bg: 'transparent', text: colors.text.secondary, icon: '' };
  }
};

/**
 * Style variant for different contexts (drawer vs sidebar)
 */
export type OutlineSectionCardVariant = 'drawer' | 'sidebar';

interface OutlineSectionCardProps {
  section: Section;
  sectionIndex: number;
  isCurrentSection: boolean;
  currentLessonIndex: number | null;
  onLessonPress?: (lessonIndex: number, lesson: Lesson) => void;
  variant?: OutlineSectionCardVariant;
}

/**
 * Get variant-specific styles
 */
const getVariantStyles = (variant: OutlineSectionCardVariant) => {
  if (variant === 'sidebar') {
    return {
      sectionNumber: { width: 24, height: 24, borderRadius: 12 },
      sectionNumberText: { fontSize: 11 },
      sectionTitle: Typography.body.small,
      sectionStatsText: { ...Typography.label.small, fontSize: 11 },
      progressBar: { height: 3, borderRadius: 1.5 },
      expandIcon: { fontSize: 10 },
      lessonItem: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
      lessonIcon: { width: 28, height: 28, borderRadius: 6, marginRight: Spacing.xs },
      lessonIconText: { fontSize: 14 },
      lessonTitle: Typography.label.medium,
      lessonDuration: { ...Typography.label.small, fontSize: 10 },
      currentBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
      currentBadgeText: { fontSize: 8 },
      sectionHeader: { padding: Spacing.sm },
    };
  }
  // drawer variant (default)
  return {
    sectionNumber: { width: 28, height: 28, borderRadius: 14 },
    sectionNumberText: { fontSize: 13 },
    sectionTitle: Typography.body.medium,
    sectionStatsText: Typography.label.small,
    progressBar: { height: 4, borderRadius: 2 },
    expandIcon: { fontSize: 12 },
    lessonItem: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    lessonIcon: { width: 32, height: 32, borderRadius: 8, marginRight: Spacing.sm },
    lessonIconText: { fontSize: 16 },
    lessonTitle: Typography.body.small,
    lessonDuration: Typography.label.small,
    currentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    currentBadgeText: { fontSize: 10 },
    sectionHeader: { padding: Spacing.md },
  };
};

export const OutlineSectionCard: React.FC<OutlineSectionCardProps> = ({
  section,
  sectionIndex,
  isCurrentSection,
  currentLessonIndex,
  onLessonPress,
  variant = 'drawer',
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(isCurrentSection);
  const rotateAnim = useRef(new Animated.Value(isCurrentSection ? 1 : 0)).current;
  const variantStyles = getVariantStyles(variant);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const completedLessons = section.lessons.filter((l) => l.status === 'completed').length;
  const progress = section.lessons.length > 0 ? (completedLessons / section.lessons.length) * 100 : 0;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={[
      styles.sectionCard,
      { borderColor: colors.border },
      isCurrentSection && {
        borderColor: colors.primary + '4D',
        backgroundColor: colors.primary + '08',
      },
    ]}>
      <TouchableOpacity
        style={[styles.sectionHeader, variantStyles.sectionHeader as ViewStyle]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[
              styles.sectionNumber,
              variantStyles.sectionNumber as ViewStyle,
              {
                backgroundColor:
                  section.status === 'completed'
                    ? colors.success
                    : isCurrentSection
                      ? colors.primary
                      : colors.ios.gray,
              },
            ]}
          >
            {section.status === 'completed' ? (
              <Text style={[styles.sectionNumberText, variantStyles.sectionNumberText as TextStyle, { color: colors.white }]}>✓</Text>
            ) : (
              <Text style={[styles.sectionNumberText, variantStyles.sectionNumberText as TextStyle, { color: colors.white }]}>{sectionIndex + 1}</Text>
            )}
          </View>
          <View style={styles.sectionInfo}>
            <Text
              style={[styles.sectionTitle, variantStyles.sectionTitle as TextStyle, { color: colors.text.primary }]}
              numberOfLines={2}
            >
              {section.title}
            </Text>
            <View style={styles.sectionStats}>
              <Text style={[styles.sectionStatsText, variantStyles.sectionStatsText as TextStyle, { color: colors.text.secondary }]}>
                {completedLessons}/{section.lessons.length} lessons
              </Text>
              {section.estimatedMinutes > 0 && (
                <Text style={[styles.sectionStatsText, variantStyles.sectionStatsText as TextStyle, { color: colors.text.secondary }]}>
                  {' '}
                  • {section.estimatedMinutes} min
                </Text>
              )}
            </View>
            {/* Progress bar */}
            <View style={[styles.progressBar, variantStyles.progressBar as ViewStyle, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  variantStyles.progressBar as ViewStyle,
                  {
                    width: `${progress}%`,
                    backgroundColor: section.status === 'completed' ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <Animated.Text
          style={[
            styles.expandIcon,
            variantStyles.expandIcon as TextStyle,
            { color: colors.text.secondary, transform: [{ rotate: rotation }] },
          ]}
        >
          ▶
        </Animated.Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.lessonsList, { borderTopColor: colors.divider }]}>
          {section.lessons.map((lesson, lessonIndex) => {
            const isCurrentLesson = isCurrentSection && currentLessonIndex === lessonIndex;
            const statusStyle = getOutlineStatusStyle(lesson.status, colors);

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonItem,
                  variantStyles.lessonItem as ViewStyle,
                  { borderBottomColor: colors.divider },
                  isCurrentLesson && {
                    backgroundColor: colors.primary + '10',
                    borderLeftColor: colors.primary,
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() => onLessonPress?.(lessonIndex, lesson)}
                activeOpacity={0.7}
                disabled={lesson.status === 'locked'}
              >
                <View
                  style={[
                    styles.lessonIcon,
                    variantStyles.lessonIcon as ViewStyle,
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  {lesson.status === 'completed' ? (
                    <Text style={[styles.lessonIconText, variantStyles.lessonIconText as TextStyle, { color: statusStyle.text }]}>
                      ✓
                    </Text>
                  ) : lesson.status === 'locked' ? (
                    <Text style={[styles.lessonIconText, variantStyles.lessonIconText as TextStyle]}>🔒</Text>
                  ) : (
                    <Text style={[styles.lessonIconText, variantStyles.lessonIconText as TextStyle]}>📖</Text>
                  )}
                </View>
                <View style={styles.lessonContent}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      variantStyles.lessonTitle as TextStyle,
                      {
                        color:
                          lesson.status === 'completed'
                            ? colors.text.secondary
                            : lesson.status === 'locked'
                            ? colors.text.tertiary
                            : colors.text.primary,
                      },
                      lesson.status === 'completed' && styles.completedLessonTitle,
                    ]}
                    numberOfLines={2}
                  >
                    {lesson.title}
                  </Text>
                  <View style={styles.lessonMeta}>
                    {lesson.estimatedMinutes > 0 && (
                      <Text style={[styles.lessonDuration, variantStyles.lessonDuration as TextStyle, { color: colors.text.tertiary }]}>
                        {lesson.estimatedMinutes} min
                      </Text>
                    )}
                  </View>
                </View>
                {isCurrentLesson && (
                  <View style={[styles.currentBadge, variantStyles.currentBadge as ViewStyle, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.currentBadgeText, variantStyles.currentBadgeText as TextStyle, { color: colors.white }]}>NOW</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionNumber: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  sectionNumberText: {
    fontWeight: '700',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionStats: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  sectionStatsText: {},
  progressBar: {
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  expandIcon: {
    marginLeft: Spacing.sm,
  },
  lessonsList: {
    borderTopWidth: 1,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  lessonIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonIconText: {},
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  completedLessonTitle: {
    textDecorationLine: 'line-through',
  },
  lessonMeta: {
    flexDirection: 'row',
  },
  lessonDuration: {},
  currentBadge: {},
  currentBadgeText: {
    fontWeight: '700',
  },
});

export default OutlineSectionCard;
