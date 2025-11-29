import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { completePathStep, getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type QuizScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type QuizScreenRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: QuizScreenNavigationProp;
  route: QuizScreenRouteProp;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { step, pathId } = route.params;
  const { setUserDocument } = useUserStore();
  const { updatePath, setCurrentStep } = useLearningPathsStore();
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();

  const handleSubmit = () => {
    const userAnswer = answer.trim().toLowerCase();
    const expectedAnswer = (step.expectedAnswer || '').trim().toLowerCase();
    const correct = userAnswer.includes(expectedAnswer) || expectedAnswer.includes(userAnswer);

    setIsCorrect(correct);
    setIsSubmitted(true);
  };

  const handleNextStep = async () => {
    try {
      setLoading(true);

      // Complete the step with score
      const result = await completePathStep(pathId, {
        type: 'quiz',
        topic: step.topic,
        score: isCorrect ? 100 : 0,
      });

      // Update local state
      updatePath(pathId, result.path);
      setCurrentStep(pathId, result.nextStep);

      // Refresh user document
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Navigate back to session
      navigation.navigate('LearningSession', { pathId });
    } catch (error) {
      console.error('Error completing quiz:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Responsive values
  const emojiSize = responsive(48, 60, 68, 76);
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>❓</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Quiz</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            {step.title || step.topic}
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.question}>{step.question}</Text>

          <Input
            placeholder="Type your answer here..."
            value={answer}
            onChangeText={setAnswer}
            multiline
            numberOfLines={4}
            editable={!isSubmitted}
            containerStyle={styles.inputContainer}
          />

          {isSubmitted && (
            <View style={[styles.resultContainer, isCorrect ? styles.correct : styles.incorrect]}>
              <Text style={styles.resultIcon}>{isCorrect ? '✔️' : '✖️'}</Text>
              <Text style={styles.resultText}>
                {isCorrect
                  ? 'Correct! Well done!'
                  : `Not quite. Expected: ${step.expectedAnswer}`}
              </Text>
            </View>
          )}
        </View>

        {!isSubmitted ? (
          <Button
            title="Submit"
            onPress={handleSubmit}
            disabled={!answer.trim()}
          />
        ) : (
          <Button
            title="Next Step →"
            onPress={handleNextStep}
            loading={loading}
          />
        )}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.badge.quiz,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    color: Colors.white,
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  question: {
    ...Typography.body.medium,
    lineHeight: 26,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  resultContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  correct: {
    backgroundColor: Colors.result.correct,
  },
  incorrect: {
    backgroundColor: Colors.result.incorrect,
  },
  resultIcon: {
    fontSize: Spacing.lg,
    marginRight: Spacing.sm,
  },
  resultText: {
    flex: 1,
    ...Typography.body.small,
    fontWeight: '500',
    color: Colors.text.primary,
  },
});
