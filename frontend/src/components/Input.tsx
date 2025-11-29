import React from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  ...textInputProps
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background.tertiary,
            color: colors.text.primary,
            borderColor: colors.border,
            ...Platform.select({
              ios: {
                shadowColor: colors.black,
              },
              android: {},
            }),
          },
          error && { borderColor: colors.danger, backgroundColor: `${colors.danger}08` },
        ]}
        placeholderTextColor={colors.gray400}
        {...textInputProps}
      />
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.text.tertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label.large,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.body.medium,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  errorText: {
    ...Typography.label.small,
    marginTop: Spacing.xs,
  },
  hintText: {
    ...Typography.label.small,
    marginTop: Spacing.xs,
  },
});
