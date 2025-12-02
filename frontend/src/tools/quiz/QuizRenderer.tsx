/**
 * Quiz Tool Renderer
 *
 * Renders a quiz question with text input or multiple choice options.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { ToolRendererProps } from '../types';
import { QuizData } from './types';

export const QuizRenderer: React.FC<ToolRendererProps<QuizData>> = ({
  data,
  context,
}) => {
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const { colors } = useTheme();

  const hasOptions = data.options && data.options.length > 0;

  const handleSubmit = () => {
    const userAnswer = hasOptions
      ? data.options![selectedOption!]
      : answer.trim();

    const expectedLower = data.expectedAnswer.toLowerCase().trim();
    const userLower = userAnswer.toLowerCase().trim();

    // Check if answer is correct (flexible matching)
    const correct =
      userLower === expectedLower ||
      userLower.includes(expectedLower) ||
      expectedLower.includes(userLower);

    setIsCorrect(correct);
    setIsSubmitted(true);
  };

  const handleContinue = () => {
    const userAnswer = hasOptions
      ? data.options![selectedOption!]
      : answer.trim();

    context.onComplete({
      score: isCorrect ? 100 : 0,
      userAnswer,
    });
  };

  const canSubmit = hasOptions ? selectedOption !== null : answer.trim() !== '';

  return (
    <View style={styles.container}>
      {/* Question */}
      <Card elevation="sm" padding="lg" style={styles.questionCard}>
        <Text style={[styles.question, { color: colors.text.primary }]}>
          {data.question}
        </Text>
      </Card>

      {/* Answer Input */}
      {hasOptions ? (
        <Card elevation="sm" padding="lg" style={styles.optionsCard}>
          {data.options!.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrectOption =
              isSubmitted &&
              option.toLowerCase() === data.expectedAnswer.toLowerCase();
            const isWrongSelection =
              isSubmitted && isSelected && !isCorrectOption;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.option,
                  { borderColor: colors.border },
                  isSelected && styles.optionSelected,
                  isSelected && { borderColor: colors.primary },
                  isCorrectOption && styles.optionCorrect,
                  isWrongSelection && styles.optionIncorrect,
                ]}
                onPress={() => !isSubmitted && setSelectedOption(idx)}
                disabled={isSubmitted}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionText, { color: colors.text.primary }]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>
      ) : (
        <Card elevation="sm" padding="lg" style={styles.inputCard}>
          <Input
            placeholder="Type your answer..."
            value={answer}
            onChangeText={setAnswer}
            multiline
            numberOfLines={3}
            editable={!isSubmitted}
          />
        </Card>
      )}

      {/* Result Feedback */}
      {isSubmitted && (
        <Card
          elevation="sm"
          padding="lg"
          style={
            [
              styles.resultCard,
              {
                backgroundColor: isCorrect
                  ? colors.result.correct
                  : colors.result.incorrect,
              },
            ] as unknown as ViewStyle
          }
        >
          <View style={styles.resultContent}>
            <Text style={styles.resultIcon}>{isCorrect ? '✔️' : '✖️'}</Text>
            <View style={styles.resultTextContainer}>
              <Text style={[styles.resultText, { color: colors.text.primary }]}>
                {isCorrect ? 'Correct!' : `Expected: ${data.expectedAnswer}`}
              </Text>
              {data.explanation && (
                <Text
                  style={[
                    styles.explanationText,
                    { color: colors.text.secondary },
                  ]}
                >
                  {data.explanation}
                </Text>
              )}
            </View>
          </View>
        </Card>
      )}

      {/* Action Button */}
      <View style={styles.buttonContainer}>
        {!isSubmitted ? (
          <Button title="Submit" onPress={handleSubmit} disabled={!canSubmit} />
        ) : (
          <Button
            title="Continue →"
            onPress={handleContinue}
            loading={context.isCompleting}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },
  questionCard: {
    marginBottom: Spacing.sm,
  },
  question: {
    ...Typography.body.medium,
    lineHeight: 26,
    fontWeight: '500',
  },
  optionsCard: {
    gap: Spacing.sm,
  },
  option: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.xs,
  },
  optionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
  },
  optionText: {
    ...Typography.body.medium,
  },
  inputCard: {
    marginBottom: Spacing.sm,
  },
  resultCard: {
    marginBottom: Spacing.sm,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultIcon: {
    fontSize: Spacing.lg,
    marginRight: Spacing.md,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    ...Typography.body.small,
    fontWeight: '600',
  },
  explanationText: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});

export default QuizRenderer;
