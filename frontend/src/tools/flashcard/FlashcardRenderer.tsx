/**
 * Flashcard Tool Renderer
 *
 * Interactive flip card for quick recall practice.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { ToolRendererProps } from '../types';
import { FlashcardData } from './types';

export const FlashcardRenderer: React.FC<ToolRendererProps<FlashcardData>> = ({
  data,
  context,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { colors } = useTheme();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleComplete = () => {
    context.onComplete({
      score: 100,
      metadata: { completed: true },
    });
  };

  return (
    <View style={styles.container}>
      {/* Flashcard */}
      <TouchableOpacity
        onPress={handleFlip}
        activeOpacity={0.9}
        style={[
          styles.card,
          {
            backgroundColor: isFlipped
              ? colors.primary + '15'
              : colors.card.default,
            borderColor: isFlipped ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.cardLabel, { color: colors.text.secondary }]}>
            {isFlipped ? 'Answer' : 'Question'}
          </Text>
          <Text style={[styles.cardText, { color: colors.text.primary }]}>
            {isFlipped ? data.back : data.front}
          </Text>
          <Text style={[styles.tapHint, { color: colors.text.secondary }]}>
            Tap to {isFlipped ? 'see question' : 'reveal answer'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Hint button (before flip) */}
      {!isFlipped && data.hint && (
        <View style={styles.hintContainer}>
          {showHint ? (
            <Card elevation="sm" padding="md" style={{ backgroundColor: colors.warning + '20' }}>
              <Text style={[styles.hintText, { color: colors.text.primary }]}>
                {data.hint}
              </Text>
            </Card>
          ) : (
            <Button
              title="Show Hint"
              variant="secondary"
              onPress={() => setShowHint(true)}
            />
          )}
        </View>
      )}

      {/* Continue button (after flip) */}
      {isFlipped && (
        <Button
          title="Continue"
          onPress={handleComplete}
          disabled={context.isCompleting}
          style={styles.continueButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
  },
  card: {
    minHeight: 250,
    borderRadius: Spacing.borderRadius.lg,
    borderWidth: 2,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
    lineHeight: 32,
    marginBottom: Spacing.md,
  },
  tapHint: {
    ...Typography.body.small,
    fontStyle: 'italic',
  },
  hintContainer: {
    marginTop: Spacing.sm,
  },
  hintText: {
    ...Typography.body.small,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: Spacing.md,
  },
});

export default FlashcardRenderer;
