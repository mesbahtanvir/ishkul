/**
 * LearningLayout - Unified layout for all learning screens
 *
 * Provides consistent sidebar (web) / progress bar (mobile) navigation
 * across lesson, generation, and completion screens.
 *
 * Updated to support the new Section/Lesson structure instead of legacy Steps.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from './Container';
import { ProgressBar } from './ProgressBar';
import { CourseOutlineDrawer } from './CourseOutlineDrawer';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { useCoursesStore } from '../state/coursesStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import {
  Course,
  Section,
  Lesson,
  LessonPosition,
  LessonStatus,
  getCourseTitle,
} from '../types/app';
import { RootStackParamList } from '../types/navigation';

const SIDEBAR_WIDTH = 320;
const COLLAPSED_WIDTH = 48;

interface LearningLayoutProps {
  /** Course ID to display in sidebar */
  courseId: string;
  /** Current lesson position (for highlighting) */
  currentPosition?: LessonPosition | null;
  /** Children to render in main content area */
  children: React.ReactNode;
  /** Whether to show back button */
  showBackButton?: boolean;
  /** Custom title for header (mobile only) */
  title?: string;
  /** Whether content is scrollable */
  scrollable?: boolean;
}

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
 * Section card component for sidebar
 */
interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isCurrentSection: boolean;
  currentLessonId: string | null;
  onLessonPress: (lesson: Lesson, sectionId: string) => void;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  sectionIndex,
  isCurrentSection,
  currentLessonId,
  onLessonPress,
  expanded,
  onToggle,
  colors,
}) => {
  const completedLessons = section.lessons.filter((l) => l.status === 'completed').length;
  const totalLessons = section.lessons.length;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <View
      style={[
        styles.sectionCard,
        { borderColor: colors.border },
        isCurrentSection && {
          borderColor: colors.primary + '4D',
          backgroundColor: colors.primary + '08',
        },
      ]}
    >
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
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
              <Text style={[styles.sectionNumberText, { color: colors.white }]}>
                {sectionIndex + 1}
              </Text>
            )}
          </View>
          <View style={styles.sectionInfo}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]} numberOfLines={2}>
              {section.title}
            </Text>
            <Text style={[styles.sectionStats, { color: colors.text.secondary }]}>
              {completedLessons}/{totalLessons} lessons
              {section.estimatedMinutes > 0 && ` • ${section.estimatedMinutes} min`}
            </Text>
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
        <Text style={[styles.expandIcon, { color: colors.text.secondary }]}>
          {expanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.lessonsList, { borderTopColor: colors.divider }]}>
          {section.lessons.map((lesson) => {
            const isCurrentLesson = currentLessonId === lesson.id;

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
                onPress={() => onLessonPress(lesson, section.id)}
                disabled={lesson.status === 'locked'}
                activeOpacity={0.7}
              >
                <Text style={styles.lessonIcon}>{getLessonStatusIcon(lesson.status)}</Text>
                <View style={styles.lessonContent}>
                  <Text
                    style={[
                      styles.lessonTitle,
                      {
                        color: getLessonStatusColor(lesson.status, colors),
                        opacity: lesson.status === 'locked' ? 0.5 : 1,
                      },
                      lesson.status === 'completed' && styles.completedLessonTitle,
                    ]}
                    numberOfLines={2}
                  >
                    {lesson.title}
                  </Text>
                  {lesson.estimatedMinutes > 0 && (
                    <Text style={[styles.lessonDuration, { color: colors.text.tertiary }]}>
                      {lesson.estimatedMinutes} min
                    </Text>
                  )}
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

/**
 * Learning Sidebar component (web/tablet)
 */
interface LearningSidebarProps {
  course: Course;
  currentPosition?: LessonPosition | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLessonPress: (lesson: Lesson, sectionId: string) => void;
}

const LearningSidebar: React.FC<LearningSidebarProps> = ({
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
        <TouchableOpacity style={styles.collapseToggle} onPress={onToggleCollapse} activeOpacity={0.7}>
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
        <TouchableOpacity style={styles.collapseButton} onPress={onToggleCollapse} activeOpacity={0.7}>
          <Text style={[styles.collapseIcon, { color: colors.primary }]}>«</Text>
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

/**
 * Mobile progress bar (tappable)
 */
interface MobileProgressBarProps {
  course: Course;
  currentPosition?: LessonPosition | null;
  onPress: () => void;
}

const MobileProgressBar: React.FC<MobileProgressBarProps> = ({
  course,
  currentPosition,
  onPress,
}) => {
  const { colors } = useTheme();

  const sections = course.outline?.sections || [];
  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.status === 'completed').length,
    0
  );
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Get current lesson title
  let currentLessonTitle = '';
  if (currentPosition && course.outline?.sections) {
    const section = course.outline.sections.find((s) => s.id === currentPosition.sectionId);
    const lesson = section?.lessons.find((l) => l.id === currentPosition.lessonId);
    if (lesson) {
      currentLessonTitle = lesson.title;
    }
  }

  return (
    <TouchableOpacity
      style={[styles.mobileProgressBar, { backgroundColor: colors.background.secondary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mobileProgressContent}>
        <View style={styles.mobileProgressInfo}>
          <View style={styles.mobileProgressTextRow}>
            <Text style={[styles.mobileProgressLabel, { color: colors.text.secondary }]} numberOfLines={1}>
              {currentLessonTitle ? (
                <>
                  <Text style={[styles.mobileCurrentLabel, { color: colors.primary }]}>Now: </Text>
                  <Text style={{ color: colors.text.primary }}>
                    {currentLessonTitle}
                  </Text>
                </>
              ) : (
                `${completedLessons} of ${totalLessons} lessons`
              )}
            </Text>
            <Text style={[styles.mobileProgressPercent, { color: colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
          <View style={[styles.mobileProgressBarTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.mobileProgressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.mobileTapIndicator}>
          <Text style={[styles.mobileTapIcon, { color: colors.text.tertiary }]}>📋</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Custom hook that safely gets navigation - returns null if not in NavigationContainer
 */
function useSafeNavigation() {
  try {
    return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  } catch {
    return null;
  }
}

export const LearningLayout: React.FC<LearningLayoutProps> = ({
  courseId,
  currentPosition,
  children,
  showBackButton = true,
  title,
  scrollable = true,
}) => {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const navigation = useSafeNavigation();
  const { activeCourse } = useCoursesStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Get course data
  const course = activeCourse?.id === courseId ? activeCourse : null;

  // Don't show sidebar if no course or no outline with sections
  const hasOutline = course?.outline?.sections && course.outline.sections.length > 0;
  const showSidebar = !isMobile && hasOutline && Platform.OS === 'web' && navigation;

  const handleLessonPress = (lesson: Lesson, sectionId: string) => {
    if (lesson.status === 'locked' || !navigation) return;

    setDrawerVisible(false);
    navigation.navigate('Lesson', {
      courseId,
      lessonId: lesson.id,
      sectionId,
      lesson,
    });
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  // Main content wrapper
  const MainContent = scrollable ? (
    <Container scrollable>{children}</Container>
  ) : (
    <View style={styles.mainContent}>{children}</View>
  );

  // Mobile layout
  if (isMobile || !showSidebar) {
    return (
      <Container>
        {/* Mobile header */}
        {(showBackButton || title) && (
          <View style={styles.mobileHeader}>
            {showBackButton && navigation && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
              </TouchableOpacity>
            )}
            {title && (
              <Text style={[styles.mobileTitle, { color: colors.text.primary }]} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>
        )}

        {/* Mobile progress bar */}
        {course && hasOutline && (
          <MobileProgressBar
            course={course}
            currentPosition={currentPosition}
            onPress={() => setDrawerVisible(true)}
          />
        )}

        {/* Main content */}
        {MainContent}

        {/* Drawer for mobile outline navigation */}
        {course && hasOutline && (
          <CourseOutlineDrawer
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            outline={course.outline || null}
            currentPosition={course.outlinePosition}
            onTopicPress={() => {
              // Legacy topic press - close drawer
              setDrawerVisible(false);
            }}
          />
        )}
      </Container>
    );
  }

  // Web layout with sidebar
  return (
    <Container>
      <View style={styles.webLayout}>
        {/* Sidebar */}
        {course && (
          <LearningSidebar
            course={course}
            currentPosition={currentPosition}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onLessonPress={handleLessonPress}
          />
        )}

        {/* Main content */}
        <View style={styles.webContent}>{MainContent}</View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  // Web layout
  webLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  webContent: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },

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

  // Section card
  sectionCard: {
    marginBottom: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
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
    ...Typography.label.small,
    fontSize: 11,
    marginBottom: 4,
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

  // Lessons list
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
    fontSize: 14,
    marginRight: Spacing.xs,
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

  // Mobile header
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  mobileTitle: {
    ...Typography.heading.h4,
    flex: 1,
    marginLeft: Spacing.md,
  },

  // Mobile progress bar
  mobileProgressBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  mobileProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileProgressInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  mobileProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mobileProgressLabel: {
    ...Typography.body.small,
    flex: 1,
    marginRight: Spacing.sm,
  },
  mobileCurrentLabel: {
    fontWeight: '600',
  },
  mobileProgressPercent: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  mobileProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mobileProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  mobileTapIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileTapIcon: {
    fontSize: 18,
  },
});

export default LearningLayout;
