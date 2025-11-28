import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { useUserStore } from '../state/userStore';
import { useLearningStore } from '../state/learningStore';
import { getNextStep } from '../services/llmEngine';
import { updateNextStep } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type NextStepScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NextStep'>;

interface NextStepScreenProps {
  navigation: NextStepScreenNavigationProp;
}

export const NextStepScreen: React.FC<NextStepScreenProps> = ({ navigation }) => {
  const { userDocument } = useUserStore();
  const { currentStep, setCurrentStep, setLoading } = useLearningStore();
  const [isLoadingStep, setIsLoadingStep] = useState(true);
  const { responsive, isSmallPhone } = useResponsive();

  useEffect(() => {
    loadNextStep();
  }, []);

  const loadNextStep = async () => {
    if (!userDocument) return;

    try {
      setIsLoadingStep(true);
      setLoading(true);

      if (userDocument.nextStep) {
        setCurrentStep(userDocument.nextStep);
      } else {
        const response = await getNextStep({
          goal: userDocument.goal,
          level: userDocument.level,
          memory: userDocument.memory,
          history: userDocument.history,
        });

        await updateNextStep(response.nextStep);
        setCurrentStep(response.nextStep);
      }
    } catch (error) {
      console.error('Error loading next step:', error);
      Alert.alert('Error', 'Failed to load next step. Please try again.');
    } finally {
      setIsLoadingStep(false);
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!currentStep) return;

    switch (currentStep.type) {
      case 'lesson':
        navigation.navigate('Lesson', { step: currentStep });
        break;
      case 'quiz':
        navigation.navigate('Quiz', { step: currentStep });
        break;
      case 'practice':
        navigation.navigate('Practice', { step: currentStep });
        break;
    }
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

  if (!currentStep) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorEmoji, { fontSize: errorEmojiSize }]}>⚠️</Text>
          <Text style={styles.errorTitle}>No Step Available</Text>
          <Text style={styles.errorText}>
            Unable to load the next learning step.
          </Text>
          <Button title="Try Again" onPress={loadNextStep} />
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

  return (
    <Container>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.emoji, { fontSize: mainEmojiSize }]}>{getStepIcon()}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getStepTypeLabel()}</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            {currentStep.title || currentStep.topic}
          </Text>
          <Text style={[styles.subtitle, isSmallPhone && styles.subtitleSmall]}>
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
    justifyContent: 'space-between',
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
    backgroundColor: Colors.badge.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.md,
  },
  badgeText: {
    color: Colors.white,
    ...Typography.body.small,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    ...Typography.body.medium,
    color: Colors.ios.gray,
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
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body.medium,
    color: Colors.ios.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
