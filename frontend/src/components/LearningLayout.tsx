import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Container } from './Container';
import { CourseOutlineSidebar } from './CourseOutlineSidebar';
import { useCoursesStore } from '../state/coursesStore';
import { useResponsive } from '../hooks/useResponsive';
import { Step, OutlineTopic } from '../types/app';

interface LearningLayoutProps {
  /** The current step being viewed */
  step: Step;
  /** The path ID */
  courseId: string;
  /** Whether the container should be scrollable */
  scrollable?: boolean;
  /** Children to render in the main content area */
  children: React.ReactNode;
}

/**
 * Custom hook that safely gets navigation - returns null if not in NavigationContainer
 */
function useSafeNavigation() {
  try {
    return useNavigation();
  } catch {
    return null;
  }
}

/**
 * LearningLayout - Shared layout for learning screens
 *
 * On web/tablet: Shows course outline sidebar alongside content
 * On mobile: Shows only the content
 */
export const LearningLayout: React.FC<LearningLayoutProps> = ({
  step,
  courseId,
  scrollable = true,
  children,
}) => {
  const { isMobile } = useResponsive();
  const { activeCourse } = useCoursesStore();
  const navigation = useSafeNavigation();

  // Only show sidebar on web/tablet with an outline and navigation available
  const showSidebar = Platform.OS === 'web' && !isMobile && activeCourse?.outline && navigation;

  // Find current position in outline based on step
  const getCurrentPosition = () => {
    if (!activeCourse?.outline || !step) return null;

    for (let moduleIndex = 0; moduleIndex < activeCourse.outline.modules.length; moduleIndex++) {
      const module = activeCourse.outline.modules[moduleIndex];
      for (let topicIndex = 0; topicIndex < module.topics.length; topicIndex++) {
        const topic = module.topics[topicIndex];
        if (topic.stepId === step.id) {
          return {
            moduleIndex,
            topicIndex,
            moduleId: module.id,
            topicId: topic.id,
          };
        }
      }
    }

    return activeCourse.outlinePosition || null;
  };

  // Handle sidebar topic navigation
  const handleOutlineTopicPress = (
    _moduleIndex: number,
    _topicIndex: number,
    topic: OutlineTopic
  ) => {
    if (!navigation) return;

    if (topic.stepId && topic.stepId !== step.id) {
      const targetStep = activeCourse?.steps.find((s) => s.id === topic.stepId);
      if (targetStep) {
        // Type assertion needed for dynamic navigation
        const nav = navigation as { navigate: (screen: string, params: object) => void };
        if (targetStep.completed) {
          nav.navigate('StepDetail', { step: targetStep, courseId });
        } else {
          nav.navigate('Step', { step: targetStep, courseId });
        }
      }
    }
  };

  const currentPosition = getCurrentPosition();

  // Web layout with sidebar
  if (showSidebar && activeCourse?.outline) {
    return (
      <Container>
        <View style={styles.webLayout}>
          <CourseOutlineSidebar
            outline={activeCourse.outline}
            currentPosition={currentPosition}
            onTopicPress={handleOutlineTopicPress}
          />
          <View style={styles.mainContent}>
            <Container scrollable={scrollable}>{children}</Container>
          </View>
        </View>
      </Container>
    );
  }

  // Mobile layout - just the content
  return <Container scrollable={scrollable}>{children}</Container>;
};

const styles = StyleSheet.create({
  webLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
});

export default LearningLayout;
