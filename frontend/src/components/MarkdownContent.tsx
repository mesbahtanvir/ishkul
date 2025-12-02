import React from 'react';
import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const { colors } = useTheme();

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

  return (
    <View style={styles.container}>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
