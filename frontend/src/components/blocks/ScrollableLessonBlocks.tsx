/**
 * ScrollableLessonBlocks - Scrollable stacked cards lesson view
 *
 * Renders all lesson blocks in a scrollable list with:
 * - Completed blocks: checkmark badge, slightly faded
 * - Active block: highlighted border/shadow
 * - Upcoming blocks: dimmed/locked preview
 * - Auto-scroll to active block on navigation
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { Block } from '../../types/app';
import { Spacing } from '../../theme/spacing';
import { LessonBlockCard } from './LessonBlockCard';
import { UpcomingSummaryCard } from './UpcomingSummaryCard';

export type BlockStatus = 'completed' | 'active' | 'upcoming';

interface ScrollableLessonBlocksProps {
  blocks: Block[];
  currentBlockIndex: number;
  completedBlockIds: string[];
  onBlockAnswer?: (blockId: string, answer: string | string[]) => void;
  onBlockComplete?: () => void;
  onGenerateContent?: (blockId: string) => void;
  generatingBlockId?: string | null;
  onContinue?: () => void;
}

/**
 * Determine block status based on index and completion
 */
const getBlockStatus = (
  blockIndex: number,
  currentIndex: number,
  completedIds: string[],
  blockId: string
): BlockStatus => {
  if (completedIds.includes(blockId)) {
    return 'completed';
  }
  if (blockIndex === currentIndex) {
    return 'active';
  }
  return 'upcoming';
};

export const ScrollableLessonBlocks: React.FC<ScrollableLessonBlocksProps> = ({
  blocks,
  currentBlockIndex,
  completedBlockIds,
  onBlockAnswer,
  onBlockComplete,
  onGenerateContent,
  generatingBlockId,
  onContinue,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const blockPositions = useRef<Map<number, number>>(new Map());
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Track block positions for auto-scroll
   */
  const handleBlockLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      blockPositions.current.set(index, y);
    },
    []
  );

  /**
   * Auto-scroll to current block when index changes
   */
  useEffect(() => {
    // Don't auto-scroll if user is actively scrolling
    if (isUserScrolling.current) return;

    const scrollToBlock = () => {
      const targetY = blockPositions.current.get(currentBlockIndex);
      if (targetY !== undefined && scrollViewRef.current) {
        // Add offset to show some context above the block
        const offset = Math.max(0, targetY - 20);
        scrollViewRef.current.scrollTo({
          y: offset,
          animated: true,
        });
      }
    };

    // Small delay to ensure layout is complete
    const timer = setTimeout(scrollToBlock, 100);
    return () => clearTimeout(timer);
  }, [currentBlockIndex]);

  /**
   * Track when user is scrolling vs auto-scroll
   */
  const handleScrollBegin = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
  }, []);

  const handleScrollEnd = useCallback(() => {
    // Reset after a delay to allow subsequent auto-scrolls
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 500);
  }, []);

  /**
   * Handle block completion and auto-advance
   */
  const handleBlockComplete = useCallback(() => {
    onBlockComplete?.();
    // Auto-advance to next block after a brief delay
    setTimeout(() => {
      onContinue?.();
    }, 300);
  }, [onBlockComplete, onContinue]);

  /**
   * Separate blocks into visible (completed + active) and upcoming
   */
  const { visibleBlocks, upcomingBlocks } = useMemo(() => {
    const visible: { block: Block; index: number }[] = [];
    const upcoming: Block[] = [];

    blocks.forEach((block, index) => {
      const status = getBlockStatus(
        index,
        currentBlockIndex,
        completedBlockIds,
        block.id
      );

      if (status === 'upcoming') {
        upcoming.push(block);
      } else {
        visible.push({ block, index });
      }
    });

    return { visibleBlocks: visible, upcomingBlocks: upcoming };
  }, [blocks, currentBlockIndex, completedBlockIds]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      onScrollBeginDrag={handleScrollBegin}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    >
      {/* Render completed and active blocks */}
      {visibleBlocks.map(({ block, index }, arrayIndex) => {
        const status = getBlockStatus(
          index,
          currentBlockIndex,
          completedBlockIds,
          block.id
        );
        const isGenerating = generatingBlockId === block.id;
        const isLastVisible = arrayIndex === visibleBlocks.length - 1;

        return (
          <View
            key={block.id}
            onLayout={(event) => handleBlockLayout(index, event)}
            style={styles.blockWrapper}
          >
            <LessonBlockCard
              block={block}
              status={status}
              isGenerating={isGenerating}
              onAnswer={
                onBlockAnswer
                  ? (answer) => onBlockAnswer(block.id, answer)
                  : undefined
              }
              onComplete={handleBlockComplete}
              onGenerateContent={
                onGenerateContent
                  ? () => onGenerateContent(block.id)
                  : undefined
              }
            />
            {/* Modern connector between blocks */}
            {(!isLastVisible || upcomingBlocks.length > 0) && (
              <View style={styles.connector}>
                <View
                  style={[
                    styles.connectorLine,
                    status === 'completed' && styles.connectorLineCompleted,
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}

      {/* Render summary card for upcoming blocks */}
      {upcomingBlocks.length > 0 && (
        <View style={styles.blockWrapper}>
          <UpcomingSummaryCard blocks={upcomingBlocks} />
        </View>
      )}

      {/* Bottom padding for better scroll experience */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Platform.OS === 'web' ? 0 : Spacing.sm,
  },
  blockWrapper: {
    marginBottom: Spacing.xs,
  },
  connector: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginLeft: 2, // Align with left indicator bar
  },
  connectorLine: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 1,
  },
  connectorLineCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
  },
  bottomPadding: {
    height: 100, // Extra space at bottom for comfortable scrolling
  },
});

export default ScrollableLessonBlocks;
