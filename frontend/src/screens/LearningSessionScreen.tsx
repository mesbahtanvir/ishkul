import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProgressBar } from '../components/ProgressBar';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { getPathNextStep, getLearningPath, updateLearningPath } from '../services/memory';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { NextStep } from '../types/app';

type LearningSessionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LearningSession'
>;
type LearningSessionScreenRouteProp = RouteProp<RootStackParamList, 'LearningSession'>;

interface LearningSessionScreenProps {
  navigation: LearningSessionScreenNavigationProp;
  route: LearningSessionScreenRouteProp;
}

export const LearningSessionScreen: React.FC<LearningSessionScreenProps> = ({
  navigation,
  route,
}) => {
  const { pathId } = route.params;
  const { activePath, setActivePath, setCurrentStep, updatePath } = useLearningPathsStore();
  const [isLoadingStep, setIsLoadingStep] = useState(true);
  const [currentStep, setLocalCurrentStep] = useState<NextStep | null>(null);
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  useEffect(() => {
    loadPathAndStep();
  }, [pathId]);

  const loadPathAndStep = async () => {
    try {
      setIsLoadingStep(true);

      // Load the path if not already active
      let path = activePath;
      if (!path || path.id !== pathId) {
        path = await getLearningPath(pathId);
        if (path) {
          setActivePath(path);
        }
      }

      if (!path) {
        Alert.alert('Error', 'Learning path not found');
        navigation.goBack();
        return;
      }

      // Check if there's a cached current step
      if (path.currentStep) {
        setLocalCurrentStep(path.currentStep);
      } else {
        // Fetch next step from API
        const nextStep = await getPathNextStep(pathId);
        setLocalCurrentStep(nextStep);
        setCurrentStep(pathId, nextStep);
      }

      // Update last accessed time
      await updateLearningPath(pathId, { lastAccessedAt: Date.now() });
      updatePath(pathId, { lastAccessedAt: Date.now() });
    } catch (error) {
      console.error('Error loading learning session:', error);
      Alert.alert('Error', 'Failed to load learning session. Please try again.');
    } finally {
      setIsLoadingStep(false);
    }
  };

  const handleStart = () => {
    if (!currentStep) return;

    switch (currentStep.type) {
      case 'lesson':
        navigation.navigate('Lesson', { step: currentStep, pathId });
        break;
      case 'quiz':
        navigation.navigate('Quiz', { step: currentStep, pathId });
        break;
      case 'practice':
        navigation.navigate('Practice', { step: currentStep, pathId });
        break;
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Responsive values
  const mainEmojiSize = responsive(64, 80, 88, 96);
  const errorEmojiSize = responsive(56, 64, 72, 80);
  const titleSize = responsive(
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize,
    Typography.display.small.fontSize
  );

  if (isLoadingStep) {
    return <LoadingScreen />;
  }

  if (!currentStep || !activePath) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorEmoji, { fontSize: errorEmojiSize }]}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>No Step Available</Text>
          <Text style={[styles.errorText, { color: colors.ios.gray }]}>
            Unable to load the next learning step.
          </Text>
          <Button title="Try Again" onPress={loadPathAndStep} />
        </View>
      </Container>
    );
  }

  const getStepIcon = () => {
    switch (currentStep.type) {
      case 'lesson':
        return '📖';
      case 'quiz':
        return '❓';
      case 'practice':
        return '💪';
      default:
        return '✨';
    }
  };

  const getStepTypeLabel = () => {
    switch (currentStep.type) {
      case 'lesson':
        return 'Lesson';
      case 'quiz':
        return 'Quiz';
      case 'practice':
        return 'Practice';
      default:
        return 'Step';
    }
  };

  const getBadgeColor = () => {
    switch (currentStep.type) {
      case 'lesson':
        return colors.badge.lesson;
      case 'quiz':
        return colors.badge.quiz;
      case 'practice':
        return colors.badge.practice;
      default:
        return colors.badge.primary;
    }
  };

  return (
    <Container>
      <View style={styles.content}>
        {/* Back button and path info */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Path progress header */}
        <View style={[styles.pathHeader, { backgroundColor: colors.background.secondary }]}>
          <Text style={styles.pathEmoji}>{activePath.emoji}</Text>
          <Text style={[styles.pathGoal, { color: colors.text.primary }]} numberOfLines={1}>
            {activePath.goal}
          </Text>
          <View style={styles.progressRow}>
            <ProgressBar
              progress={activePath.progress}
              height={6}
              style={styles.progressBar}
            />
            <Text style={[styles.progressText, { color: colors.text.secondary }]}>{Math.round(activePath.progress)}%</Text>
          </View>
        </View>

        {/* Current step content */}
        <View style={styles.header}>
          <Text style={[styles.emoji, { fontSize: mainEmojiSize }]}>{getStepIcon()}</Text>
          <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>{getStepTypeLabel()}</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            {currentStep.title || currentStep.topic}
          </Text>
          <Text style={[styles.subtitle, { color: colors.ios.gray }, isSmallPhone && styles.subtitleSmall]}>
            Ready for your next learning step?
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Start →" onPress={handleStart} />
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
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pathEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  pathGoal: {
    ...Typography.heading.h4,
    marginBottom: Spacing.sm,
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
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    marginBottom: Spacing.lg,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.md,
  },
  badgeText: {
    ...Typography.body.small,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  subtitleSmall: {
    paddingHorizontal: Spacing.lg,
  },
  buttonContainer: {
    paddingBottom: Spacing.lg,
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

export default LearningSessionScreen;
