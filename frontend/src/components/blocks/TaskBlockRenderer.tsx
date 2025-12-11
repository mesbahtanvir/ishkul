/**
 * TaskBlockRenderer - Renders interactive task/practice blocks
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { BlockContent } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Button } from '../Button';
import { MarkdownContent } from '../MarkdownContent';

interface TaskBlockRendererProps {
  content: BlockContent;
  onComplete?: () => void;
  isActive?: boolean;
}

export const TaskBlockRenderer: React.FC<TaskBlockRendererProps> = ({
  content,
  onComplete,
}) => {
  const { colors } = useTheme();
  // Access the task content from BlockContent.task
  const taskContent = content.task;

  const [userSolution, setUserSolution] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete?.();
  };

  if (!taskContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Task Description */}
      <View style={styles.taskContainer}>
        <MarkdownContent content={taskContent.instruction || ''} />
      </View>

      {/* Hints */}
      {taskContent.hints && taskContent.hints.length > 0 && (
        <View style={[styles.hintsContainer, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
          <Text style={[styles.hintsTitle, { color: colors.warning }]}>
            💡 Hints
          </Text>
          {taskContent.hints.map((hint, index) => (
            <Text key={index} style={[styles.hintText, { color: colors.text.primary }]}>
              • {hint}
            </Text>
          ))}
        </View>
      )}

      {/* User Solution Input */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
          Your Solution:
        </Text>
        <TextInput
          style={[
            styles.solutionInput,
            {
              color: colors.text.primary,
              backgroundColor: colors.background.secondary,
              borderColor: colors.border,
            },
          ]}
          value={userSolution}
          onChangeText={setUserSolution}
          placeholder="Write your solution here..."
          placeholderTextColor={colors.text.secondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!isCompleted}
        />
      </View>

      {/* Success Criteria */}
      {taskContent.successCriteria && taskContent.successCriteria.length > 0 && (
        <View style={[styles.solutionContainer, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Text style={[styles.solutionTitle, { color: colors.success }]}>
            ✅ Success Criteria
          </Text>
          {taskContent.successCriteria.map((criteria, index) => (
            <Text key={index} style={[styles.hintText, { color: colors.text.primary }]}>
              • {criteria}
            </Text>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={isCompleted ? 'Completed' : 'Mark Complete'}
          onPress={handleComplete}
          variant={isCompleted ? 'secondary' : 'primary'}
          disabled={isCompleted}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  taskContainer: {
    marginBottom: Spacing.md,
  },
  hintsContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  hintsTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  hintText: {
    ...Typography.body.medium,
    marginBottom: Spacing.xs,
  },
  inputSection: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.label.medium,
    marginBottom: Spacing.sm,
  },
  solutionInput: {
    ...Typography.body.medium,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    minHeight: 120,
    fontFamily: 'monospace',
  },
  solutionContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  solutionTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
  },
});

export default TaskBlockRenderer;
