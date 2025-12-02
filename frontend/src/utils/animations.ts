/**
 * Animation utilities for smooth UI transitions
 * Uses React Native's Animated API for cross-platform support
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Creates a looping shimmer animation for skeleton loading states
 * @param duration - Animation cycle duration in ms (default: 1500)
 * @returns Animated.Value that cycles from 0 to 1
 */
export const useShimmer = (duration: number = 1500): Animated.Value => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerValue, duration]);

  return shimmerValue;
};

/**
 * Creates a fade-in animation
 * @param delay - Delay before animation starts (default: 0)
 * @param duration - Animation duration in ms (default: 300)
 * @returns Object with animated value and trigger function
 */
export const useFadeIn = (delay: number = 0, duration: number = 300) => {
  const fadeValue = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(fadeValue, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeValue, delay, duration]);

  const reset = useCallback(() => {
    fadeValue.setValue(0);
  }, [fadeValue]);

  return { fadeValue, fadeIn, reset };
};

/**
 * Creates a pulsing animation for loading indicators
 * @param minScale - Minimum scale (default: 0.95)
 * @param maxScale - Maximum scale (default: 1.05)
 * @param duration - Full cycle duration in ms (default: 1000)
 * @returns Animated.Value for scale transform
 */
export const usePulse = (
  minScale: number = 0.95,
  maxScale: number = 1.05,
  duration: number = 1000
): Animated.Value => {
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: minScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseValue, minScale, maxScale, duration]);

  return pulseValue;
};

/**
 * Creates a gentle floating animation (up and down)
 * @param distance - Float distance in pixels (default: 8)
 * @param duration - Full cycle duration in ms (default: 2000)
 * @returns Animated.Value for translateY transform
 */
export const useFloat = (distance: number = 8, duration: number = 2000): Animated.Value => {
  const floatValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: -distance,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [floatValue, distance, duration]);

  return floatValue;
};

/**
 * Creates staggered fade-in animations for list items
 * @param itemCount - Number of items to animate
 * @param staggerDelay - Delay between each item (default: 100ms)
 * @param duration - Each item's fade duration (default: 300ms)
 * @returns Array of animated values and trigger function
 */
export const useStaggeredFadeIn = (
  itemCount: number,
  staggerDelay: number = 100,
  duration: number = 300
) => {
  const animatedValues = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0))
  ).current;

  const triggerStagger = useCallback(() => {
    const animations = animatedValues.map((value: Animated.Value, index: number) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        delay: index * staggerDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, [animatedValues, staggerDelay, duration]);

  const reset = useCallback(() => {
    animatedValues.forEach((value: Animated.Value) => value.setValue(0));
  }, [animatedValues]);

  return { animatedValues, triggerStagger, reset };
};

/**
 * Creates a slide + fade animation for content transitions
 * @param direction - 'up' | 'down' | 'left' | 'right' (default: 'up')
 * @param distance - Slide distance in pixels (default: 20)
 * @param duration - Animation duration in ms (default: 400)
 */
export const useSlideIn = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance: number = 20,
  duration: number = 400
) => {
  const fadeValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(getInitialSlide(direction, distance))).current;

  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideValue, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeValue, slideValue, duration]);

  const reset = useCallback(() => {
    fadeValue.setValue(0);
    slideValue.setValue(getInitialSlide(direction, distance));
  }, [fadeValue, slideValue, direction, distance]);

  const getTransform = () => {
    if (direction === 'up' || direction === 'down') {
      return { translateY: slideValue };
    }
    return { translateX: slideValue };
  };

  return { fadeValue, slideValue, slideIn, reset, getTransform };
};

function getInitialSlide(direction: string, distance: number): number {
  switch (direction) {
    case 'up':
      return distance;
    case 'down':
      return -distance;
    case 'left':
      return distance;
    case 'right':
      return -distance;
    default:
      return distance;
  }
}

/**
 * Creates animated dots for loading indicators
 * @param dotCount - Number of dots (default: 3)
 * @param duration - Animation cycle duration (default: 1200)
 * @returns Array of animated scale values
 */
export const useAnimatedDots = (dotCount: number = 3, duration: number = 1200) => {
  const dotValues = useRef(
    Array.from({ length: dotCount }, () => new Animated.Value(0.4))
  ).current;

  useEffect(() => {
    const animations = dotValues.map((value: Animated.Value, index: number) => {
      const delay = (index * duration) / dotCount;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: duration / 3,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.4,
            duration: duration / 3,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(duration - delay - (2 * duration) / 3),
        ])
      );
    });

    animations.forEach((anim: Animated.CompositeAnimation) => anim.start());

    return () => animations.forEach((anim: Animated.CompositeAnimation) => anim.stop());
  }, [dotValues, dotCount, duration]);

  return dotValues;
};

/**
 * Creates a progress animation that can be controlled
 * @param duration - Total animation duration (default: 30000 - 30 seconds)
 * @returns Progress value (0-1) and control functions
 */
export const useProgressAnimation = (duration: number = 30000) => {
  const progressValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = useCallback(() => {
    progressValue.setValue(0);
    animationRef.current = Animated.timing(progressValue, {
      toValue: 0.9, // Only go to 90% - final 10% happens on completion
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // Can't use native driver for width animations
    });
    animationRef.current.start();
  }, [progressValue, duration]);

  const complete = useCallback(() => {
    animationRef.current?.stop();
    Animated.timing(progressValue, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressValue]);

  const reset = useCallback(() => {
    animationRef.current?.stop();
    progressValue.setValue(0);
  }, [progressValue]);

  return { progressValue, start, complete, reset };
};
