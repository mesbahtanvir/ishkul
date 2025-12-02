import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ViewStyle } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { completeStep, getUserDocument } from '../services/memory';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../types/navigation';
import { useScreenTracking } from '../services/analytics';

type QuizScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type QuizScreenRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: QuizScreenNavigationProp;
  route: QuizScreenRouteProp;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  useScreenTracking('Quiz', 'QuizScreen');
  const { step, pathId } = route.params;
  const { setUserDocument } = useUserStore();
  const { updatePath, setActivePath } = useLearningPathsStore();
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const { responsive } = useResponsive();
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
    <View style={styles.container}>
      <ScreenHeader title={step.title || step.topic} onBack={() => navigation.goBack()} />
      <Container scrollable>
        <View style={styles.content}>
          <Card elevation="md" padding="lg" style={styles.headerCard}>
          <View style={styles.header}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>❓</Text>
            <View style={[styles.badge, { backgroundColor: colors.badge.quiz }]}>
              <Text style={[styles.badgeText, { color: colors.white }]}>Quiz</Text>
            </View>
            <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
              {step.title || step.topic}
            </Text>
          </View>
        </Card>

        <Card elevation="sm" padding="lg" style={styles.questionCard}>
          <Text style={[styles.question, { color: colors.text.primary }]}>
            {step.question}
          </Text>
        </Card>

        <Card elevation="sm" padding="lg" style={styles.inputCard}>
          <Input
            placeholder="Type your answer here..."
            value={answer}
            onChangeText={setAnswer}
            multiline
            numberOfLines={4}
            editable={!isSubmitted}
          />
        </Card>

        {isSubmitted && (
          <Card
            elevation="sm"
            padding="lg"
            style={[styles.resultCard, { backgroundColor: isCorrect ? colors.result.correct : colors.result.incorrect }] as unknown as ViewStyle}
          >
            <View style={styles.resultContent}>
              <Text style={styles.resultIcon}>{isCorrect ? '✔️' : '✖️'}</Text>
              <Text style={[styles.resultText, { color: colors.text.primary }]}>
                {isCorrect
                  ? 'Correct! Well done!'
                  : `Not quite. Expected: ${step.expectedAnswer}`}
              </Text>
            </View>
          </Card>
        )}

          <View style={styles.buttonContainer}>
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
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.md,
  },
  headerCard: {
    marginBottom: Spacing.sm,
  },
  header: {
    alignItems: 'center',
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
  questionCard: {
    marginBottom: Spacing.sm,
  },
  question: {
    ...Typography.body.medium,
    lineHeight: 26,
    fontWeight: '500',
  },
  inputCard: {
    marginBottom: Spacing.sm,
  },
  resultCard: {
    marginBottom: Spacing.md,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    fontSize: Spacing.lg,
    marginRight: Spacing.md,
  },
  resultText: {
    flex: 1,
    ...Typography.body.small,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
