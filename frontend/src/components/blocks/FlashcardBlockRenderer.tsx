/**
 * FlashcardBlockRenderer - Renders interactive flashcard blocks
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlockContent } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Button } from '../Button';

interface FlashcardBlockRendererProps {
  content: BlockContent;
  onComplete?: () => void;
}

export const FlashcardBlockRenderer: React.FC<FlashcardBlockRendererProps> = ({
  content,
  onComplete,
}) => {
  const { colors } = useTheme();
  const flashcardContent = content.flashcard;

  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState<'easy' | 'medium' | 'hard' | null>(null);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleConfidence = (level: 'easy' | 'medium' | 'hard') => {
    setConfidence(level);
  };

  const handleContinue = () => {
    onComplete?.();
  };

  const getConfidenceColor = (level: 'easy' | 'medium' | 'hard') => {
    switch (level) {
      case 'easy':
        return colors.success;
      case 'medium':
        return colors.warning;
      case 'hard':
        return colors.danger;
    }
  };

  // Handle missing flashcard content
  if (!flashcardContent) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border }]}>
          <Text style={[styles.cardText, { color: colors.text.secondary }]}>
            No flashcard content available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Flashcard */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isFlipped
              ? colors.primary + '10'
              : colors.background.secondary,
            borderColor: isFlipped ? colors.primary : colors.border,
          },
        ]}
        onPress={handleFlip}
        activeOpacity={0.9}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.cardLabel, { color: colors.text.secondary }]}>
            {isFlipped ? 'Answer' : 'Question'}
          </Text>
          <Text style={[styles.cardText, { color: colors.text.primary }]}>
            {isFlipped ? flashcardContent.back : flashcardContent.front}
          </Text>
          <Text style={[styles.tapHint, { color: colors.text.secondary }]}>
            Tap to {isFlipped ? 'see question' : 'reveal answer'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Confidence Rating */}
      {isFlipped && !confidence && (
        <View style={styles.confidenceContainer}>
          <Text style={[styles.confidenceLabel, { color: colors.text.secondary }]}>
            How well did you know this?
          </Text>
          <View style={styles.confidenceButtons}>
            <TouchableOpacity
              style={[styles.confidenceButton, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
              onPress={() => handleConfidence('hard')}
            >
              <Text style={[styles.confidenceEmoji]}>😓</Text>
              <Text style={[styles.confidenceText, { color: colors.danger }]}>Hard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confidenceButton, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
              onPress={() => handleConfidence('medium')}
            >
              <Text style={[styles.confidenceEmoji]}>🤔</Text>
              <Text style={[styles.confidenceText, { color: colors.warning }]}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confidenceButton, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
              onPress={() => handleConfidence('easy')}
            >
              <Text style={[styles.confidenceEmoji]}>😊</Text>
              <Text style={[styles.confidenceText, { color: colors.success }]}>Easy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Result */}
      {confidence && (
        <View style={[styles.resultContainer, { backgroundColor: getConfidenceColor(confidence) + '10', borderColor: getConfidenceColor(confidence) }]}>
          <Text style={[styles.resultText, { color: getConfidenceColor(confidence) }]}>
            {confidence === 'easy' && '🎉 Great! You knew this well.'}
            {confidence === 'medium' && '👍 Good effort! Keep practicing.'}
            {confidence === 'hard' && "💪 Don't worry, you'll get it next time!"}
          </Text>
        </View>
      )}

      {/* Continue Button */}
      {confidence && (
        <Button
          title="Continue"
          onPress={handleContinue}
          style={styles.continueButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    minHeight: 200,
    borderRadius: Spacing.borderRadius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardLabel: {
    ...Typography.label.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  cardText: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tapHint: {
    ...Typography.body.small,
    fontStyle: 'italic',
  },
  confidenceContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  confidenceLabel: {
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  confidenceButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confidenceButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  confidenceEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  confidenceText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
  resultContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  resultText: {
    ...Typography.body.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.sm,
  },
});

export default FlashcardBlockRenderer;
