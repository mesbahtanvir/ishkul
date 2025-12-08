/**
 * TextBlockRenderer - Renders text content blocks
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlockContent, TextContent } from '../../types/app';
import { MarkdownContent } from '../MarkdownContent';

interface TextBlockRendererProps {
  content: BlockContent;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ content }) => {
  const textContent = content as TextContent;

  return (
    <View style={styles.container}>
      <MarkdownContent content={textContent.text} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TextBlockRenderer;
