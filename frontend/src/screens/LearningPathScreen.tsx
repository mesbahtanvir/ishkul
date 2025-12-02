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
import { getPathNextStep, getLearningPath, viewStep } from '../services/memory';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { Step } from '../types/app';

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
  const { pathId } = route.params;
  const { activePath, setActivePath, addStep } = useLearningPathsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNextStep, setIsLoadingNextStep] = useState(false);
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

        // If no steps exist or all completed, fetch next step
        const currentStep = getCurrentStep(path.steps);
        if (!currentStep) {
          await fetchNextStep();
        }
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

  const fetchNextStep = async () => {
    try {
      setIsLoadingNextStep(true);
      const { step } = await getPathNextStep(pathId);

      // Add step to local state
      addStep(pathId, step);

      // Refresh the path to get updated data
      const updatedPath = await getLearningPath(pathId);
      if (updatedPath) {
        setActivePath(updatedPath);
      }

      // Scroll to the current step
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error fetching next step:', error);
      Alert.alert('Error', 'Failed to generate next step. Please try again.');
    } finally {
      setIsLoadingNextStep(false);
    }
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
        console.error('Error recording step view:', error);
      }
      navigation.navigate('StepDetail', { step, pathId });
    } else {
      // Start the active step
      handleStartStep(step);
    }
  };

  const handleStartStep = (step: Step) => {
    switch (step.type) {
      case 'lesson':
      case 'review':
      case 'summary':
        navigation.navigate('Lesson', { step, pathId });
        break;
      case 'quiz':
        navigation.navigate('Quiz', { step, pathId });
        break;
      case 'practice':
        navigation.navigate('Practice', { step, pathId });
        break;
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    if (!activePath) return;

    const currentStep = getCurrentStep(activePath.steps);
    if (currentStep) {
      handleStartStep(currentStep);
    } else {
      // Generate next step
      fetchNextStep();
    }
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
          {!hasSteps && !isLoadingNextStep && (
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

          {/* Loading indicator for next step */}
          {isLoadingNextStep && (
            <View style={styles.loadingNextStep}>
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                Generating your next step...
              </Text>
            </View>
          )}

          {/* Spacer at bottom to allow content to scroll above button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Sticky continue button at bottom */}
        <View style={[styles.buttonContainer, { backgroundColor: colors.background.primary }]}>
          <Button
            title={currentStep ? 'Continue →' : 'Get Next Step'}
            onPress={handleContinue}
            loading={isLoadingNextStep}
          />
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
    minWidth: 40,
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
  loadingNextStep: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    ...Typography.body.medium,
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
});

export default LearningPathScreen;
