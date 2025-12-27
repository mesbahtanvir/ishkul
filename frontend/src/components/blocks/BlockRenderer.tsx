/**
 * BlockRenderer - Renders content blocks based on their type
 *
 * Supports: text, code, question, task, flashcard, summary
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Block, BlockContent, BlockType } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Card } from '../Card';

// Block-specific renderers
import { TextBlockRenderer } from './TextBlockRenderer';
import { CodeBlockRenderer } from './CodeBlockRenderer';
import { QuestionBlockRenderer } from './QuestionBlockRenderer';
import { TaskBlockRenderer } from './TaskBlockRenderer';
import { FlashcardBlockRenderer } from './FlashcardBlockRenderer';
import { SummaryBlockRenderer } from './SummaryBlockRenderer';

export interface BlockRendererProps {
  block: Block;
  onAnswer?: (answer: string | string[]) => void;
  onComplete?: () => void;
  onGenerateContent?: () => void; // Callback to trigger content generation
  isActive?: boolean;
  showHeader?: boolean;
  isGenerating?: boolean; // Whether content is currently being generated
  style?: ViewStyle;
}

/**
 * Get icon for block type
 */
const getBlockIcon = (type: BlockType): string => {
  switch (type) {
    case 'text':
      return '📖';
    case 'code':
      return '💻';
    case 'question':
      return '❓';
    case 'task':
      return '✅';
    case 'flashcard':
      return '🃏';
    case 'summary':
      return '📝';
    default:
      return '📄';
  }
};

/**
 * Get label for block type
 */
const getBlockLabel = (type: BlockType): string => {
  switch (type) {
    case 'text':
      return 'Learn';
    case 'code':
      return 'Code';
    case 'question':
      return 'Quiz';
    case 'task':
      return 'Practice';
    case 'flashcard':
      return 'Flashcard';
    case 'summary':
      return 'Summary';
    default:
      return 'Content';
  }
};

/**
 * BlockRenderer - Main component that delegates to type-specific renderers
 */
export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onAnswer,
  onComplete,
  onGenerateContent,
  isActive = false,
  showHeader = true,
  isGenerating = false,
  style,
}) => {
  const { colors } = useTheme();

  // Handle pending/generating content
  if (block.contentStatus === 'pending' || block.contentStatus === 'generating' || isGenerating) {
    const isCurrentlyGenerating = block.contentStatus === 'generating' || isGenerating;
    return (
      <Card elevation="md" padding="lg" style={style}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingIcon, { color: colors.text.secondary }]}>
            {isCurrentlyGenerating ? '⏳' : '📦'}
          </Text>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            {isCurrentlyGenerating ? 'Generating content...' : 'Content pending'}
          </Text>
          {/* Show generate button if pending and not generating */}
          {block.contentStatus === 'pending' && !isCurrentlyGenerating && onGenerateContent && (
            <View style={styles.generateButtonContainer}>
              <Text
                style={[styles.generateButton, { color: colors.primary }]}
                onPress={onGenerateContent}
              >
                Generate Content
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  }

  // Handle error state
  if (block.contentStatus === 'error') {
    return (
      <Card elevation="md" padding="lg" style={style}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Failed to load content
          </Text>
          {block.contentError && (
            <Text style={[styles.errorDetail, { color: colors.text.secondary }]}>
              {block.contentError}
            </Text>
          )}
          {/* Show retry button */}
          {onGenerateContent && (
            <View style={styles.generateButtonContainer}>
              <Text
                style={[styles.retryButton, { color: colors.primary }]}
                onPress={onGenerateContent}
              >
                Retry
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  }

  // Handle missing content
  if (!block.content) {
    return (
      <Card elevation="md" padding="lg" style={style}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📭</Text>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            No content available
          </Text>
        </View>
      </Card>
    );
  }

  // Render block header - compact inline layout
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{getBlockIcon(block.type)}</Text>
        <Text
          style={[styles.headerTitle, { color: colors.text.primary }]}
          numberOfLines={1}
        >
          {block.title || getBlockLabel(block.type)}
        </Text>
      </View>
    );
  };

  // Render block content based on type
  const renderContent = () => {
    const content = block.content as BlockContent;

    switch (block.type) {
      case 'text':
        return (
          <TextBlockRenderer
            content={content}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      case 'code':
        return (
          <CodeBlockRenderer
            content={content}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      case 'question':
        return (
          <QuestionBlockRenderer
            content={content}
            onAnswer={onAnswer}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      case 'task':
        return (
          <TaskBlockRenderer
            content={content}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      case 'flashcard':
        return (
          <FlashcardBlockRenderer
            content={content}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      case 'summary':
        return (
          <SummaryBlockRenderer
            content={content}
            onComplete={onComplete}
            isActive={isActive}
          />
        );
      default:
        return (
          <Text style={[styles.unknownType, { color: colors.text.secondary }]}>
            Unknown block type: {block.type}
          </Text>
        );
    }
  };

  return (
    <Card elevation="md" padding="lg" style={style}>
      {renderHeader()}
      <View style={showHeader ? styles.contentWithHeader : undefined}>
        {renderContent()}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    flex: 1,
  },
  contentWithHeader: {
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  loadingText: {
    ...Typography.body.medium,
  },
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  errorDetail: {
    ...Typography.body.small,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  generateButtonContainer: {
    marginTop: Spacing.md,
  },
  generateButton: {
    ...Typography.label.medium,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  retryButton: {
    ...Typography.label.medium,
    fontWeight: '600',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  unknownType: {
    ...Typography.body.medium,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default BlockRenderer;
