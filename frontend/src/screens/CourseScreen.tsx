import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProgressBar } from '../components/ProgressBar';
import { StepCard } from '../components/StepCard';
import { CourseOutlineDrawer } from '../components/CourseOutlineDrawer';
import { CourseOutlineSidebar } from '../components/CourseOutlineSidebar';
import { CourseProgressBar } from '../components/CourseProgressBar';
import { OutlineLoadingOverlay } from '../components/OutlineLoadingOverlay';
import { useCoursesStore, getCurrentStep } from '../state/coursesStore';
import { getCourse, viewStep } from '../services/memory';
import { coursesApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { Step, CourseStatuses, OutlineStatuses } from '../types/app';
import { useScreenTracking } from '../services/analytics';
import { usesNewStructure } from '../utils/courseHelpers';

type CourseScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Course'
>;
type CourseScreenRouteProp = RouteProp<RootStackParamList, 'Course'>;

interface CourseScreenProps {
  navigation: CourseScreenNavigationProp;
  route: CourseScreenRouteProp;
}

export const CourseScreen: React.FC<CourseScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('Course', 'CourseScreen');
  const { courseId } = route.params;
  const { activeCourse, setActiveCourse } = useCoursesStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [outlineDrawerVisible, setOutlineDrawerVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { responsive, isMobile } = useResponsive();
  const { colors } = useTheme();

  useEffect(() => {
    loadPath();
  }, [courseId]);

  const loadPath = async () => {
    try {
      setIsLoading(true);

      // Check if we have a valid cache for this path
      const store = useCoursesStore.getState();
      const cached = store.getCachedCourse(courseId);
      const pathCache = store.coursesCache.get(courseId) || null;

      let path = cached;
      if (!store.isCacheValid(pathCache)) {
        // Cache expired or doesn't exist, fetch from API
        path = await getCourse(courseId);
      }

      if (path) {
        setActiveCourse(path);

        // Check if this course uses the new section/lesson structure
        // If so, redirect to the new CourseOutlineScreen
        if (usesNewStructure(path)) {
          navigation.replace('CourseOutline', { courseId });
          return;
        }
      } else {
        Alert.alert('Error', 'Course not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading learning path:', error);
      Alert.alert('Error', 'Failed to load track. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to GeneratingStepScreen for smooth loading experience
  const navigateToGenerateStep = () => {
    navigation.navigate('GeneratingStep', {
      courseId,
      topic: activeCourse?.goal,
    });
  };

  // Poll for outline status when generating
  const pollOutlineStatus = useCallback(async () => {
    try {
      const fetchedPath = await coursesApi.getCourse(courseId);
      if (fetchedPath) {
        setActiveCourse(fetchedPath);
        // Return true if outline is ready or failed (stop polling)
        return fetchedPath.outlineStatus === OutlineStatuses.READY ||
               fetchedPath.outlineStatus === OutlineStatuses.FAILED;
      }
      return false;
    } catch (error) {
      console.error('Error polling outline status:', error);
      return false;
    }
  }, [courseId, setActiveCourse]);

  useEffect(() => {
    // Only poll if outline is generating
    if (!activeCourse?.outlineStatus || activeCourse.outlineStatus !== OutlineStatuses.GENERATING) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let mounted = true;

    const startPolling = async () => {
      // Poll every 2 seconds
      intervalId = setInterval(async () => {
        if (!mounted) return;
        const shouldStop = await pollOutlineStatus();
        if (shouldStop) {
          clearInterval(intervalId);
        }
      }, 2000);
    };

    startPolling();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeCourse?.outlineStatus, pollOutlineStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPath();
    setRefreshing(false);
  };

  const handleStepPress = async (step: Step) => {
    if (step.completed) {
      // View completed step (read-only)
      try {
        // Record the view to update lastReviewed
        await viewStep(courseId, step.id);
      } catch (error) {
        // Log detailed error information
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error recording step view:', { message: errorMessage, error });
        // Show alert but still navigate to step details
        Alert.alert(
          'Warning',
          'Could not record your step view. Your progress may not be fully synchronized.'
        );
      }
      navigation.navigate('StepDetail', { step, courseId });
    } else {
      // Start the active step
      handleStartStep(step);
    }
  };

  const handleStartStep = (step: Step) => {
    // Use generic StepScreen which uses tool registry for dynamic rendering
    navigation.navigate('Step', { step, courseId });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    if (!activeCourse) return;

    // Don't allow generating new steps for completed/archived paths
    const isPathActive = !activeCourse.status || activeCourse.status === CourseStatuses.ACTIVE;

    const currentStep = getCurrentStep(activeCourse.steps ?? []);
    if (currentStep) {
      handleStartStep(currentStep);
    } else if (isPathActive) {
      // Navigate to GeneratingStepScreen for engaging loading experience
      navigateToGenerateStep();
    }
    // For completed paths, do nothing - they can only review steps
  };

  const handleStartNewPath = () => {
    navigation.navigate('GoalSelection', { isCreatingNewCourse: true });
  };

  // Responsive values
  const headerPadding = responsive(Spacing.md, Spacing.lg, Spacing.xl);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!activeCourse) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorEmoji, { fontSize: 56 }]}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            Course Not Found
          </Text>
          <Text style={[styles.errorText, { color: colors.ios.gray }]}>
            Unable to load this track.
          </Text>
          <Button title="Go Back" onPress={handleBack} />
        </View>
      </Container>
    );
  }

  const steps = activeCourse.steps ?? [];
  const currentStep = getCurrentStep(steps);
  const completedSteps = steps.filter((s) => s.completed);
  const hasSteps = steps.length > 0;
  const isPathCompleted = activeCourse.status === CourseStatuses.COMPLETED;
  const isPathArchived = activeCourse.status === CourseStatuses.ARCHIVED;
  const isPathActive = !activeCourse.status || activeCourse.status === CourseStatuses.ACTIVE;
  const isOutlineGenerating = activeCourse.outlineStatus === OutlineStatuses.GENERATING;

  // Handler for outline topic navigation (shared between sidebar and drawer)
  const handleOutlineTopicPress = (moduleIndex: number, topicIndex: number, topic: { stepId?: string }) => {
    // Close drawer if open (mobile)
    setOutlineDrawerVisible(false);
    // If topic has a stepId, find and navigate to that step
    if (topic.stepId) {
      const step = steps.find((s) => s.id === topic.stepId);
      if (step) {
        if (step.completed) {
          navigation.navigate('StepDetail', { step, courseId });
        } else {
          navigation.navigate('Step', { step, courseId });
        }
      }
    }
  };

  // Hide back button on web - navigation is via sidebar
  const showBackButton = Platform.OS !== 'web';
  // Hide header on web/tablet when sidebar is visible (sidebar already shows this info)
  const showSidebar = !isMobile && activeCourse.outline && Platform.OS === 'web';

  // Main content component (shared between mobile and web layouts)
  const MainContent = (
    <View style={styles.mainContent}>
      {/* Top bar with back button (mobile only) */}
      {showBackButton && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Back
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile: Course progress bar (tappable to open outline drawer) */}
      {isMobile && activeCourse.outline && (
        <CourseProgressBar
          outline={activeCourse.outline}
          currentPosition={activeCourse.outlinePosition}
          onPress={() => setOutlineDrawerVisible(true)}
        />
      )}

      {/* Path header - only show on mobile (sidebar has this info on web) */}
      {!showSidebar && (
        <View
          style={[
            styles.pathHeader,
            { backgroundColor: colors.background.secondary, padding: headerPadding },
          ]}
        >
          <View style={styles.pathHeaderTop}>
            <Text style={styles.pathEmoji}>{activeCourse.emoji}</Text>
            <View style={styles.pathInfo}>
              <Text
                style={[styles.pathGoal, { color: colors.text.primary }]}
                numberOfLines={2}
              >
                {activeCourse.goal}
              </Text>
              <Text style={[styles.pathLevel, { color: colors.text.secondary }]}>
                {completedSteps.length} steps completed
              </Text>
            </View>
          </View>
          {/* Only show progress bar if CourseProgressBar is not visible */}
          {!(isMobile && activeCourse.outline) && (
            <View style={styles.progressRow}>
              <ProgressBar
                progress={activeCourse.progress}
                height={8}
                style={styles.progressBar}
              />
            </View>
          )}
        </View>
      )}

      {/* Steps timeline with button at bottom */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.stepsContainer}
        contentContainerStyle={styles.stepsContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Path completed celebration */}
        {isPathCompleted && (
          <View style={styles.completedState}>
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={[styles.completedTitle, { color: colors.text.primary }]}>
              Congratulations!
            </Text>
            <Text style={[styles.completedText, { color: colors.text.secondary }]}>
              You&apos;ve completed this track!
            </Text>
            <View style={[styles.completedBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.completedBadgeText, { color: colors.success }]}>
                {completedSteps.length} steps completed
              </Text>
            </View>
          </View>
        )}

        {/* Path archived notice */}
        {isPathArchived && (
          <View style={styles.archivedState}>
            <Text style={styles.archivedEmoji}>📦</Text>
            <Text style={[styles.archivedTitle, { color: colors.text.primary }]}>
              Path Archived
            </Text>
            <Text style={[styles.archivedText, { color: colors.text.secondary }]}>
              This path is archived. You can review your progress below.
            </Text>
          </View>
        )}

        {/* Empty state for new paths */}
        {!hasSteps && isPathActive && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚀</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Ready to start?
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              Tap continue to begin your learning journey!
            </Text>
          </View>
        )}

        {/* Timeline connector */}
        {hasSteps && (
          <View style={[styles.timeline, { backgroundColor: colors.border }]} />
        )}

        {/* Render all steps */}
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            isCurrentStep={!step.completed && index === steps.length - 1}
            onPress={() => handleStepPress(step)}
          />
        ))}

        {/* Spacer at bottom to allow content to scroll above button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky button at bottom - changes based on path status */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background.primary, borderTopColor: colors.divider }]}>
        {isPathCompleted ? (
          <Button
            title="Start New Track"
            onPress={handleStartNewPath}
          />
        ) : isPathArchived ? (
          <Button
            title="Back to Home"
            onPress={handleBack}
            variant="secondary"
          />
        ) : isOutlineGenerating ? (
          <Button
            title="Preparing Course..."
            onPress={() => {}}
            disabled
          />
        ) : (
          <Button
            title={currentStep ? 'Continue →' : 'Continue'}
            onPress={handleContinue}
          />
        )}
      </View>
    </View>
  );

  return (
    <Container>
      {/* Web/Tablet: Side-by-side layout with sidebar */}
      {showSidebar ? (
        <View style={styles.webLayout}>
          <CourseOutlineSidebar
            outline={activeCourse.outline!}
            currentPosition={activeCourse.outlinePosition}
            onTopicPress={handleOutlineTopicPress}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          {MainContent}
        </View>
      ) : (
        <View style={styles.content}>
          {MainContent}
        </View>
      )}

      {/* Course Outline Drawer (mobile only) */}
      {isMobile && (
        <CourseOutlineDrawer
          visible={outlineDrawerVisible}
          onClose={() => setOutlineDrawerVisible(false)}
          outline={activeCourse.outline || null}
          currentPosition={activeCourse.outlinePosition}
          onTopicPress={handleOutlineTopicPress}
        />
      )}

      {/* Outline Loading Overlay - shows when outline is generating */}
      {isOutlineGenerating && (
        <OutlineLoadingOverlay
          emoji={activeCourse.emoji}
          goal={activeCourse.goal}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  pathHeader: {
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.md,
  },
  pathHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pathEmoji: {
    fontSize: 40,
    marginRight: Spacing.md,
  },
  pathInfo: {
    flex: 1,
  },
  pathGoal: {
    ...Typography.heading.h3,
    marginBottom: Spacing.xs,
  },
  pathLevel: {
    ...Typography.body.small,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
  },
  stepsContainer: {
    flex: 1,
  },
  stepsContent: {
    paddingBottom: Spacing.lg,
    position: 'relative',
  },
  timeline: {
    position: 'absolute',
    left: 30,
    top: 0,
    bottom: 0,
    width: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorEmoji: {
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.heading.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  // Completed path styles
  completedState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  completedTitle: {
    ...Typography.heading.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  completedText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  completedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
  },
  completedBadgeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  // Archived path styles
  archivedState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  archivedEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  archivedTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  archivedText: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
});

export default CourseScreen;
