/**
 * TextBlockRenderer - Renders text content blocks
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlockContent } from '../../types/app';
import { MarkdownContent } from '../MarkdownContent';

interface TextBlockRendererProps {
  content: BlockContent;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ content }) => {
  // BlockContent.text is TextContent which has a text property
  const textValue = content.text?.text || '';

  return (
    <View style={styles.container}>
      <MarkdownContent content={textValue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TextBlockRenderer;
