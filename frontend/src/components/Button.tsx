import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../theme/spacing';
import { getElevation } from '../theme/elevation';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.gray100 };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gray300 };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: colors.danger };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { minHeight: Spacing.buttonHeight.small, paddingHorizontal: Spacing.md };
      case 'large':
        return { minHeight: Spacing.buttonHeight.large, paddingHorizontal: Spacing.lg };
      default:
        return { minHeight: Spacing.buttonHeight.medium, paddingHorizontal: Spacing.lg };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'outline':
        return { color: colors.text.primary };
      case 'ghost':
        return { color: colors.primary };
      case 'danger':
        return { color: colors.white };
      default:
        return { color: colors.white };
    }
  };

  const loaderColor =
    variant === 'outline' || variant === 'ghost'
      ? colors.primary
      : colors.white;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getButtonSize(),
        getElevation('sm'),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={loaderColor} size="small" />
      ) : (
        <Text style={[styles.buttonText, getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
