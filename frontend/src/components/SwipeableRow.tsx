import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../theme/spacing';

export interface SwipeAction {
  label: string;
  icon?: string;
  color: string;
  textColor?: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  actionWidth?: number;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 0.3;
const ACTION_WIDTH = 72;

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  actionWidth = ACTION_WIDTH,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const leftActionsWidth = leftActions.length * actionWidth;
  const rightActionsWidth = rightActions.length * actionWidth;

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate for horizontal swipes
        if (disabled) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderGrant: () => {
        // Store the current offset
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        // Limit swipe distance
        let newValue = dx;
        if (dx > 0 && leftActions.length === 0) {
          newValue = 0;
        } else if (dx < 0 && rightActions.length === 0) {
          newValue = 0;
        } else if (dx > leftActionsWidth) {
          newValue = leftActionsWidth + (dx - leftActionsWidth) * 0.2;
        } else if (dx < -rightActionsWidth) {
          newValue = -rightActionsWidth + (dx + rightActionsWidth) * 0.2;
        }
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        const { dx, vx } = gestureState;

        // Determine snap position based on velocity and position
        let snapTo = 0;

        if (dx > 0 && leftActions.length > 0) {
          if (dx > leftActionsWidth * SWIPE_THRESHOLD || vx > 0.5) {
            snapTo = leftActionsWidth;
          }
        } else if (dx < 0 && rightActions.length > 0) {
          if (Math.abs(dx) > rightActionsWidth * SWIPE_THRESHOLD || vx < -0.5) {
            snapTo = -rightActionsWidth;
          }
        }

        Animated.spring(translateX, {
          toValue: snapTo,
          useNativeDriver: true,
          tension: 300,
          friction: 30,
        }).start();
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        resetPosition();
      },
    })
  ).current;

  const handleActionPress = (action: SwipeAction) => {
    resetPosition();
    // Delay action to let animation complete
    setTimeout(() => {
      action.onPress();
    }, 100);
  };

  // For web, show actions on hover instead of swipe
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    // Web: show actions inline on hover
    return (
      <View style={styles.webContainer}>
        {children}
        {rightActions.length > 0 && (
          <View style={styles.webActions}>
            {rightActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.webActionButton,
                  { backgroundColor: action.color },
                ]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                {action.icon && (
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                )}
                <Text
                  style={[
                    styles.webActionText,
                    { color: action.textColor || colors.white },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.leftActions]}>
          {leftActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                { backgroundColor: action.color, width: actionWidth },
              ]}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.8}
            >
              {action.icon && (
                <Text style={styles.actionIcon}>{action.icon}</Text>
              )}
              <Text
                style={[
                  styles.actionText,
                  { color: action.textColor || colors.white },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Right actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.rightActions]}>
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                { backgroundColor: action.color, width: actionWidth },
              ]}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.8}
            >
              {action.icon && (
                <Text style={styles.actionIcon}>{action.icon}</Text>
              )}
              <Text
                style={[
                  styles.actionText,
                  { color: action.textColor || colors.white },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: 'transparent',
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Web-specific styles
  webContainer: {
    position: 'relative',
  },
  webActions: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.xs,
    zIndex: 10,
  },
  webActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Spacing.borderRadius.sm,
    gap: 4,
  },
  webActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SwipeableRow;
