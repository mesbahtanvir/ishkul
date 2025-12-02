import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProgressBar } from '../components/ProgressBar';
import { StepCard } from '../components/StepCard';
import { useLearningPathsStore, getCurrentStep } from '../state/learningPathsStore';
import { getLearningPath, viewStep } from '../services/memory';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { Step, PathStatuses } from '../types/app';
import { useScreenTracking } from '../services/analytics';

type LearningPathScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LearningPath'
>;
type LearningPathScreenRouteProp = RouteProp<RootStackParamList, 'LearningPath'>;

interface LearningPathScreenProps {
  navigation: LearningPathScreenNavigationProp;
  route: LearningPathScreenRouteProp;
}

export const LearningPathScreen: React.FC<LearningPathScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('LearningPath', 'LearningPathScreen');
  const { pathId } = route.params;
  const { activePath, setActivePath } = useLearningPathsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { responsive } = useResponsive();
  const { colors } = useTheme();

  useEffect(() => {
    loadPath();
  }, [pathId]);

  const loadPath = async () => {
    try {
      setIsLoading(true);

      // Check if we have a valid cache for this path
      const store = useLearningPathsStore.getState();
      const cached = store.getCachedPath(pathId);
      const pathCache = store.pathsCache.get(pathId) || null;

      let path = cached;
      if (!store.isCacheValid(pathCache)) {
        // Cache expired or doesn't exist, fetch from API
        path = await getLearningPath(pathId);
      }

      if (path) {
        setActivePath(path);
      } else {
        Alert.alert('Error', 'Learning path not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading learning path:', error);
      Alert.alert('Error', 'Failed to load learning path. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to GeneratingStepScreen for smooth loading experience
  const navigateToGenerateStep = () => {
    navigation.navigate('GeneratingStep', {
      pathId,
      topic: activePath?.goal,
    });
  };

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
        await viewStep(pathId, step.id);
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
      navigation.navigate('StepDetail', { step, pathId });
    } else {
      // Start the active step
      handleStartStep(step);
    }
  };

  const handleStartStep = (step: Step) => {
    // Use generic StepScreen which uses tool registry for dynamic rendering
    navigation.navigate('Step', { step, pathId });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    if (!activePath) return;

    // Don't allow generating new steps for completed/archived paths
    const isPathActive = !activePath.status || activePath.status === PathStatuses.ACTIVE;

    const currentStep = getCurrentStep(activePath.steps);
    if (currentStep) {
      handleStartStep(currentStep);
    } else if (isPathActive) {
      // Navigate to GeneratingStepScreen for engaging loading experience
      navigateToGenerateStep();
    }
    // For completed paths, do nothing - they can only review steps
  };

  const handleStartNewPath = () => {
    navigation.navigate('GoalSelection', { isCreatingNewPath: true });
  };

  // Responsive values
  const headerPadding = responsive(Spacing.md, Spacing.lg, Spacing.xl);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!activePath) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorEmoji, { fontSize: 56 }]}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            Path Not Found
          </Text>
          <Text style={[styles.errorText, { color: colors.ios.gray }]}>
            Unable to load this learning path.
          </Text>
          <Button title="Go Back" onPress={handleBack} />
        </View>
      </Container>
    );
  }

  const currentStep = getCurrentStep(activePath.steps);
  const completedSteps = activePath.steps.filter((s) => s.completed);
  const hasSteps = activePath.steps.length > 0;
  const isPathCompleted = activePath.status === PathStatuses.COMPLETED;
  const isPathArchived = activePath.status === PathStatuses.ARCHIVED;
  const isPathActive = !activePath.status || activePath.status === PathStatuses.ACTIVE;

  return (
    <Container>
      <View style={styles.content}>
        {/* Top bar with back button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Back
            </Text>
          </TouchableOpacity>
        </View>

        {/* Path header */}
        <View
          style={[
            styles.pathHeader,
            { backgroundColor: colors.background.secondary, padding: headerPadding },
          ]}
        >
          <View style={styles.pathHeaderTop}>
            <Text style={styles.pathEmoji}>{activePath.emoji}</Text>
            <View style={styles.pathInfo}>
              <Text
                style={[styles.pathGoal, { color: colors.text.primary }]}
                numberOfLines={2}
              >
                {activePath.goal}
              </Text>
              <Text style={[styles.pathLevel, { color: colors.text.secondary }]}>
                {activePath.level.charAt(0).toUpperCase() + activePath.level.slice(1)} •{' '}
                {completedSteps.length} steps completed
              </Text>
            </View>
          </View>
          <View style={styles.progressRow}>
            <ProgressBar
              progress={activePath.progress}
              height={8}
              style={styles.progressBar}
            />
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>
              {Math.round(activePath.progress)}%
            </Text>
          </View>
        </View>

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
                You&apos;ve completed this learning path!
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
          {activePath.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isCurrentStep={!step.completed && index === activePath.steps.length - 1}
              onPress={() => handleStepPress(step)}
            />
          ))}

          {/* Spacer at bottom to allow content to scroll above button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Sticky button at bottom - changes based on path status */}
        <View style={[styles.buttonContainer, { backgroundColor: colors.background.primary }]}>
          {isPathCompleted ? (
            <Button
              title="Start New Learning Path"
              onPress={handleStartNewPath}
            />
          ) : isPathArchived ? (
            <Button
              title="Back to Home"
              onPress={handleBack}
              variant="secondary"
            />
          ) : (
            <Button
              title={currentStep ? 'Continue →' : 'Get Next Step'}
              onPress={handleContinue}
            />
          )}
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  topBar: {
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
  progressText: {
    ...Typography.label.medium,
    marginLeft: Spacing.sm,
    minWidth: 35,
    maxWidth: 50,
    flexShrink: 1,
    textAlign: 'right',
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
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
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

export default LearningPathScreen;
