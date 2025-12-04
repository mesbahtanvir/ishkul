import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface MarkdownContentProps {
  content: string;
}

interface Citation {
  id: string;
  text: string;
}

/**
 * Parses citation footnotes from markdown content
 * Format: [^1]: Source text
 */
const parseCitations = (content: string): { cleanContent: string; citations: Citation[] } => {
  const citations: Citation[] = [];
  const footnoteRegex = /^\[\^(\d+)\]:\s*(.+)$/gm;

  let match;
  while ((match = footnoteRegex.exec(content)) !== null) {
    citations.push({
      id: match[1],
      text: match[2].trim(),
    });
  }

  // Remove footnote definitions from content (they'll be displayed separately)
  const cleanContent = content.replace(/^\[\^(\d+)\]:\s*.+$/gm, '').trim();

  return { cleanContent, citations };
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const { colors } = useTheme();

  const { cleanContent, citations } = useMemo(() => parseCitations(content), [content]);

  const markdownStyles = {
    body: {
      color: colors.text.primary,
      fontSize: Typography.body.medium.fontSize,
      lineHeight: 26,
    },
    heading1: {
      color: colors.text.primary,
      fontSize: Typography.heading.h1.fontSize,
      fontWeight: '700' as const,
      marginVertical: Spacing.md,
    },
    heading2: {
      color: colors.text.primary,
      fontSize: Typography.heading.h2.fontSize,
      fontWeight: '600' as const,
      marginVertical: Spacing.sm,
    },
    heading3: {
      color: colors.text.primary,
      fontSize: Typography.heading.h3.fontSize,
      fontWeight: '600' as const,
      marginVertical: Spacing.sm,
    },
    paragraph: {
      color: colors.text.primary,
      fontSize: Typography.body.medium.fontSize,
      lineHeight: 26,
      marginVertical: Spacing.sm,
    },
    strong: {
      fontWeight: '700' as const,
      color: colors.text.primary,
    },
    em: {
      fontStyle: 'italic' as const,
      color: colors.text.primary,
    },
    code_inline: {
      backgroundColor: colors.background.secondary,
      color: colors.text.primary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: colors.background.secondary,
      color: colors.text.primary,
      padding: Spacing.md,
      borderRadius: Spacing.borderRadius.md,
      marginVertical: Spacing.md,
      fontFamily: 'monospace',
    },
    fence: {
      backgroundColor: colors.background.secondary,
      color: colors.text.primary,
      padding: Spacing.md,
      borderRadius: Spacing.borderRadius.md,
      marginVertical: Spacing.md,
      fontFamily: 'monospace',
    },
    bullet_list: {
      marginVertical: Spacing.sm,
      marginLeft: Spacing.md,
    },
    ordered_list: {
      marginVertical: Spacing.sm,
      marginLeft: Spacing.md,
    },
    list_item: {
      color: colors.text.primary,
      marginVertical: 4,
    },
    blockquote: {
      borderLeftColor: colors.border,
      borderLeftWidth: 4,
      paddingLeft: Spacing.md,
      marginVertical: Spacing.md,
      color: colors.text.secondary,
      fontStyle: 'italic' as const,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    } as Record<string, string>,
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: Spacing.lg,
    },
  };

  // Custom rules for inline citation references [^1]
  const rules = {
    text: (node: { content: string }, children: React.ReactNode, parent: unknown, styles: Record<string, object>) => {
      const text = node.content;
      // Check for citation references like [^1]
      const citationRefRegex = /\[\^(\d+)\]/g;

      if (!citationRefRegex.test(text)) {
        return <Text key={`text-${text.substring(0, 10)}`} style={styles.text}>{text}</Text>;
      }

      // Split text by citation references and render with superscript styling
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;

      // Reset regex
      citationRefRegex.lastIndex = 0;

      while ((match = citationRefRegex.exec(text)) !== null) {
        // Add text before the citation
        if (match.index > lastIndex) {
          parts.push(
            <Text key={`pre-${match.index}`} style={styles.text}>
              {text.substring(lastIndex, match.index)}
            </Text>
          );
        }

        // Add the citation reference as superscript
        parts.push(
          <Text
            key={`cite-${match[1]}-${match.index}`}
            style={{
              fontSize: 10,
              lineHeight: 14,
              color: colors.primary,
              fontWeight: '600' as const,
            }}
          >
            [{match[1]}]
          </Text>
        );

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(
          <Text key={`post-${lastIndex}`} style={styles.text}>
            {text.substring(lastIndex)}
          </Text>
        );
      }

      return <Text key={`citation-text-${text.substring(0, 10)}`}>{parts}</Text>;
    },
  };

  return (
    <View style={styles.container}>
      <Markdown style={markdownStyles} rules={rules}>{cleanContent}</Markdown>

      {citations.length > 0 && (
        <View style={[styles.citationsContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.citationsHeader, { color: colors.text.secondary }]}>
            Sources
          </Text>
          {citations.map((citation) => (
            <View key={citation.id} style={styles.citationItem}>
              <Text style={[styles.citationNumber, { color: colors.primary }]}>
                [{citation.id}]
              </Text>
              <Text style={[styles.citationText, { color: colors.text.secondary }]}>
                {citation.text}
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
  citationsContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  citationsHeader: {
    fontSize: Typography.body.small.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  citationItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  citationNumber: {
    fontSize: Typography.body.small.fontSize,
    fontWeight: '600',
    marginRight: Spacing.xs,
    minWidth: 24,
  },
  citationText: {
    fontSize: Typography.body.small.fontSize,
    flex: 1,
    lineHeight: 18,
  },
});
