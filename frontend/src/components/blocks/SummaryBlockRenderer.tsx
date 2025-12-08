/**
 * SummaryBlockRenderer - Renders summary/recap blocks
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlockContent, SummaryContent } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { MarkdownContent } from '../MarkdownContent';

interface SummaryBlockRendererProps {
  content: BlockContent;
}

export const SummaryBlockRenderer: React.FC<SummaryBlockRendererProps> = ({ content }) => {
  const { colors } = useTheme();
  const summaryContent = content as SummaryContent;

  return (
    <View style={styles.container}>
      {/* Summary Text */}
      <View style={styles.summaryContainer}>
        <MarkdownContent content={summaryContent.summary} />
      </View>

      {/* Key Points */}
      {summaryContent.keyPoints && summaryContent.keyPoints.length > 0 && (
        <View style={[styles.keyPointsContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={[styles.keyPointsTitle, { color: colors.primary }]}>
            🔑 Key Points
          </Text>
          {summaryContent.keyPoints.map((point, index) => (
            <View key={index} style={styles.keyPoint}>
              <Text style={[styles.keyPointBullet, { color: colors.primary }]}>
                •
              </Text>
              <Text style={[styles.keyPointText, { color: colors.text.primary }]}>
                {point}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Next Steps (if any) */}
      {summaryContent.nextSteps && summaryContent.nextSteps.length > 0 && (
        <View style={[styles.nextStepsContainer, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Text style={[styles.nextStepsTitle, { color: colors.success }]}>
            ➡️ Next Steps
          </Text>
          {summaryContent.nextSteps.map((step, index) => (
            <View key={index} style={styles.nextStep}>
              <Text style={[styles.nextStepNumber, { color: colors.success }]}>
                {index + 1}.
              </Text>
              <Text style={[styles.nextStepText, { color: colors.text.primary }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    marginBottom: Spacing.md,
  },
  keyPointsContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  keyPointsTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  keyPoint: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  keyPointBullet: {
    ...Typography.body.medium,
    marginRight: Spacing.sm,
    fontWeight: '700',
  },
  keyPointText: {
    ...Typography.body.medium,
    flex: 1,
  },
  nextStepsContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
  },
  nextStepsTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  nextStep: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  nextStepNumber: {
    ...Typography.body.medium,
    marginRight: Spacing.sm,
    fontWeight: '700',
    minWidth: 20,
  },
  nextStepText: {
    ...Typography.body.medium,
    flex: 1,
  },
});

export default SummaryBlockRenderer;
