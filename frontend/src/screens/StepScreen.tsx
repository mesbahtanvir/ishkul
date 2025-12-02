/**
 * StepScreen - Generic Step Renderer
 *
 * Uses the tool registry to dynamically render any step type.
 * This replaces the need for separate LessonScreen, QuizScreen, etc.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Card } from '../components/Card';
import { getTool } from '../tools';
import { ToolContext, CompletionResult } from '../tools/types';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { completeStep, getUserDocument } from '../services/memory';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../types/navigation';
import { Step } from '../types/app';

type StepScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Lesson'
>;
type StepScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

interface StepScreenProps {
  navigation: StepScreenNavigationProp;
  route: StepScreenRouteProp;
}

/**
 * Get badge color from theme based on tool metadata
 */
function getBadgeColorFromTheme(
  badgeColorKey: string,
  colors: Record<string, unknown>
): string {
  // Parse 'badge.lesson' -> colors.badge.lesson
  const parts = badgeColorKey.split('.');
  let result: unknown = colors;

  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return colors.primary as string; // Fallback
    }
  }

  return typeof result === 'string' ? result : (colors.primary as string);
}

export const StepScreen: React.FC<StepScreenProps> = ({ navigation, route }) => {
  const { step, pathId } = route.params;
  const { setUserDocument } = useUserStore();
  const { updatePath, setActivePath } = useLearningPathsStore();
  const [isCompleting, setIsCompleting] = useState(false);
  const { responsive } = useResponsive();
  const { colors } = useTheme();

  // Get the tool for this step type
  const tool = getTool(step.type);

  // Handle unknown tool type
  if (!tool) {
    return (
      <Container scrollable>
        <Card elevation="md" padding="lg">
          <Text style={[styles.errorText, { color: colors.text.primary }]}>
            Unknown step type: {step.type}
          </Text>
        </Card>
      </Container>
    );
  }

  // Extract tool-specific data from step
  const data = tool.extractData(step);

  // Handle step completion
  const handleComplete = async (result: CompletionResult) => {
    try {
      setIsCompleting(true);

      // Complete the step with score and user answer
      const apiResult = await completeStep(pathId, step.id, {
        userAnswer: result.userAnswer,
        score: result.score,
      });

      // Update local state
      updatePath(pathId, apiResult.path);
      setActivePath(apiResult.path);

      // Refresh user document
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Navigate back to learning path timeline
      navigation.navigate('LearningPath', { pathId });
    } catch (error) {
      console.error('Error completing step:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Build context for the tool renderer
  const context: ToolContext = {
    step,
    pathId,
    onComplete: handleComplete,
    isCompleting,
  };

  // Get the renderer component
  const ToolRenderer = tool.Renderer;

  // Responsive values
  const emojiSize = responsive(48, 60, 68, 76);
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  // Get badge color
  const badgeColor = getBadgeColorFromTheme(tool.metadata.badgeColor, colors);

  return (
    <Container scrollable>
      <View style={styles.content}>
        {/* Common Header */}
        <Card elevation="md" padding="lg" style={styles.headerCard}>
          <View style={styles.header}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>
              {tool.metadata.icon}
            </Text>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.badgeText, { color: colors.white }]}>
                {tool.metadata.name}
              </Text>
            </View>
            <Text
              style={[
                styles.title,
                { fontSize: titleSize, color: colors.text.primary },
              ]}
            >
              {step.title || step.topic}
            </Text>
          </View>
        </Card>

        {/* Tool-specific Renderer */}
        <ToolRenderer data={data} context={context} />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: Spacing.md,
  },
  headerCard: {
    marginBottom: Spacing.sm,
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
});

export default StepScreen;
