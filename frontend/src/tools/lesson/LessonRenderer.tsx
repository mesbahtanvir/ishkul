/**
 * Lesson Tool Renderer
 *
 * Renders markdown-formatted lesson content with a completion button.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MarkdownContent } from '../../components/MarkdownContent';
import { Spacing } from '../../theme/spacing';
import { ToolRendererProps } from '../types';
import { LessonData } from './types';

export const LessonRenderer: React.FC<ToolRendererProps<LessonData>> = ({
  data,
  context,
}) => {
  const handleComplete = () => {
    context.onComplete({});
  };

  return (
    <View style={styles.container}>
      <Card elevation="sm" padding="lg" style={styles.contentCard}>
        <MarkdownContent content={data.content} />
      </Card>

      <Button
        title="I Understand →"
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
  contentCard: {
    flex: 1,
    marginBottom: Spacing.md,
  },
});

export default LessonRenderer;
