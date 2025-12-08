/**
 * EmptyContextState Component
 *
 * Displays the onboarding UI when user has no context set up yet.
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from '../Button';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// =============================================================================
// Types
// =============================================================================

interface EmptyContextStateProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Example Chips Data
// =============================================================================

const EXAMPLE_CHIPS = [
  { text: '💼 Your role & experience', colorKey: 'primary' as const },
  { text: '🎯 What you want to learn', colorKey: 'success' as const },
  { text: '⚡ Skills you have', colorKey: 'warning' as const },
  { text: '📚 How you prefer to learn', colorKey: 'info' as const },
];

// =============================================================================
// Component
// =============================================================================

export const EmptyContextState: React.FC<EmptyContextStateProps> = ({
  inputText,
  onInputChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={[styles.hero, { backgroundColor: colors.primary + '10' }]}>
        <Text style={styles.heroEmoji}>🧠</Text>
        <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
          Help me personalize your learning
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
          Tell me about yourself and I'll tailor courses just for you
        </Text>
      </View>

      {/* Input Card */}
      <View style={[styles.inputCard, { backgroundColor: colors.card.default }]}>
        <Text style={[styles.inputLabel, { color: colors.text.primary }]}>
          ✨ Tell me about yourself
        </Text>

        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.background.secondary,
              color: colors.text.primary,
              borderColor: colors.border,
            },
          ]}
          placeholder="I'm a software engineer with 5 years of experience..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          value={inputText}
          onChangeText={onInputChange}
          textAlignVertical="top"
        />

        {/* Example Chips */}
        <View style={styles.examplesSection}>
          <Text style={[styles.examplesLabel, { color: colors.text.secondary }]}>
            Things you can mention:
          </Text>
          <View style={styles.exampleChips}>
            {EXAMPLE_CHIPS.map((chip, index) => (
              <View
                key={index}
                style={[
                  styles.exampleChip,
                  { backgroundColor: colors[chip.colorKey] + '15' },
                ]}
              >
                <Text
                  style={[styles.exampleChipText, { color: colors[chip.colorKey] }]}
                >
                  {chip.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Button
          title="Save My Context"
          onPress={onSubmit}
          loading={isLoading}
          disabled={isLoading || !inputText.trim()}
          size="large"
        />

        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.xl,
    marginBottom: Spacing.lg,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...Typography.heading.h2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  inputCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.heading.h4,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  textInput: {
    minHeight: 120,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  examplesSection: {
    marginBottom: Spacing.lg,
  },
  examplesLabel: {
    ...Typography.label.small,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exampleChip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Spacing.borderRadius.md,
  },
  exampleChipText: {
    ...Typography.body.small,
    fontWeight: '500',
  },
  errorText: {
    ...Typography.body.small,
    marginTop: Spacing.sm,
  },
});
