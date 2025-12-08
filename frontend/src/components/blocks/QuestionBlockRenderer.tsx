/**
 * QuestionBlockRenderer - Renders interactive question blocks
 *
 * Supports: multiple_choice, true_false, fill_blank, short_answer, code
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { BlockContent, QuestionContent, Option } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Button } from '../Button';
import { MarkdownContent } from '../MarkdownContent';

interface QuestionBlockRendererProps {
  content: BlockContent;
  onAnswer?: (answer: string | string[]) => void;
  onComplete?: () => void;
  isActive?: boolean;
}

export const QuestionBlockRenderer: React.FC<QuestionBlockRendererProps> = ({
  content,
  onAnswer,
  onComplete,
  isActive = false,
}) => {
  const { colors } = useTheme();
  const questionContent = content as QuestionContent;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleOptionSelect = (optionId: string) => {
    if (isSubmitted) return;
    setSelectedOption(optionId);
    onAnswer?.(optionId);
  };

  const handleTextChange = (text: string) => {
    setTextAnswer(text);
    onAnswer?.(text);
  };

  const handleSubmit = () => {
    if (isSubmitted) {
      // Already submitted, move to next
      onComplete?.();
      return;
    }

    // Check answer
    let correct = false;
    if (questionContent.type === 'multiple_choice' || questionContent.type === 'true_false') {
      const correctOption = questionContent.options?.find((o) => o.isCorrect);
      correct = selectedOption === correctOption?.id;
    } else if (questionContent.type === 'fill_blank' || questionContent.type === 'short_answer') {
      // Simple case-insensitive comparison for now
      correct = textAnswer.toLowerCase().trim() === questionContent.correctAnswer?.toLowerCase().trim();
    }

    setIsCorrect(correct);
    setIsSubmitted(true);
  };

  const canSubmit = () => {
    if (questionContent.type === 'multiple_choice' || questionContent.type === 'true_false') {
      return selectedOption !== null;
    }
    return textAnswer.trim().length > 0;
  };

  // Render question text
  const renderQuestion = () => (
    <View style={styles.questionContainer}>
      <MarkdownContent content={questionContent.question} />
    </View>
  );

  // Render options for multiple choice / true-false
  const renderOptions = () => {
    if (!questionContent.options) return null;

    return (
      <View style={styles.optionsContainer}>
        {questionContent.options.map((option: Option) => {
          const isSelected = selectedOption === option.id;
          const showCorrect = isSubmitted && option.isCorrect;
          const showIncorrect = isSubmitted && isSelected && !option.isCorrect;

          let borderColor = colors.border;
          let backgroundColor = 'transparent';

          if (isSelected && !isSubmitted) {
            borderColor = colors.primary;
            backgroundColor = colors.primary + '10';
          } else if (showCorrect) {
            borderColor = colors.success;
            backgroundColor = colors.success + '10';
          } else if (showIncorrect) {
            borderColor = colors.danger;
            backgroundColor = colors.danger + '10';
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                { borderColor, backgroundColor },
              ]}
              onPress={() => handleOptionSelect(option.id)}
              disabled={isSubmitted}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.optionIndicator,
                    {
                      borderColor,
                      backgroundColor: isSelected ? borderColor : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: colors.white }]}>✓</Text>
                  )}
                </View>
                <Text style={[styles.optionText, { color: colors.text.primary }]}>
                  {option.text}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render text input for fill_blank / short_answer
  const renderTextInput = () => (
    <View style={styles.inputContainer}>
      <TextInput
        style={[
          styles.textInput,
          {
            color: colors.text.primary,
            backgroundColor: colors.background.secondary,
            borderColor: isSubmitted
              ? isCorrect
                ? colors.success
                : colors.danger
              : colors.border,
          },
        ]}
        value={textAnswer}
        onChangeText={handleTextChange}
        placeholder={
          questionContent.type === 'fill_blank'
            ? 'Fill in the blank...'
            : 'Type your answer...'
        }
        placeholderTextColor={colors.text.secondary}
        multiline={questionContent.type === 'short_answer'}
        numberOfLines={questionContent.type === 'short_answer' ? 3 : 1}
        editable={!isSubmitted}
      />
    </View>
  );

  // Render feedback after submission
  const renderFeedback = () => {
    if (!isSubmitted) return null;

    return (
      <View
        style={[
          styles.feedbackContainer,
          {
            backgroundColor: isCorrect ? colors.success + '10' : colors.danger + '10',
            borderColor: isCorrect ? colors.success : colors.danger,
          },
        ]}
      >
        <Text style={styles.feedbackIcon}>{isCorrect ? '✅' : '❌'}</Text>
        <Text
          style={[
            styles.feedbackText,
            { color: isCorrect ? colors.success : colors.danger },
          ]}
        >
          {isCorrect ? 'Correct!' : 'Not quite right'}
        </Text>
        {questionContent.explanation && (
          <View style={styles.explanationContainer}>
            <MarkdownContent content={questionContent.explanation} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderQuestion()}

      {(questionContent.type === 'multiple_choice' ||
        questionContent.type === 'true_false') &&
        renderOptions()}

      {(questionContent.type === 'fill_blank' ||
        questionContent.type === 'short_answer' ||
        questionContent.type === 'code') &&
        renderTextInput()}

      {renderFeedback()}

      <Button
        title={isSubmitted ? 'Continue' : 'Check Answer'}
        onPress={handleSubmit}
        disabled={!canSubmit()}
        variant={isSubmitted ? 'primary' : 'outline'}
        style={styles.submitButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionContainer: {
    marginBottom: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  option: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionText: {
    ...Typography.body.medium,
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  textInput: {
    ...Typography.body.medium,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 2,
    minHeight: 48,
  },
  feedbackContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  feedbackIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  feedbackText: {
    ...Typography.body.large,
    fontWeight: '600',
  },
  explanationContainer: {
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});

export default QuestionBlockRenderer;
