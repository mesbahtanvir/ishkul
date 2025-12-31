/**
 * ScrollableLessonBlocks - Clean, immersive lesson view
 *
 * Minimal design with:
 * - Full-width content blocks
 * - Subtle down arrow for navigation
 * - Smooth auto-scroll between blocks
 * - Summary card for upcoming blocks
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Block } from '../../types/app';
import { Spacing } from '../../theme/spacing';
import { LessonBlockCard } from './LessonBlockCard';
import { UpcomingSummaryCard } from './UpcomingSummaryCard';
import { useTheme } from '../../hooks/useTheme';

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
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const blockPositions = useRef<Map<number, number>>(new Map());
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated value for arrow bounce
  const arrowBounce = useRef(new Animated.Value(0)).current;

  // Start arrow bounce animation
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowBounce, {
          toValue: 6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(arrowBounce, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [arrowBounce]);

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
   * Must await completion before advancing to ensure isLessonComplete is accurate
   */
  const handleBlockComplete = useCallback(async () => {
    await onBlockComplete?.();
    // Auto-advance to next block after completion
    onContinue?.();
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

  // Check if there are more blocks after current
  const hasMoreBlocks = currentBlockIndex < blocks.length - 1 || upcomingBlocks.length > 0;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={handleScrollBegin}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    >
      {/* Render completed and active blocks */}
      {visibleBlocks.map(({ block, index }) => {
        const status = getBlockStatus(
          index,
          currentBlockIndex,
          completedBlockIds,
          block.id
        );
        const isGenerating = generatingBlockId === block.id;
        const isActive = status === 'active';

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

            {/* Down arrow for active block - tap to continue */}
            {isActive && hasMoreBlocks && (
              <TouchableOpacity
                style={styles.arrowContainer}
                onPress={handleBlockComplete}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.arrowWrapper,
                    { transform: [{ translateY: arrowBounce }] },
                  ]}
                >
                  <Text style={[styles.arrowIcon, { color: colors.text.tertiary }]}>
                    ↓
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Render summary card for upcoming blocks */}
      {upcomingBlocks.length > 0 && (
        <View style={styles.upcomingWrapper}>
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
    paddingTop: Spacing.md,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 0,
  },
  blockWrapper: {
    marginBottom: Spacing.sm,
  },
  upcomingWrapper: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },

  // Down arrow navigation
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  arrowWrapper: {
    padding: Spacing.sm,
  },
  arrowIcon: {
    fontSize: 24,
    fontWeight: '300',
  },

  bottomPadding: {
    height: 120, // Extra space at bottom for comfortable scrolling
  },
});

export default ScrollableLessonBlocks;
