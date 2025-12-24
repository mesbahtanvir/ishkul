import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { CourseOutline, Section, Lesson, LessonPosition } from '../types/app';

const SIDEBAR_WIDTH = 320;

interface CourseOutlineSidebarProps {
  outline: CourseOutline | null;
  currentPosition?: LessonPosition | null;
  onLessonPress?: (sectionIndex: number, lessonIndex: number, lesson: Lesson) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Status to style mapping
const getStatusStyle = (status: string, colors: ReturnType<typeof useTheme>['colors']) => {
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

interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isCurrentSection: boolean;
  currentLessonIndex: number | null;
  onLessonPress?: (lessonIndex: number, lesson: Lesson) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionIndex,
  isCurrentSection,
  currentLessonIndex,
  onLessonPress,
  colors,
}) => {
  const [expanded, setExpanded] = useState(isCurrentSection);
  const rotateAnim = useRef(new Animated.Value(isCurrentSection ? 1 : 0)).current;

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
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[
              styles.sectionNumber,
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
              <Text style={[styles.sectionNumberText, { color: colors.white }]}>✓</Text>
            ) : (
              <Text style={[styles.sectionNumberText, { color: colors.white }]}>{sectionIndex + 1}</Text>
            )}
          </View>
          <View style={styles.sectionInfo}>
            <Text
              style={[styles.sectionTitle, { color: colors.text.primary }]}
              numberOfLines={2}
            >
              {section.title}
            </Text>
            <View style={styles.sectionStats}>
              <Text style={[styles.sectionStatsText, { color: colors.text.secondary }]}>
                {completedLessons}/{section.lessons.length} lessons
              </Text>
              {section.estimatedMinutes > 0 && (
                <Text style={[styles.sectionStatsText, { color: colors.text.secondary }]}>
                  {' '}
                  • {section.estimatedMinutes} min
                </Text>
              )}
            </View>
            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
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
            const statusStyle = getStatusStyle(lesson.status, colors);

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonItem,
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
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  {lesson.status === 'completed' ? (
                    <Text style={[styles.lessonIconText, { color: statusStyle.text }]}>
                      ✓
                    </Text>
                  ) : lesson.status === 'locked' ? (
                    <Text style={styles.lessonIconText}>🔒</Text>
                  ) : (
                    <Text style={styles.lessonIconText}>📖</Text>
                  )}
                </View>
                <View style={styles.lessonContent}>
                  <Text
                    style={[
                      styles.lessonTitle,
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
                      <Text style={[styles.lessonDuration, { color: colors.text.tertiary }]}>
                        {lesson.estimatedMinutes} min
                      </Text>
                    )}
                  </View>
                </View>
                {isCurrentLesson && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.currentBadgeText, { color: colors.white }]}>NOW</Text>
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

export const CourseOutlineSidebar: React.FC<CourseOutlineSidebarProps> = ({
  outline,
  currentPosition,
  onLessonPress,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { colors } = useTheme();

  if (!outline || !outline.sections) return null;

  const totalLessons = outline.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = outline.sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.status === 'completed').length,
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Collapsed view - just show a thin bar with toggle
  if (collapsed) {
    return (
      <View style={[styles.collapsedSidebar, { backgroundColor: colors.background.secondary, borderRightColor: colors.border }]}>
        <TouchableOpacity
          style={styles.collapseToggle}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
        >
          <Text style={[styles.collapseIcon, { color: colors.primary }]}>»</Text>
        </TouchableOpacity>
        <View style={styles.collapsedProgress}>
          <Text style={[styles.collapsedProgressText, { color: colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background.secondary, borderRightColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Course Outline
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            {completedLessons} of {totalLessons} lessons completed
          </Text>
        </View>
        {onToggleCollapse && (
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={onToggleCollapse}
            activeOpacity={0.7}
          >
            <Text style={[styles.collapseIcon, { color: colors.primary }]}>«</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Overall progress */}
      <View style={[styles.overallProgress, { backgroundColor: colors.background.primary }]}>
        <View style={styles.overallProgressHeader}>
          <Text style={[styles.overallProgressTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {outline.title}
          </Text>
          <Text style={[styles.overallProgressPercent, { color: colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
        <View style={[styles.overallProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.overallProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.overallStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {outline.sections.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Sections
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {totalLessons}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Lessons
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {Math.round(outline.estimatedMinutes / 60)}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Total
            </Text>
          </View>
        </View>
      </View>

      {/* Sections list */}
      <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
        {outline.sections.map((section, sectionIndex) => (
          <SectionCard
            key={section.id}
            section={section}
            sectionIndex={sectionIndex}
            isCurrentSection={currentPosition?.sectionIndex === sectionIndex}
            currentLessonIndex={
              currentPosition?.sectionIndex === sectionIndex
                ? currentPosition.lessonIndex
                : null
            }
            onLessonPress={(lessonIndex, lesson) =>
              onLessonPress?.(sectionIndex, lessonIndex, lesson)
            }
            colors={colors}
          />
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    height: '100%',
  },
  collapsedSidebar: {
    width: 48,
    borderRightWidth: 1,
    height: '100%',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  collapseToggle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  collapsedProgress: {
    transform: [{ rotate: '-90deg' }],
    marginTop: Spacing.xl,
  },
  collapsedProgressText: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.heading.h4,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.body.small,
  },
  collapseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  collapseIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  overallProgress: {
    padding: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  overallProgressTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  overallProgressPercent: {
    ...Typography.heading.h4,
    fontWeight: '700',
  },
  overallProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.body.medium,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label.small,
  },
  sectionsList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
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
    padding: Spacing.sm,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  sectionNumberText: {
    fontWeight: '700',
    fontSize: 11,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  sectionStatsText: {
    ...Typography.label.small,
    fontSize: 11,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  expandIcon: {
    fontSize: 10,
    marginLeft: Spacing.xs,
  },
  lessonsList: {
    borderTopWidth: 1,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  lessonIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  lessonIconText: {
    fontSize: 14,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.label.medium,
    fontWeight: '500',
    marginBottom: 1,
  },
  completedLessonTitle: {
    textDecorationLine: 'line-through',
  },
  lessonMeta: {
    flexDirection: 'row',
  },
  lessonDuration: {
    ...Typography.label.small,
    fontSize: 10,
  },
  currentBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});

export default CourseOutlineSidebar;
