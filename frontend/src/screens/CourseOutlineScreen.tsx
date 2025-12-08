/**
 * CourseOutlineScreen - Shows sections and lessons for navigation
 *
 * Displays the course structure with sections containing lessons.
 * Allows users to navigate to specific lessons.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { useCoursesStore } from '../state/coursesStore';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { Section, Lesson, LessonStatus, getCourseTitle } from '../types/app';
import { coursesApi } from '../services/api';

type CourseOutlineScreenProps = NativeStackScreenProps<RootStackParamList, 'CourseOutline'>;

/**
 * Get status icon for lesson
 */
const getLessonStatusIcon = (status: LessonStatus): string => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '📖';
    case 'locked':
      return '🔒';
    default:
      return '⭕';
  }
};

/**
 * Get status color for lesson
 */
const getLessonStatusColor = (
  status: LessonStatus,
  colors: ReturnType<typeof useTheme>['colors']
): string => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in_progress':
      return colors.primary;
    case 'locked':
      return colors.text.secondary;
    default:
      return colors.text.primary;
  }
};

/**
 * Section component
 */
interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onLessonPress: (lesson: Lesson) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionIndex,
  isExpanded,
  onToggle,
  onLessonPress,
}) => {
  const { colors } = useTheme();

  // Calculate section progress
  const completedLessons = section.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = section.lessons.length;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <Card elevation="md" padding="md" style={styles.sectionCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionInfo}>
            <Text style={[styles.sectionNumber, { color: colors.primary }]}>
              Section {sectionIndex + 1}
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionProgress, { color: colors.text.secondary }]}>
              {completedLessons}/{totalLessons} lessons completed
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>
        <ProgressBar progress={progress} height={4} style={styles.sectionProgressBar} />
      </TouchableOpacity>

      {/* Lessons List */}
      {isExpanded && (
        <View style={styles.lessonsContainer}>
          {section.lessons.map((lesson, lessonIndex) => (
            <TouchableOpacity
              key={lesson.id}
              style={[
                styles.lessonRow,
                { borderTopColor: colors.border },
                lessonIndex === 0 && styles.firstLessonRow,
              ]}
              onPress={() => onLessonPress(lesson)}
              disabled={lesson.status === 'locked'}
              activeOpacity={0.7}
            >
              <Text style={styles.lessonIcon}>
                {getLessonStatusIcon(lesson.status)}
              </Text>
              <View style={styles.lessonInfo}>
                <Text
                  style={[
                    styles.lessonTitle,
                    {
                      color: getLessonStatusColor(lesson.status, colors),
                      opacity: lesson.status === 'locked' ? 0.5 : 1,
                    },
                  ]}
                >
                  {lesson.title}
                </Text>
                {lesson.description && (
                  <Text
                    style={[
                      styles.lessonDescription,
                      { color: colors.text.secondary },
                    ]}
                    numberOfLines={1}
                  >
                    {lesson.description}
                  </Text>
                )}
              </View>
              {lesson.status !== 'locked' && (
                <Text style={[styles.lessonArrow, { color: colors.text.secondary }]}>
                  →
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
};

export const CourseOutlineScreen: React.FC<CourseOutlineScreenProps> = ({
  navigation,
  route,
}) => {
  const { courseId } = route.params;
  const { colors } = useTheme();
  const { responsive } = useResponsive();
  const { activeCourse, setActiveCourse } = useCoursesStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load course if not already loaded
  useEffect(() => {
    const loadCourse = async () => {
      if (activeCourse?.id === courseId && activeCourse.outline) {
        // Expand first section by default
        if (activeCourse.outline.sections && activeCourse.outline.sections.length > 0) {
          setExpandedSections(new Set([activeCourse.outline.sections[0].id]));
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const course = await coursesApi.getCourse(courseId);
        if (course) {
          setActiveCourse(course);
          // Expand first section by default
          if (course.outline?.sections && course.outline.sections.length > 0) {
            setExpandedSections(new Set([course.outline.sections[0].id]));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId, activeCourse, setActiveCourse]);

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

  const handleLessonPress = (lesson: Lesson, sectionId: string) => {
    if (lesson.status === 'locked') return;

    navigation.navigate('Lesson', {
      courseId,
      lessonId: lesson.id,
      sectionId,
      lesson,
    });
  };

  const handleContinue = () => {
    // Find current or next available lesson
    if (!activeCourse?.outline?.sections) return;

    for (const section of activeCourse.outline.sections) {
      for (const lesson of section.lessons) {
        if (lesson.status === 'pending' || lesson.status === 'in_progress') {
          navigation.navigate('Lesson', {
            courseId,
            lessonId: lesson.id,
            sectionId: section.id,
            lesson,
          });
          return;
        }
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container scrollable>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading course...
          </Text>
        </View>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container scrollable>
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>
              Failed to load course
            </Text>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>
              {error}
            </Text>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              variant="outline"
            />
          </View>
        </Card>
      </Container>
    );
  }

  // No course or outline
  if (!activeCourse?.outline?.sections) {
    return (
      <Container scrollable>
        <Card elevation="md" padding="lg">
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📭</Text>
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
              No course outline available
            </Text>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              variant="outline"
            />
          </View>
        </Card>
      </Container>
    );
  }

  // Calculate overall progress
  const allLessons = activeCourse.outline.sections.flatMap((s) => s.lessons);
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length;
  const totalLessons = allLessons.length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Responsive values
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  return (
    <Container scrollable>
      <View style={styles.content}>
        {/* Course Header */}
        <Card elevation="md" padding="lg" style={styles.headerCard}>
          <Text style={[styles.courseEmoji]}>{activeCourse.emoji || '📚'}</Text>
          <Text style={[styles.courseTitle, { fontSize: titleSize, color: colors.text.primary }]}>
            {getCourseTitle(activeCourse)}
          </Text>

          {/* Overall Progress */}
          <View style={styles.overallProgress}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>
                Course Progress
              </Text>
              <Text style={[styles.progressValue, { color: colors.primary }]}>
                {Math.round(overallProgress)}%
              </Text>
            </View>
            <ProgressBar progress={overallProgress} height={8} />
            <Text style={[styles.progressDetail, { color: colors.text.secondary }]}>
              {completedLessons} of {totalLessons} lessons completed
            </Text>
          </View>

          {/* Continue Button */}
          <Button
            title="Continue Learning"
            onPress={handleContinue}
            style={styles.continueButton}
          />
        </Card>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {activeCourse.outline.sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              sectionIndex={index}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onLessonPress={(lesson) => handleLessonPress(lesson, section.id)}
            />
          ))}
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body.medium,
    marginTop: Spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  headerCard: {
    alignItems: 'center',
  },
  courseEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  courseTitle: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  overallProgress: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...Typography.label.small,
  },
  progressValue: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  progressDetail: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.sm,
    minWidth: 200,
  },
  sectionsContainer: {
    gap: Spacing.md,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionNumber: {
    ...Typography.label.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.xs,
  },
  sectionProgress: {
    ...Typography.body.small,
  },
  expandIcon: {
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  sectionProgressBar: {
    marginTop: Spacing.md,
  },
  lessonsContainer: {
    marginTop: Spacing.md,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  firstLessonRow: {
    // First lesson has border
  },
  lessonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  lessonDescription: {
    ...Typography.body.small,
    marginTop: Spacing.xs / 2,
  },
  lessonArrow: {
    fontSize: 18,
    marginLeft: Spacing.sm,
  },
});

export default CourseOutlineScreen;
