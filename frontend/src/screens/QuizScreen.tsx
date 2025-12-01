import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { completeStep, getUserDocument } from '../services/memory';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
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
  const { updatePath, setActivePath } = useLearningPathsStore();
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

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

      // Complete the step with score and user answer
      const result = await completeStep(pathId, step.id, {
        userAnswer: answer,
        score: isCorrect ? 100 : 0,
      });

      // Update local state
      updatePath(pathId, result.path);
      setActivePath(result.path);

      // Refresh user document
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Navigate back to learning path timeline
      navigation.navigate('LearningPath', { pathId });
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
          <View style={[styles.badge, { backgroundColor: colors.badge.quiz }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>Quiz</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            {step.title || step.topic}
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={[styles.question, { color: colors.text.primary }]}>{step.question}</Text>

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
            <View style={[styles.resultContainer, { backgroundColor: isCorrect ? colors.result.correct : colors.result.incorrect }]}>
              <Text style={styles.resultIcon}>{isCorrect ? '✔️' : '✖️'}</Text>
              <Text style={[styles.resultText, { color: colors.text.primary }]}>
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
            title="Continue →"
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
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  question: {
    ...Typography.body.medium,
    lineHeight: 26,
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
  resultIcon: {
    fontSize: Spacing.lg,
    marginRight: Spacing.sm,
  },
  resultText: {
    flex: 1,
    ...Typography.body.small,
    fontWeight: '500',
  },
});
