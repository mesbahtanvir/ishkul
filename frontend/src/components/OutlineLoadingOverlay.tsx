import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface OutlineLoadingOverlayProps {
  emoji?: string;
  goal?: string;
}

// Progress messages to show during outline generation
const PROGRESS_MESSAGES = [
  'Building your course structure...',
  'Analyzing your learning goals...',
  'Designing personalized modules...',
  'Optimizing learning sequence...',
  'Almost ready...',
];

export const OutlineLoadingOverlay: React.FC<OutlineLoadingOverlayProps> = ({
  emoji = '📚',
  goal,
}) => {
  const { colors } = useTheme();
  const [messageIndex, setMessageIndex] = useState(0);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  // Pulse animation for the emoji
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Bouncing dots animation
  useEffect(() => {
    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const dot1 = createDotAnimation(dotAnim1, 0);
    const dot2 = createDotAnimation(dotAnim2, 150);
    const dot3 = createDotAnimation(dotAnim3, 300);

    dot1.start();
    dot2.start();
    dot3.start();

    return () => {
      dot1.stop();
      dot2.stop();
      dot3.stop();
    };
  }, [dotAnim1, dotAnim2, dotAnim3]);

  // Progress bar animation (slowly filling up)
  useEffect(() => {
    const progress = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 85,
          duration: 15000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 20,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
    progress.start();
    return () => progress.stop();
  }, [progressAnim]);

  // Cycle through progress messages
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const translateY1 = dotAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const translateY2 = dotAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const translateY3 = dotAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.content}>
        {/* Animated emoji */}
        <Animated.Text
          style={[
            styles.emoji,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {emoji}
        </Animated.Text>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Preparing Your Course
        </Text>

        {/* Animated dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary, transform: [{ translateY: translateY1 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary, transform: [{ translateY: translateY2 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: colors.primary, transform: [{ translateY: translateY3 }] },
            ]}
          />
        </View>

        {/* Progress message */}
        <Animated.Text
          style={[
            styles.message,
            { color: colors.text.secondary, opacity: fadeAnim },
          ]}
        >
          {PROGRESS_MESSAGES[messageIndex]}
        </Animated.Text>

        {/* Progress bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Goal text */}
        {goal && (
          <Text style={[styles.goalText, { color: colors.text.tertiary }]} numberOfLines={2}>
            {goal}
          </Text>
        )}

        {/* Info box */}
        <View style={[styles.infoBox, { backgroundColor: colors.background.secondary }]}>
          <Text style={[styles.infoIcon]}>💡</Text>
          <Text style={[styles.infoText, { color: colors.text.secondary }]}>
            We're creating a personalized course outline just for you. This usually takes a few seconds.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 400,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  message: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    minHeight: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  goalText: {
    ...Typography.body.small,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
    marginTop: Spacing.md,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  infoText: {
    ...Typography.body.small,
    flex: 1,
    lineHeight: 20,
  },
});

export default OutlineLoadingOverlay;
