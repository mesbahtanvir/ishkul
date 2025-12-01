import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export interface ErrorBannerProps {
  /** Error message to display */
  message: string | null;
  /** Type of message - affects styling */
  type?: 'error' | 'warning' | 'info';
  /** Called when user dismisses the banner */
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds (0 = no auto-dismiss) */
  autoDismissMs?: number;
  /** Whether to show dismiss button */
  showDismiss?: boolean;
}

/**
 * Inline error banner for displaying form errors
 * Follows industry best practices for error UX:
 * - Non-blocking (no modal)
 * - Dismissible
 * - Clear, actionable messaging
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  type = 'error',
  onDismiss,
  autoDismissMs = 0,
  showDismiss = true,
}) => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  // Get colors based on type
  const getTypeColors = () => {
    switch (type) {
      case 'warning':
        return {
          background: colors.warning + '15', // 15% opacity
          border: colors.warning,
          text: colors.warning,
        };
      case 'info':
        return {
          background: colors.info + '15',
          border: colors.info,
          text: colors.info,
        };
      case 'error':
      default:
        return {
          background: colors.danger + '15',
          border: colors.danger,
          text: colors.danger,
        };
    }
  };

  const typeColors = getTypeColors();

  useEffect(() => {
    if (message) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss if configured
      if (autoDismissMs > 0 && onDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations when message is cleared
      fadeAnim.setValue(0);
      slideAnim.setValue(-20);
    }
  }, [message, autoDismissMs]);

  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeColors.background,
          borderColor: typeColors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.icon]}>
          {type === 'error' ? '!' : type === 'warning' ? '!' : 'i'}
        </Text>
        <Text style={[styles.message, { color: typeColors.text }]}>
          {message}
        </Text>
      </View>
      {showDismiss && onDismiss && (
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.dismissText, { color: typeColors.text }]}>
            ✕
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'currentColor',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  message: {
    ...Typography.body.medium,
    flex: 1,
  },
  dismissButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBanner;
