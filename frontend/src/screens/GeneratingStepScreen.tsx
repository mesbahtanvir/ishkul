/**
 * GeneratingStepScreen - Engaging loading experience during step generation
 *
 * This screen provides a smooth, engaging experience while waiting for
 * AI-generated content. Instead of showing a spinner, it keeps users
 * engaged with animations and tips, then smoothly transitions to the content.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../components/ScreenHeader';
import { GeneratingContent } from '../components/GeneratingContent';
import { LessonSkeleton } from '../components/skeletons/LessonSkeleton';
import { QuizSkeleton } from '../components/skeletons/QuizSkeleton';
import { PracticeSkeleton } from '../components/skeletons/PracticeSkeleton';
import { useCoursesStore } from '../state/coursesStore';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { getCourseNextStep, getCourse } from '../services/memory';
import { ApiError, ErrorCodes } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../types/navigation';
import { Step } from '../types/app';
import { useScreenTracking, useAITracking } from '../services/analytics';
import type { StepType as AnalyticsStepType } from '../services/analytics/events';

type GeneratingStepScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'GeneratingStep'
>;

type LoadingPhase = 'generating' | 'skeleton' | 'ready';

export const GeneratingStepScreen: React.FC<GeneratingStepScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('GeneratingStep', 'GeneratingStepScreen');
  const { courseId, topic } = route.params;
  const { activeCourse, setActiveCourse, addStep } = useCoursesStore();
  const { showUpgradePrompt } = useSubscriptionStore();
  const { colors } = useTheme();

  const [phase, setPhase] = useState<LoadingPhase>('generating');
  const [step, setStep] = useState<Step | null>(null);
  // Error state setter for error handling
  const setError = useState<string | null>(null)[1];

  // Animation values for smooth transitions
  const generatingOpacity = useRef(new Animated.Value(1)).current;
  const skeletonOpacity = useRef(new Animated.Value(0)).current;

  // AI tracking
  const { startRequest, completeRequest, trackError } = useAITracking();

  useEffect(() => {
    fetchNextStep();
  }, [courseId]);

  const fetchNextStep = async () => {
    const currentProgress = activeCourse?.progress || 0;

    try {
      // Track AI request start
      const requestId = startRequest(courseId, currentProgress);

      // Fetch the next step
      const { step: newStep } = await getCourseNextStep(courseId);

      // Track successful AI response (only for analytics-supported step types)
      const analyticsStepType = newStep.type as AnalyticsStepType;
      if (['lesson', 'quiz', 'practice', 'review', 'summary'].includes(newStep.type)) {
        await completeRequest(
          requestId,
          courseId,
          analyticsStepType,
          newStep.topic,
          'gemini-2.0-flash'
        );
      }

      // Add step to local state
      addStep(courseId, newStep);

      // Refresh the path
      const updatedPath = await getCourse(courseId);
      if (updatedPath) {
        setActiveCourse(updatedPath);
      }

      setStep(newStep);

      // Transition: fade out generating, show skeleton briefly, then navigate
      transitionToContent(newStep);
    } catch (err) {
      // Track error
      await trackError(
        courseId,
        err instanceof Error ? err.message : 'Unknown error',
        0
      );

      console.error('Error generating step:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate step');

      // Check if this is a daily step limit error
      if (err instanceof ApiError && err.code === ErrorCodes.DAILY_STEP_LIMIT_REACHED) {
        // Show upgrade modal and go back
        showUpgradePrompt('step_limit');
        navigation.goBack();
      } else {
        Alert.alert(
          'Generation Failed',
          'Unable to generate your next step. Please try again.',
          [
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Retry',
              onPress: () => {
                setError(null);
                setPhase('generating');
                fetchNextStep();
              },
            },
          ]
        );
      }
    }
  };

  const transitionToContent = (newStep: Step) => {
    // Phase 1: Show skeleton for the step type (brief)
    setPhase('skeleton');

    Animated.timing(generatingOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(skeletonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        // Short delay to show skeleton, then navigate
        setTimeout(() => {
          // Navigate to actual step screen with the step data
          navigation.replace('Step', { step: newStep, courseId });
        }, 300);
      });
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Render skeleton based on step type
  const renderSkeleton = () => {
    if (!step) return <LessonSkeleton onBack={handleBack} />;

    switch (step.type) {
      case 'quiz':
        return <QuizSkeleton onBack={handleBack} />;
      case 'practice':
        return <PracticeSkeleton onBack={handleBack} />;
      case 'lesson':
      case 'review':
      case 'summary':
      default:
        return <LessonSkeleton onBack={handleBack} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Generating phase - engaging loader */}
      {phase === 'generating' && (
        <Animated.View style={[styles.fullScreen, { opacity: generatingOpacity }]}>
          <ScreenHeader title="" onBack={handleBack} />
          <GeneratingContent
            contentType="lesson"
            topic={topic || activeCourse?.goal}
          />
        </Animated.View>
      )}

      {/* Skeleton phase - brief skeleton before content */}
      {phase === 'skeleton' && (
        <Animated.View style={[styles.fullScreen, { opacity: skeletonOpacity }]}>
          {renderSkeleton()}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default GeneratingStepScreen;
