import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Spacing } from '../theme/spacing';
import { getElevation, ElevationLevel } from '../theme/elevation';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  elevation?: ElevationLevel;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  elevation = 'md',
}) => {
  const { colors } = useTheme();

  const paddingValue = {
    xs: Spacing.xs,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
    xl: Spacing.xl,
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.background.secondary,
    borderRadius: Spacing.borderRadius.lg,
    padding: paddingValue[padding],
    ...getElevation(elevation),
  };

  return (
    <View style={[cardStyle, style] as unknown as ViewStyle}>
      {children}
    </View>
  );
};

export default Card;
