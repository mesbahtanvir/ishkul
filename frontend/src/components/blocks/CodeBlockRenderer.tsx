/**
 * CodeBlockRenderer - Renders code content blocks with syntax highlighting
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BlockContent, CodeContent } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { MarkdownContent } from '../MarkdownContent';

interface CodeBlockRendererProps {
  content: BlockContent;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({ content }) => {
  const { colors } = useTheme();
  // Access the code content from BlockContent.code
  const codeContent = content.code;

  if (!codeContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Explanation */}
      {codeContent.explanation && (
        <View style={styles.explanationContainer}>
          <MarkdownContent content={codeContent.explanation} />
        </View>
      )}

      {/* Code Block */}
      <View style={[styles.codeContainer, { backgroundColor: colors.background.tertiary || colors.background.secondary }]}>
        {codeContent.language && (
          <View style={[styles.languageBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.languageText, { color: colors.primary }]}>
              {codeContent.language}
            </Text>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={[styles.codeText, { color: colors.text.primary }]}>
            {codeContent.code}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  explanationContainer: {
    marginBottom: Spacing.md,
  },
  codeContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.md,
  },
  languageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Spacing.borderRadius.sm,
    marginBottom: Spacing.sm,
  },
  languageText: {
    ...Typography.label.small,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
  },
  outputSection: {
    marginTop: Spacing.sm,
  },
  outputLabel: {
    ...Typography.label.small,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  outputContainer: {
    padding: Spacing.sm,
    borderRadius: Spacing.borderRadius.sm,
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});

export default CodeBlockRenderer;
