/**
 * SummaryBlockRenderer - Renders summary/recap blocks
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlockContent } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Button } from '../Button';

interface SummaryBlockRendererProps {
  content: BlockContent;
  onComplete?: () => void;
  isActive?: boolean;
}

export const SummaryBlockRenderer: React.FC<SummaryBlockRendererProps> = ({
  content,
  onComplete,
  isActive = false,
}) => {
  const { colors } = useTheme();
  // Access the summary content from BlockContent.summary
  const summaryContent = content.summary;

  if (!summaryContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Key Points */}
      {summaryContent.keyPoints && summaryContent.keyPoints.length > 0 && (
        <View style={[styles.keyPointsContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={[styles.keyPointsTitle, { color: colors.primary }]}>
            🔑 Key Points
          </Text>
          {summaryContent.keyPoints.map((point: string, index: number) => (
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

      {/* Next Up (if any) */}
      {summaryContent.nextUp && (
        <View style={[styles.nextStepsContainer, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
          <Text style={[styles.nextStepsTitle, { color: colors.success }]}>
            ➡️ Coming Up Next
          </Text>
          <Text style={[styles.nextStepText, { color: colors.text.primary }]}>
            {summaryContent.nextUp}
          </Text>
        </View>
      )}

      {/* Continue button for active blocks */}
      {isActive && onComplete && (
        <View style={styles.buttonContainer}>
          <Button
            title="Continue →"
            onPress={onComplete}
            variant="primary"
            size="large"
          />
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
  buttonContainer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
});

export default SummaryBlockRenderer;
