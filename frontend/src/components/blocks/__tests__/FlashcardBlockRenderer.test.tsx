/**
 * FlashcardBlockRenderer Tests
 *
 * Tests for the flashcard block component to ensure:
 * - Correct access to content.flashcard (not direct cast)
 * - Proper rendering of front/back content
 * - Flip interaction works correctly
 * - Continue button flow works
 * - Null/missing content handling
 * - State transitions (Rules of Hooks compliance)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlashcardBlockRenderer } from '../FlashcardBlockRenderer';
import { BlockContent } from '../../../types/app';

// Mock the useTheme hook
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      border: '#E5E7EB',
      background: {
        primary: '#FFFFFF',
        secondary: '#F9FAFB',
      },
      text: {
        primary: '#111827',
        secondary: '#6B7280',
      },
    },
    isDark: false,
  }),
}));

// Mock Button component
jest.mock('../../Button', () => ({
  Button: ({ title, onPress }: { title: string; onPress: () => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID="continue-button">
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

describe('FlashcardBlockRenderer', () => {
  // Valid flashcard content with correct structure
  const validContent: BlockContent = {
    flashcard: {
      front: 'What is React?',
      back: 'A JavaScript library for building user interfaces',
    },
  };

  // Content with hint
  const contentWithHint: BlockContent = {
    flashcard: {
      front: 'What is TypeScript?',
      back: 'A typed superset of JavaScript',
      hint: 'Think about type safety',
    },
  };

  describe('Content Access (Regression Test)', () => {
    it('should correctly access content.flashcard property', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // The front text should be displayed (not undefined)
      expect(getByText('What is React?')).toBeTruthy();
    });

    it('should NOT treat content as FlashcardContent directly', () => {
      // This tests the bug fix: content is BlockContent, not FlashcardContent
      // If we incorrectly cast content as FlashcardContent, front/back would be undefined
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Should show the actual question, not "undefined"
      expect(getByText('What is React?')).toBeTruthy();
      expect(queryByText('undefined')).toBeNull();
    });

    it('should display back content when flipped', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Tap to flip
      fireEvent.press(getByText('What is React?'));

      // Should show the back content
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });
  });

  describe('Missing Content Handling', () => {
    it('should handle missing flashcard property gracefully', () => {
      const emptyContent: BlockContent = {};

      const { getByText } = render(
        <FlashcardBlockRenderer content={emptyContent} />
      );

      expect(getByText('No flashcard content available')).toBeTruthy();
    });

    it('should handle undefined flashcard property', () => {
      const undefinedContent: BlockContent = {
        flashcard: undefined,
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={undefinedContent} />
      );

      expect(getByText('No flashcard content available')).toBeTruthy();
    });

    it('should handle empty front and back properties', () => {
      const emptyFlashcardContent: BlockContent = {
        flashcard: {
          front: '',
          back: '',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={emptyFlashcardContent} />
      );

      expect(getByText('Flashcard content is empty')).toBeTruthy();
    });

    it('should show content when only front is provided', () => {
      const frontOnlyContent: BlockContent = {
        flashcard: {
          front: 'Question only',
          back: '',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={frontOnlyContent} />
      );

      expect(getByText('Question only')).toBeTruthy();
    });

    it('should show content when only back is provided', () => {
      const backOnlyContent: BlockContent = {
        flashcard: {
          front: '',
          back: 'Answer only',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={backOnlyContent} />
      );

      // Flip to see the back
      const card = getByText('Question');
      fireEvent.press(card);

      expect(getByText('Answer only')).toBeTruthy();
    });
  });

  describe('Initial Rendering', () => {
    it('should show Question label initially', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      expect(getByText('Question')).toBeTruthy();
    });

    it('should show front content initially', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      expect(getByText('What is React?')).toBeTruthy();
    });

    it('should show tap hint to reveal answer', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      expect(getByText('Tap to reveal answer')).toBeTruthy();
    });

    it('should NOT show Continue button initially', () => {
      const { queryByText } = render(
        <FlashcardBlockRenderer content={validContent} isActive={true} />
      );

      expect(queryByText('Continue →')).toBeNull();
    });
  });

  describe('Flip Interaction', () => {
    it('should flip to show answer when tapped', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Initially shows question
      expect(getByText('What is React?')).toBeTruthy();

      // Tap to flip
      fireEvent.press(getByText('What is React?'));

      // Should now show answer
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
      expect(getByText('Answer')).toBeTruthy();
    });

    it('should show Continue button after flip when isActive', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} isActive={true} onComplete={() => {}} />
      );

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Continue button should appear
      expect(getByText('Continue →')).toBeTruthy();
    });

    it('should flip back to question when tapped again', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Flip to answer
      fireEvent.press(getByText('What is React?'));
      expect(getByText('Answer')).toBeTruthy();

      // Flip back to question
      fireEvent.press(getByText('A JavaScript library for building user interfaces'));
      expect(getByText('Question')).toBeTruthy();
      expect(getByText('What is React?')).toBeTruthy();
    });

    it('should update tap hint based on flip state', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Initially shows "Tap to reveal answer"
      expect(getByText('Tap to reveal answer')).toBeTruthy();

      // Flip
      fireEvent.press(getByText('What is React?'));

      // Should show "Tap to see question"
      expect(getByText('Tap to see question')).toBeTruthy();
    });
  });

  describe('onComplete Callback', () => {
    it('should call onComplete when Continue is pressed', () => {
      const onCompleteMock = jest.fn();

      const { getByText, getByTestId } = render(
        <FlashcardBlockRenderer content={validContent} onComplete={onCompleteMock} isActive={true} />
      );

      // Flip the card and press Continue
      fireEvent.press(getByText('What is React?'));
      fireEvent.press(getByTestId('continue-button'));

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('should not show button when not active', () => {
      const { getByText, queryByTestId } = render(
        <FlashcardBlockRenderer content={validContent} isActive={false} />
      );

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Button should not be visible when not active
      expect(queryByTestId('continue-button')).toBeNull();
    });
  });

  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle rapid flip transitions without errors', () => {
      const { getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Rapid flipping should not cause issues
      // Flip 1: Question -> Answer
      fireEvent.press(getByText('What is React?'));
      // Flip 2: Answer -> Question
      fireEvent.press(getByText('A JavaScript library for building user interfaces'));
      // Flip 3: Question -> Answer
      fireEvent.press(getByText('What is React?'));

      // After 3 flips (odd number), should be in Answer state
      expect(getByText('Answer')).toBeTruthy();
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    it('should handle transition from initial to flipped to complete', () => {
      const onCompleteMock = jest.fn();

      const { getByText, getByTestId } = render(
        <FlashcardBlockRenderer content={validContent} onComplete={onCompleteMock} isActive={true} />
      );

      // Initial state
      expect(getByText('Question')).toBeTruthy();

      // Transition to flipped
      fireEvent.press(getByText('What is React?'));
      expect(getByText('Answer')).toBeTruthy();

      // Continue button should be visible
      expect(getByText('Continue →')).toBeTruthy();

      // Complete
      fireEvent.press(getByTestId('continue-button'));
      expect(onCompleteMock).toHaveBeenCalled();
    });

    it('should render correctly when re-rendered with new content', () => {
      const { rerender, getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // First render shows the content
      expect(getByText('What is React?')).toBeTruthy();

      // Re-render with new content
      // Note: React preserves state when re-rendering, so flipped state persists
      // But the new content should be displayed
      const newContent: BlockContent = {
        flashcard: {
          front: 'New Question',
          back: 'New Answer',
        },
      };

      rerender(<FlashcardBlockRenderer content={newContent} />);

      // New content should be rendered (either front or back depending on flip state)
      // The key test is that this doesn't throw a hooks error
      const hasNewContent = queryByText('New Answer') || queryByText('New Question');
      expect(hasNewContent).toBeTruthy();
    });

    it('should maintain consistent hook order with different content', () => {
      const { rerender, getByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // First render
      expect(getByText('What is React?')).toBeTruthy();

      // Re-render with content with hint
      rerender(<FlashcardBlockRenderer content={contentWithHint} />);
      expect(getByText('What is TypeScript?')).toBeTruthy();

      // Re-render with empty content
      rerender(<FlashcardBlockRenderer content={{}} />);
      expect(getByText('No flashcard content available')).toBeTruthy();

      // Re-render back with valid content
      rerender(<FlashcardBlockRenderer content={validContent} />);
      expect(getByText('What is React?')).toBeTruthy();
    });
  });

  describe('Answer Visibility (Back Side)', () => {
    it('should show back content text when flipped', () => {
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Initially, back content should NOT be visible
      expect(queryByText('A JavaScript library for building user interfaces')).toBeNull();

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Back content should now be visible
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    it('should hide front content when showing back', () => {
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Front content should NOT be visible when flipped
      expect(queryByText('What is React?')).toBeNull();
      // Back content should be visible
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    it('should show Answer label when flipped', () => {
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Initially shows Question label
      expect(getByText('Question')).toBeTruthy();
      expect(queryByText('Answer')).toBeNull();

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Should show Answer label, not Question
      expect(getByText('Answer')).toBeTruthy();
      expect(queryByText('Question')).toBeNull();
    });

    it('should display long answer text correctly', () => {
      const longAnswerContent: BlockContent = {
        flashcard: {
          front: 'What is machine learning?',
          back: 'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={longAnswerContent} />
      );

      // Flip the card
      fireEvent.press(getByText('What is machine learning?'));

      // Long answer should be fully visible
      expect(getByText(/Machine learning is a subset of artificial intelligence/)).toBeTruthy();
    });

    it('should display answer with special characters correctly', () => {
      const specialCharsContent: BlockContent = {
        flashcard: {
          front: 'What is the formula for water?',
          back: 'H₂O (two hydrogen atoms + one oxygen atom)',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={specialCharsContent} />
      );

      // Flip the card
      fireEvent.press(getByText('What is the formula for water?'));

      // Answer with special characters should be visible
      expect(getByText(/H₂O/)).toBeTruthy();
    });

    it('should display answer with code snippets correctly', () => {
      const codeContent: BlockContent = {
        flashcard: {
          front: 'How do you declare a variable in JavaScript?',
          back: 'const myVar = "value"; or let myVar = "value";',
        },
      };

      const { getByText } = render(
        <FlashcardBlockRenderer content={codeContent} />
      );

      // Flip the card
      fireEvent.press(getByText('How do you declare a variable in JavaScript?'));

      // Code snippet in answer should be visible
      expect(getByText(/const myVar/)).toBeTruthy();
    });

    it('should correctly toggle between front and back multiple times', () => {
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Initial state - front visible
      expect(getByText('What is React?')).toBeTruthy();
      expect(queryByText('A JavaScript library for building user interfaces')).toBeNull();

      // Flip 1 - back visible
      fireEvent.press(getByText('What is React?'));
      expect(queryByText('What is React?')).toBeNull();
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();

      // Flip 2 - front visible again
      fireEvent.press(getByText('A JavaScript library for building user interfaces'));
      expect(getByText('What is React?')).toBeTruthy();
      expect(queryByText('A JavaScript library for building user interfaces')).toBeNull();

      // Flip 3 - back visible again
      fireEvent.press(getByText('What is React?'));
      expect(queryByText('What is React?')).toBeNull();
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    it('should show back content for different flashcard content types', () => {
      // Test with TypeScript content
      const { getByText: getByText1 } = render(
        <FlashcardBlockRenderer content={contentWithHint} />
      );
      fireEvent.press(getByText1('What is TypeScript?'));
      expect(getByText1('A typed superset of JavaScript')).toBeTruthy();
    });

    it('should not show undefined or null for back content', () => {
      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={validContent} />
      );

      // Flip the card
      fireEvent.press(getByText('What is React?'));

      // Should never show undefined or null
      expect(queryByText('undefined')).toBeNull();
      expect(queryByText('null')).toBeNull();
      expect(queryByText('')).toBeNull();
    });

    it('should show back content even when front and back are similar', () => {
      const similarContent: BlockContent = {
        flashcard: {
          front: 'React',
          back: 'React is a library',
        },
      };

      const { getByText, queryByText } = render(
        <FlashcardBlockRenderer content={similarContent} />
      );

      // Initially shows front
      expect(getByText('React')).toBeTruthy();

      // Flip - should show back (which contains "React" but is different text)
      fireEvent.press(getByText('React'));
      expect(getByText('React is a library')).toBeTruthy();
      // The standalone "React" should no longer be visible
      expect(queryByText(/^React$/)).toBeNull();
    });
  });
});
