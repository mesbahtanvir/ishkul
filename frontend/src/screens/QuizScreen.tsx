import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningStore } from '../state/learningStore';
import { updateUserHistory, clearNextStep, getUserDocument } from '../services/memory';
import { HistoryEntry, NextStep } from '../types/app';
import { RootStackParamList } from '../types/navigation';

type QuizScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;

interface QuizScreenProps {
  navigation: QuizScreenNavigationProp;
  route: { params: { step: NextStep } };
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ navigation, route }) => {
  const { step } = route.params;
  const { userDocument, setUserDocument } = useUserStore();
  const { clearCurrentStep } = useLearningStore();
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    // Simple answer checking (case-insensitive, trimmed)
    const userAnswer = answer.trim().toLowerCase();
    const expectedAnswer = (step.expectedAnswer || '').trim().toLowerCase();
    const correct = userAnswer.includes(expectedAnswer) || expectedAnswer.includes(userAnswer);

    setIsCorrect(correct);
    setIsSubmitted(true);
  };

  const handleNextStep = async () => {
    if (!userDocument) return;

    try {
      setLoading(true);

      // Create history entry
      const historyEntry: HistoryEntry = {
        type: 'quiz',
        topic: step.topic,
        score: isCorrect ? 100 : 0,
        timestamp: Date.now(),
      };

      // Update Firestore
      await updateUserHistory(historyEntry);
      await clearNextStep();

      // Update local state
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Clear current step
      clearCurrentStep();

      // Navigate back to NextStep screen
      navigation.navigate('NextStep');
    } catch (error) {
      console.error('Error completing quiz:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>❓</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Quiz</Text>
          </View>
          <Text style={styles.title}>{step.title || step.topic}</Text>
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
    marginBottom: 32,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: 24,
  },
  question: {
    fontSize: 17,
    lineHeight: 26,
    color: '#000000',
    marginBottom: 24,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  resultContainer: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  correct: {
    backgroundColor: '#E7F7EF',
  },
  incorrect: {
    backgroundColor: '#FFE8E8',
  },
  resultIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
});
