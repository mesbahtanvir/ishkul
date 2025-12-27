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
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from './Container';
import { CourseOutlineDrawer } from './CourseOutlineDrawer';
import {
  LearningSidebar,
  GeneratingSidebar,
  MobileProgressBar,
  GeneratingMobileProgressBar,
} from './LearningLayout/index';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import { useCoursesStore } from '../state/coursesStore';
import { useUIPreferencesStore } from '../state/uiPreferencesStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { Lesson, LessonPosition } from '../types/app';
import { RootStackParamList } from '../types/navigation';

export const SIDEBAR_WIDTH = 320;
export const COLLAPSED_WIDTH = 48;

export interface LearningLayoutProps {
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
  /**
   * Callback for lesson selection from sidebar (SPA-like navigation).
   * When provided, clicking a lesson in sidebar calls this instead of navigating.
   * Used by CourseViewScreen for internal state management.
   */
  onLessonSelect?: (lesson: Lesson, sectionId: string) => void;
  /**
   * Whether the course is in generating state (outline being created).
   * When true, shows a blurred skeleton sidebar instead of the actual outline.
   */
  isGenerating?: boolean;
  /** Course title for generating state display */
  courseTitle?: string;
}

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
  onLessonSelect,
  isGenerating = false,
  courseTitle,
}) => {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const navigation = useSafeNavigation();
  const { activeCourse } = useCoursesStore();
  const { sidebarCollapsed, toggleSidebar } = useUIPreferencesStore();

  const [drawerVisible, setDrawerVisible] = useState(false);

  // Keyboard shortcut for toggling sidebar (Ctrl/Cmd + B)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+B (Windows/Linux) or Cmd+B (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Get course data
  const course = activeCourse?.id === courseId ? activeCourse : null;

  // Don't show sidebar if no course or no outline with sections
  const hasOutline = course?.outline?.sections && course.outline.sections.length > 0;
  const showSidebar = !isMobile && hasOutline && Platform.OS === 'web' && navigation;

  const handleLessonPress = (lesson: Lesson, sectionId: string) => {
    if (lesson.status === 'locked') return;

    setDrawerVisible(false);

    // Use callback for SPA-like navigation if provided (CourseViewScreen)
    if (onLessonSelect) {
      onLessonSelect(lesson, sectionId);
      return;
    }

    // Fallback to regular navigation (legacy LessonScreen usage)
    if (navigation) {
      navigation.navigate('CourseView', {
        courseId,
        lessonId: lesson.id,
        sectionId,
      });
    }
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

        {/* Mobile progress bar - show skeleton when generating */}
        {isGenerating ? (
          <GeneratingMobileProgressBar courseTitle={courseTitle} />
        ) : (
          course && hasOutline && (
            <MobileProgressBar
              course={course}
              currentPosition={currentPosition}
              onPress={() => setDrawerVisible(true)}
            />
          )
        )}

        {/* Main content */}
        {MainContent}

        {/* Drawer for mobile outline navigation */}
        {course && hasOutline && (
          <CourseOutlineDrawer
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            outline={course.outline || null}
            currentPosition={course.currentPosition}
            onLessonPress={() => {
              // Close drawer when lesson is pressed
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
        {/* Sidebar - show skeleton when generating, real sidebar otherwise */}
        {isGenerating ? (
          <GeneratingSidebar courseTitle={courseTitle} />
        ) : (
          course && (
            <LearningSidebar
              course={course}
              currentPosition={currentPosition}
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              onLessonPress={handleLessonPress}
            />
          )
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
});

export default LearningLayout;
