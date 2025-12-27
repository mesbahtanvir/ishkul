/**
 * TextBlockRenderer - Renders text content blocks
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlockContent } from '../../types/app';
import { MarkdownContent } from '../MarkdownContent';
import { Button } from '../Button';
import { Spacing } from '../../theme/spacing';

interface TextBlockRendererProps {
  content: BlockContent;
  onComplete?: () => void;
  isActive?: boolean;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({
  content,
  onComplete,
  isActive = false,
}) => {
  // BlockContent.text is TextContent which has a markdown property
  const textValue = content.text?.markdown || '';

  return (
    <View style={styles.container}>
      <MarkdownContent content={textValue} />
      {isActive && onComplete && (
        <View style={styles.buttonContainer}>
          <Button
            title="Continue →"
            onPress={onComplete}
            variant="primary"
            size="medium"
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
  buttonContainer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
});

export default TextBlockRenderer;
