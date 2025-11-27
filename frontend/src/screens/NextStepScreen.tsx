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
import { RootStackParamList } from '../types/navigation';

type NextStepScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NextStep'>;

interface NextStepScreenProps {
  navigation: NextStepScreenNavigationProp;
}

export const NextStepScreen: React.FC<NextStepScreenProps> = ({ navigation }) => {
  const { userDocument } = useUserStore();
  const { currentStep, setCurrentStep, setLoading } = useLearningStore();
  const [isLoadingStep, setIsLoadingStep] = useState(true);

  useEffect(() => {
    loadNextStep();
  }, []);

  const loadNextStep = async () => {
    if (!userDocument) return;

    try {
      setIsLoadingStep(true);
      setLoading(true);

      // Check if there's already a next step stored
      if (userDocument.nextStep) {
        setCurrentStep(userDocument.nextStep);
      } else {
        // Call LLM engine to get next step
        const response = await getNextStep({
          goal: userDocument.goal,
          level: userDocument.level,
          memory: userDocument.memory,
          history: userDocument.history,
        });

        // Update Firestore with the next step
        await updateNextStep(response.nextStep);

        // Update local state
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

    // Navigate to appropriate screen based on step type
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

  if (isLoadingStep) {
    return <LoadingScreen />;
  }

  if (!currentStep) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
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
          <Text style={styles.emoji}>{getStepIcon()}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getStepTypeLabel()}</Text>
          </View>
          <Text style={styles.title}>{currentStep.title || currentStep.topic}</Text>
          <Text style={styles.subtitle}>
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
    fontSize: 80,
    marginBottom: 24,
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
});
