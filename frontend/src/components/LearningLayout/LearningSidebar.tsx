/**
 * LearningSidebar - Main sidebar with course outline
 *
 * Shows course progress and expandable sections with lessons.
 * Supports collapsed and expanded states.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ProgressBar } from '../ProgressBar';
import { SectionCard } from './SectionCard';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Course, Lesson, LessonPosition, getCourseTitle } from '../../types/app';

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;

export interface LearningSidebarProps {
  course: Course;
  currentPosition?: LessonPosition | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLessonPress: (lesson: Lesson, sectionId: string) => void;
}

export const LearningSidebar: React.FC<LearningSidebarProps> = ({
  course,
  currentPosition,
  collapsed,
  onToggleCollapse,
  onLessonPress,
}) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    // Expand current section by default
    if (currentPosition?.sectionId) {
      return new Set([currentPosition.sectionId]);
    }
    if (course.outline?.sections && course.outline.sections.length > 0) {
      return new Set([course.outline.sections[0].id]);
    }
    return new Set();
  });

  // Update expanded sections when current position changes
  useEffect(() => {
    if (currentPosition?.sectionId) {
      setExpandedSections((prev) => {
        if (prev.has(currentPosition.sectionId)) {
          return prev;
        }
        return new Set([...prev, currentPosition.sectionId]);
      });
    }
  }, [currentPosition?.sectionId]);

  const sections = course.outline?.sections || [];
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.status === 'completed').length,
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Collapsed view
  if (collapsed) {
    return (
      <View
        style={[
          styles.collapsedSidebar,
          { backgroundColor: colors.background.secondary, borderRightColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.expandToggleButton, { backgroundColor: colors.primary + '15' }]}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
          accessibilityLabel="Expand sidebar"
          accessibilityHint="Press to show the course outline"
        >
          <Text style={[styles.toggleButtonIcon, { color: colors.primary }]}>{'>'}</Text>
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
    <View
      style={[
        styles.sidebar,
        { backgroundColor: colors.background.secondary, borderRightColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.sidebarHeaderContent}>
          <Text style={[styles.sidebarHeaderTitle, { color: colors.text.primary }]}>
            Course Outline
          </Text>
          <Text style={[styles.sidebarHeaderSubtitle, { color: colors.text.secondary }]}>
            {completedLessons} of {totalLessons} lessons completed
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.collapseToggleButton, { backgroundColor: colors.primary + '15' }]}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
          accessibilityLabel="Collapse sidebar"
          accessibilityHint="Press to hide the course outline. Shortcut: Ctrl+B"
        >
          <Text style={[styles.toggleButtonIcon, { color: colors.primary }]}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Course progress summary */}
      <View style={[styles.courseProgress, { backgroundColor: colors.background.primary }]}>
        <View style={styles.courseProgressHeader}>
          <Text style={[styles.courseProgressTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {getCourseTitle(course)}
          </Text>
          <Text style={[styles.courseProgressPercent, { color: colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
        <ProgressBar progress={progressPercent} height={6} />
      </View>

      {/* Sections list */}
      <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
        {sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            sectionIndex={index}
            isCurrentSection={currentPosition?.sectionId === section.id}
            currentLessonId={currentPosition?.lessonId || null}
            onLessonPress={onLessonPress}
            expanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            colors={colors}
          />
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Sidebar
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    height: '100%',
  },
  collapsedSidebar: {
    width: COLLAPSED_WIDTH,
    borderRightWidth: 1,
    height: '100%',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  expandToggleButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  collapseToggleButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  toggleButtonIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  collapsedProgress: {
    transform: [{ rotate: '-90deg' }],
    marginTop: Spacing.xl,
  },
  collapsedProgressText: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  sidebarHeaderContent: {
    flex: 1,
  },
  sidebarHeaderTitle: {
    ...Typography.heading.h4,
    marginBottom: 2,
  },
  sidebarHeaderSubtitle: {
    ...Typography.body.small,
  },

  // Course progress
  courseProgress: {
    padding: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  courseProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  courseProgressTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  courseProgressPercent: {
    ...Typography.heading.h4,
    fontWeight: '700',
  },

  // Sections list
  sectionsList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});
