import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';
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
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>✨</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Start New Learning Path</Text>
          <Text style={styles.subtitle}>What do you want to learn?</Text>
        </View>
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonText}>+ Create Path</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
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
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.small,
    color: Colors.text.secondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.button.medium,
    color: Colors.white,
  },
});

export default CreatePathCard;
