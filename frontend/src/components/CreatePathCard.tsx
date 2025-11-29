import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface CreatePathCardProps {
  onPress: () => void;
  style?: ViewStyle;
}

export const CreatePathCard: React.FC<CreatePathCardProps> = ({
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primaryLight, borderColor: colors.primary }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>✨</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.primary }]}>Start New Learning Path</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>What do you want to learn?</Text>
        </View>
      </View>
      <View style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={[styles.buttonText, { color: colors.white }]}>+ Create Path</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.heading.h4,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.small,
  },
  button: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.button.medium,
  },
});

export default CreatePathCard;
