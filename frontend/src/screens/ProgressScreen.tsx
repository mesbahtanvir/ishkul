import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Container } from '../components/Container';
import { useCoursesStore } from '../state/coursesStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { useScreenTracking } from '../services/analytics';

export const ProgressScreen: React.FC = () => {
  useScreenTracking('Progress', 'ProgressScreen');
  const { courses } = useCoursesStore();
  const { responsive, isSmallPhone, isTablet } = useResponsive();
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const activeCourses = courses.filter((c) => c.status === 'active' || !c.status);
    const completedCourses = courses.filter((c) => c.status === 'completed');
    const archivedCourses = courses.filter((c) => c.status === 'archived');

    const totalLessonsCompleted = courses.reduce((sum, c) => sum + c.lessonsCompleted, 0);
    const totalLessons = courses.reduce((sum, c) => sum + c.totalLessons, 0);

    const averageProgress = activeCourses.length > 0
      ? Math.round(activeCourses.reduce((sum, c) => sum + c.progress, 0) / activeCourses.length)
      : 0;

    return {
      activeCourses: activeCourses.length,
      completedCourses: completedCourses.length,
      archivedCourses: archivedCourses.length,
      totalLessonsCompleted,
      totalLessons,
      averageProgress,
    };
  }, [courses]);

  // Responsive values
  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );
  const statValueSize = responsive(32, 40, 44, 48);
  const cardPadding = responsive(Spacing.md, Spacing.lg, Spacing.lg, Spacing.xl);
  const emptyEmojiSize = responsive(56, 64, 72, 80);

  if (courses.length === 0) {
    return (
      <Container>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyEmoji, { fontSize: emptyEmojiSize }]}>📊</Text>
          <Text style={[styles.emptyText, { color: colors.ios.gray }]}>No courses yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
            Start a learning path to track your progress
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>Your Progress</Text>
          <Text style={[styles.subtitle, { color: colors.ios.gray }]}>Keep up the great work!</Text>
        </View>

        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          <View style={[styles.statCard, { backgroundColor: colors.card.stats.blue, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.activeCourses}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Active Courses</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.green, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.completedCourses}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.orange, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.totalLessonsCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Lessons Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.purple, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.averageProgress}%</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Average Progress</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { padding: cardPadding, backgroundColor: colors.card.default }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.primary }]}>Total Lessons</Text>
            <Text style={[styles.summaryValue, { color: colors.ios.blue }]}>{stats.totalLessons}</Text>
          </View>
          {stats.archivedCourses > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text.primary }]}>Archived Courses</Text>
              <Text style={[styles.summaryValue, { color: colors.ios.gray }]}>{stats.archivedCourses}</Text>
            </View>
          )}
        </View>

        {/* Recent courses */}
        {courses.length > 0 && (
          <View style={styles.recentActivity}>
            <Text style={[styles.recentTitle, { color: colors.text.primary }]}>Your Courses</Text>
            {courses.slice(0, 5).map((course) => (
              <View key={course.id} style={[styles.activityItem, { backgroundColor: colors.card.default }]}>
                <View style={[styles.activityIcon, { backgroundColor: colors.white }]}>
                  <Text style={styles.activityEmoji}>{course.emoji || '📚'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTopic, { color: colors.text.primary }]}>{course.title}</Text>
                  <Text style={[styles.activityType, { color: colors.ios.gray }]}>
                    {course.lessonsCompleted}/{course.totalLessons} lessons • {Math.round(course.progress)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  headerSmall: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.display.medium,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statsGridTablet: {
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: Spacing.borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.body.small,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  summaryValue: {
    ...Typography.heading.h3,
    fontWeight: '600',
  },
  recentActivity: {
    marginBottom: Spacing.lg,
  },
  recentTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  activityIcon: {
    width: Spacing.icon.xl,
    height: Spacing.icon.xl,
    borderRadius: Spacing.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  activityEmoji: {
    fontSize: Spacing.icon.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityTopic: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityType: {
    ...Typography.body.small,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body.medium,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.body.small,
    textAlign: 'center',
  },
});
