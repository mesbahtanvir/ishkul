import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { CourseOutline, Lesson, LessonPosition } from '../types/app';
import { OutlineSectionCard } from './outline';

const SIDEBAR_WIDTH = 320;

interface CourseOutlineSidebarProps {
  outline: CourseOutline | null;
  currentPosition?: LessonPosition | null;
  onLessonPress?: (sectionIndex: number, lessonIndex: number, lesson: Lesson) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

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
          <OutlineSectionCard
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
            variant="sidebar"
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
  bottomSpacer: {
    height: Spacing.xl,
  },
});

export default CourseOutlineSidebar;
