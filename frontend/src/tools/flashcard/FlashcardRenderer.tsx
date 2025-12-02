/**
 * Flashcard Tool Renderer
 *
 * Interactive flip card with spaced repetition confidence buttons.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { ToolRendererProps } from '../types';
import { FlashcardData, ConfidenceLevel, confidenceScores } from './types';

export const FlashcardRenderer: React.FC<ToolRendererProps<FlashcardData>> = ({
  data,
  context,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  const handleFlip = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleConfidence = (level: ConfidenceLevel) => {
    context.onComplete({
      score: confidenceScores[level],
      metadata: { confidence: level },
    });
  };

  // Interpolate rotation for flip effect
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <View style={styles.container}>
      {/* Flashcard */}
      <TouchableOpacity
        onPress={handleFlip}
        activeOpacity={0.9}
        style={styles.cardContainer}
      >
        {/* Front of card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            frontAnimatedStyle,
            { backgroundColor: colors.card.background },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.text.secondary }]}>
            Question
          </Text>
          <Text style={[styles.cardText, { color: colors.text.primary }]}>
            {data.front}
          </Text>
          <Text style={[styles.tapHint, { color: colors.text.secondary }]}>
            Tap to flip
          </Text>
        </Animated.View>

        {/* Back of card */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            backAnimatedStyle,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.text.secondary }]}>
            Answer
          </Text>
          <Text style={[styles.cardText, { color: colors.text.primary }]}>
            {data.back}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Hint button (before flip) */}
      {!isFlipped && data.hint && (
        <View style={styles.hintContainer}>
          {showHint ? (
            <Card elevation="sm" padding="md" style={styles.hintCard}>
              <Text style={[styles.hintText, { color: colors.text.secondary }]}>
                💡 {data.hint}
              </Text>
            </Card>
          ) : (
            <Button
              title="💡 Show Hint"
              variant="secondary"
              onPress={() => setShowHint(true)}
            />
          )}
        </View>
      )}

      {/* Confidence buttons (after flip) */}
      {isFlipped && (
        <View style={styles.confidenceContainer}>
          <Text style={[styles.confidenceLabel, { color: colors.text.secondary }]}>
            How well did you know this?
          </Text>
          <View style={styles.confidenceButtons}>
            <TouchableOpacity
              style={[styles.confidenceButton, styles.againButton]}
              onPress={() => handleConfidence('again')}
              disabled={context.isCompleting}
            >
              <Text style={styles.confidenceEmoji}>😕</Text>
              <Text style={styles.confidenceText}>Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confidenceButton, styles.hardButton]}
              onPress={() => handleConfidence('hard')}
              disabled={context.isCompleting}
            >
              <Text style={styles.confidenceEmoji}>🤔</Text>
              <Text style={styles.confidenceText}>Hard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confidenceButton, styles.goodButton]}
              onPress={() => handleConfidence('good')}
              disabled={context.isCompleting}
            >
              <Text style={styles.confidenceEmoji}>🙂</Text>
              <Text style={styles.confidenceText}>Good</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confidenceButton, styles.easyButton]}
              onPress={() => handleConfidence('easy')}
              disabled={context.isCompleting}
            >
              <Text style={styles.confidenceEmoji}>😊</Text>
              <Text style={styles.confidenceText}>Easy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.lg,
  },
  cardContainer: {
    height: 250,
    perspective: 1000,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFront: {},
  cardBack: {},
  cardLabel: {
    ...Typography.label.small,
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    ...Typography.heading.h3,
    textAlign: 'center',
    lineHeight: 32,
  },
  tapHint: {
    ...Typography.body.small,
    position: 'absolute',
    bottom: Spacing.md,
  },
  hintContainer: {
    marginTop: Spacing.sm,
  },
  hintCard: {
    backgroundColor: '#FEF3C7',
  },
  hintText: {
    ...Typography.body.small,
    textAlign: 'center',
  },
  confidenceContainer: {
    marginTop: Spacing.md,
  },
  confidenceLabel: {
    ...Typography.body.small,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  confidenceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  confidenceButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  againButton: {
    backgroundColor: '#FEE2E2',
  },
  hardButton: {
    backgroundColor: '#FEF3C7',
  },
  goodButton: {
    backgroundColor: '#DBEAFE',
  },
  easyButton: {
    backgroundColor: '#D1FAE5',
  },
  confidenceEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  confidenceText: {
    ...Typography.label.small,
    fontWeight: '600',
  },
});

export default FlashcardRenderer;
