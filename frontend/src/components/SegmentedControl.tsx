import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
}: SegmentedControlProps<T>): React.ReactElement {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const selectedIndex = options.findIndex((opt) => opt.value === selectedValue);

  // Calculate segment width (equal distribution)
  const segmentWidth = containerWidth > 0 ? containerWidth / options.length : 0;

  // Animate the sliding indicator
  React.useEffect(() => {
    if (segmentWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: selectedIndex * segmentWidth,
        useNativeDriver: true,
        tension: 300,
        friction: 30,
      }).start();
    }
  }, [selectedIndex, segmentWidth, slideAnim]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSegmentLayout = (_index: number) => (_event: LayoutChangeEvent) => {
    // Layout handler for segments - parameters reserved for future use
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.tertiary },
      ]}
      onLayout={handleContainerLayout}
    >
      {/* Sliding indicator */}
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.background.primary,
              width: segmentWidth - 4,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      )}

      {/* Segments */}
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={styles.segment}
            onPress={() => onValueChange(option.value)}
            onLayout={handleSegmentLayout(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? colors.text.primary : colors.text.secondary,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
            {option.count !== undefined && option.count > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.gray400,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.white }]}>
                  {option.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Spacing.borderRadius.md,
    padding: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: Spacing.borderRadius.md - 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
    zIndex: 1,
  },
  label: {
    ...Typography.label.medium,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SegmentedControl;
