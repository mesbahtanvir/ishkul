/**
 * GeneratingContent - Engaging loading experience during content generation
 * Keeps users engaged with animations, tips, and progress indication
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { usePulse, useFloat, useAnimatedDots } from '../utils/animations';

// Learning tips to show during generation
const LEARNING_TIPS = [
  {
    emoji: '🧠',
    title: 'Did you know?',
    text: 'Spaced repetition can improve memory retention by up to 200%!',
  },
  {
    emoji: '💡',
    title: 'Pro tip',
    text: 'Taking short breaks between learning sessions boosts comprehension.',
  },
  {
    emoji: '🎯',
    title: 'Stay focused',
    text: 'Active recall is more effective than passive re-reading.',
  },
  {
    emoji: '⚡',
    title: 'Quick fact',
    text: 'Your brain forms stronger connections when you learn in small chunks.',
  },
  {
    emoji: '🌟',
    title: 'Keep going!',
    text: 'Consistent practice beats cramming every time.',
  },
  {
    emoji: '📚',
    title: 'Learning hack',
    text: 'Teaching others what you learn reinforces your own understanding.',
  },
  {
    emoji: '🔄',
    title: 'Remember',
    text: 'Making mistakes is part of learning - they help you grow!',
  },
  {
    emoji: '✨',
    title: 'Fun fact',
    text: 'Your brain uses 20% of your body\'s energy while learning.',
  },
];

interface GeneratingContentProps {
  /** Type of content being generated */
  contentType?: 'lesson' | 'quiz' | 'practice' | 'review' | 'summary' | 'step';
  /** Topic being generated (optional - for personalized message) */
  topic?: string;
  /** How long tips display before rotating (ms) */
  tipRotationInterval?: number;
}

export const GeneratingContent: React.FC<GeneratingContentProps> = ({
  contentType = 'step',
  topic,
  tipRotationInterval = 4000,
}) => {
  const { colors } = useTheme();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const tipFadeValue = useRef(new Animated.Value(1)).current;

  // Animations
  const pulseValue = usePulse(0.9, 1.1, 1500);
  const floatValue = useFloat(6, 2500);
  const dotValues = useAnimatedDots(3, 1200);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(tipFadeValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change tip
        setCurrentTipIndex((prev) => (prev + 1) % LEARNING_TIPS.length);
        // Fade in
        Animated.timing(tipFadeValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, tipRotationInterval);

    return () => clearInterval(interval);
  }, [tipFadeValue, tipRotationInterval]);

  const getLoadingMessage = () => {
    const messages: Record<string, string> = {
      lesson: 'Creating your lesson',
      quiz: 'Preparing your quiz',
      practice: 'Setting up practice',
      review: 'Building your review',
      summary: 'Generating summary',
      step: 'Creating your next step',
    };
    return messages[contentType] || messages.step;
  };

  const currentTip = LEARNING_TIPS[currentTipIndex];

  return (
    <View style={styles.container}>
      {/* Animated emoji */}
      <Animated.View
        style={[
          styles.emojiContainer,
          {
            transform: [
              { scale: pulseValue },
              { translateY: floatValue },
            ],
          },
        ]}
      >
        <Text style={styles.mainEmoji}>🧠</Text>
      </Animated.View>

      {/* Loading message */}
      <Text style={[styles.loadingMessage, { color: colors.text.primary }]}>
        {getLoadingMessage()}
      </Text>

      {/* Topic subtitle if provided */}
      {topic && (
        <Text style={[styles.topicText, { color: colors.text.secondary }]} numberOfLines={1}>
          {topic}
        </Text>
      )}

      {/* Animated dots */}
      <View style={styles.dotsContainer}>
        {dotValues.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: colors.primary,
                opacity: value,
                transform: [{ scale: value }],
              },
            ]}
          />
        ))}
      </View>

      {/* Learning tip card */}
      <Animated.View
        style={[
          styles.tipCard,
          {
            backgroundColor: colors.background.secondary,
            opacity: tipFadeValue,
            transform: [{
              translateY: tipFadeValue.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
          },
        ]}
      >
        <Text style={styles.tipEmoji}>{currentTip.emoji}</Text>
        <Text style={[styles.tipTitle, { color: colors.text.primary }]}>
          {currentTip.title}
        </Text>
        <Text style={[styles.tipText, { color: colors.text.secondary }]}>
          {currentTip.text}
        </Text>
      </Animated.View>

      {/* Subtle message */}
      <Text style={[styles.subtleMessage, { color: colors.text.tertiary }]}>
        Personalized to your learning pace
      </Text>
    </View>
  );
};

/**
 * LoadingDots - Simple animated dots for inline loading
 */
export const LoadingDots: React.FC<{ color?: string }> = ({ color }) => {
  const { colors } = useTheme();
  const dotValues = useAnimatedDots(3, 1000);
  const dotColor = color || colors.text.secondary;

  return (
    <View style={styles.inlineDotsContainer}>
      {dotValues.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.inlineDot,
            {
              backgroundColor: dotColor,
              opacity: value,
            },
          ]}
        />
      ))}
    </View>
  );
};

/**
 * PulsingEmoji - Simple pulsing emoji for compact loading states
 */
interface PulsingEmojiProps {
  emoji?: string;
  size?: number;
}

export const PulsingEmoji: React.FC<PulsingEmojiProps> = ({
  emoji = '✨',
  size = 32,
}) => {
  const pulseValue = usePulse(0.85, 1.15, 1200);

  return (
    <Animated.Text
      style={[
        styles.pulsingEmoji,
        {
          fontSize: size,
          transform: [{ scale: pulseValue }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emojiContainer: {
    marginBottom: Spacing.lg,
  },
  mainEmoji: {
    fontSize: 64,
  },
  loadingMessage: {
    ...Typography.heading.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  topicText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    height: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  tipCard: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  tipEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  tipTitle: {
    ...Typography.label.large,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  tipText: {
    ...Typography.body.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  subtleMessage: {
    ...Typography.body.small,
    textAlign: 'center',
  },
  // Inline dots styles
  inlineDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  pulsingEmoji: {
    textAlign: 'center',
  },
});

export default GeneratingContent;
