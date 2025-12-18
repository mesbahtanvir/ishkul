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

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleContinue = () => {
    onComplete?.();
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

      {/* Continue Button */}
      {isFlipped && (
        <Button
          title="Continue"
          onPress={handleContinue}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  card: {
    minHeight: 180,
    borderRadius: Spacing.borderRadius.lg,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardLabel: {
    ...Typography.label.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  cardText: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tapHint: {
    ...Typography.body.small,
    fontStyle: 'italic',
  },
});

export default FlashcardBlockRenderer;
