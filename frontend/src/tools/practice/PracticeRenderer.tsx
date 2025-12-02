/**
 * Practice Tool Renderer
 *
 * Renders a practice task with hints and self-assessment completion.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MarkdownContent } from '../../components/MarkdownContent';
import { Spacing } from '../../theme/spacing';
import { Typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import { ToolRendererProps } from '../types';
import { PracticeData } from './types';

export const PracticeRenderer: React.FC<ToolRendererProps<PracticeData>> = ({
  data,
  context,
}) => {
  const [showHints, setShowHints] = useState(false);
  const { colors } = useTheme();

  const hints = data.hints && data.hints.length > 0 ? data.hints : null;

  const handleComplete = () => {
    context.onComplete({
      score: 100, // Self-assessed as complete
    });
  };

  return (
    <View style={styles.container}>
      {/* Task Description */}
      <Card elevation="sm" padding="lg" style={styles.taskCard}>
        <MarkdownContent content={data.task} />
      </Card>

      {/* Success Criteria */}
      {data.successCriteria && data.successCriteria.length > 0 && (
        <Card elevation="sm" padding="lg" style={styles.criteriaCard}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            ✅ Success Criteria
          </Text>
          {data.successCriteria.map((criterion, idx) => (
            <Text
              key={idx}
              style={[styles.criterionItem, { color: colors.text.secondary }]}
            >
              • {criterion}
            </Text>
          ))}
        </Card>
      )}

      {/* Hints Section */}
      {hints && (
        <Card elevation="sm" padding="lg" style={styles.hintsCard}>
          <TouchableOpacity
            onPress={() => setShowHints(!showHints)}
            style={styles.hintsHeader}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              💡 {showHints ? 'Hints' : 'Need a hint?'}
            </Text>
            <Text style={[styles.hintsToggle, { color: colors.primary }]}>
              {showHints ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>

          {showHints && (
            <View style={styles.hintsList}>
              {hints.map((hint, idx) => (
                <Text
                  key={idx}
                  style={[styles.hintItem, { color: colors.text.secondary }]}
                >
                  {idx + 1}. {hint}
                </Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Estimated Time */}
      {data.estimatedTime && (
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.text.secondary }]}>
            ⏱️ Estimated time: {data.estimatedTime}
          </Text>
        </View>
      )}

      {/* Complete Button */}
      <Button
        title="I'm Done →"
        onPress={handleComplete}
        loading={context.isCompleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },
  taskCard: {
    marginBottom: Spacing.sm,
  },
  criteriaCard: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  criterionItem: {
    ...Typography.body.small,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  hintsCard: {
    marginBottom: Spacing.sm,
  },
  hintsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintsToggle: {
    ...Typography.body.small,
    fontWeight: '600',
  },
  hintsList: {
    marginTop: Spacing.sm,
  },
  hintItem: {
    ...Typography.body.small,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeText: {
    ...Typography.body.small,
  },
});

export default PracticeRenderer;
