/**
 * LessonScreen Tests
 *
 * Tests for the block-based lesson experience screen.
 * Covers all states: loading, generating, error, not found, and happy path with blocks.
 *
 * IMPORTANT: These tests verify that React hooks are called consistently
 * across all render paths (Rules of Hooks compliance).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LessonScreen } from '../LessonScreen';
import type { RootStackParamList } from '../../types/navigation';
import type { Block, Lesson } from '../../types/app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      danger: '#FF0000',
      white: '#FFFFFF',
      border: '#E0E0E0',
    },
    isDark: false,
  }),
}));

// Mock lesson store
const mockLessonStoreState = {
  localProgress: { completedBlocks: [] as string[] },
  generateBlockContent: jest.fn(),
};

jest.mock('../../state/lessonStore', () => {
  const fn = jest.fn(() => mockLessonStoreState) as jest.Mock & { getState: jest.Mock };
  fn.getState = jest.fn(() => mockLessonStoreState);
  return { useLessonStore: fn };
});

// Default mock values for useLesson hook
const defaultUseLessonReturn = {
  lesson: null as Lesson | null,
  currentBlockIndex: 0,
  totalBlocks: 0,
  isLoading: false,
  isGeneratingBlocks: false,
  isGeneratingContent: null as string | null,
  error: null as string | null,
  completedBlocksCount: 0,
  isLessonComplete: false,
  score: 0,
  nextBlock: jest.fn(),
  submitAnswer: jest.fn(),
  completeCurrentBlock: jest.fn(),
  finishLesson: jest.fn().mockResolvedValue(null),
  generateBlocksIfNeeded: jest.fn(),
};

let mockUseLessonReturn = { ...defaultUseLessonReturn };

jest.mock('../../hooks/useLesson', () => ({
  useLesson: jest.fn(() => mockUseLessonReturn),
}));

// Mock components
jest.mock('../../components/LearningLayout', () => ({
  LearningLayout: ({ children, title }: { children: React.ReactNode; title: string }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="learning-layout">
        <Text testID="layout-title">{title}</Text>
        {children}
      </View>
    );
  },
}));

jest.mock('../../components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="card">{children}</View>;
  },
}));

jest.mock('../../components/Button', () => ({
  Button: ({ title, onPress }: { title: string; onPress: () => void }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`} onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="progress-bar">
        <Text testID="progress-value">{progress}</Text>
      </View>
    );
  },
}));

jest.mock('../../components/blocks', () => ({
  ScrollableLessonBlocks: ({
    blocks,
    onBlockAnswer,
    onBlockComplete,
  }: {
    blocks: Block[];
    onBlockAnswer?: (blockId: string, answer: string) => void;
    onBlockComplete?: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="scrollable-blocks">
        <Text testID="blocks-count">{blocks.length}</Text>
        {blocks.map((block: Block) => (
          <View key={block.id} testID={`block-${block.id}`}>
            <Text>{block.title}</Text>
          </View>
        ))}
        {onBlockAnswer && (
          <TouchableOpacity
            testID="submit-answer-btn"
            onPress={() => onBlockAnswer('b1', 'test-answer')}
          >
            <Text>Submit Answer</Text>
          </TouchableOpacity>
        )}
        {onBlockComplete && (
          <TouchableOpacity testID="complete-block-btn" onPress={onBlockComplete}>
            <Text>Complete Block</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  replace: mockReplace,
  navigate: jest.fn(),
} as unknown as NavigationProp;

const createMockRoute = (overrides?: Partial<ScreenRouteProp['params']>): ScreenRouteProp =>
  ({
    key: 'Lesson-test',
    name: 'Lesson',
    params: {
      courseId: 'course-123',
      lessonId: 'lesson-456',
      sectionId: 'section-1',
      ...overrides,
    },
  }) as unknown as ScreenRouteProp;

// Sample test data
const createMockBlock = (id: string, type: Block['type'] = 'text'): Block => ({
  id,
  type,
  title: `Block ${id}`,
  purpose: `Purpose for ${id}`,
  order: parseInt(id.replace('b', ''), 10) || 1,
  contentStatus: 'ready',
  content: {
    text: { markdown: 'Test content' },
  },
});

const createMockLesson = (overrides?: Partial<Lesson>): Lesson => ({
  id: 'lesson-456',
  title: 'Test Lesson',
  description: 'A test lesson',
  estimatedMinutes: 10,
  blocksStatus: 'ready',
  blocks: [createMockBlock('b1'), createMockBlock('b2', 'question')],
  status: 'in_progress',
  ...overrides,
});

describe('LessonScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default state
    mockUseLessonReturn = { ...defaultUseLessonReturn };
    mockLessonStoreState.localProgress = { completedBlocks: [] };
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, isLoading: true };

      const { getByText, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByTestId('layout-title')).toHaveTextContent('Loading...');
      expect(getByText('Loading lesson...')).toBeTruthy();
    });

    it('should not crash with hooks when transitioning from loading to loaded', async () => {
      // Start with loading state
      mockUseLessonReturn = { ...defaultUseLessonReturn, isLoading: true };

      const { rerender, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByTestId('layout-title')).toHaveTextContent('Loading...');

      // Transition to loaded state with lesson data
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        isLoading: false,
        lesson: createMockLesson(),
        totalBlocks: 2,
      };

      // Re-render - this would crash if hooks were called conditionally
      rerender(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);

      expect(getByTestId('layout-title')).toHaveTextContent('Test Lesson');
    });
  });

  describe('Generating Blocks State', () => {
    it('should render generating blocks state correctly', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, isGeneratingBlocks: true };

      const { getByText, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByTestId('layout-title')).toHaveTextContent('Preparing Lesson');
      expect(getByText('Preparing Your Lesson')).toBeTruthy();
      expect(getByText('Creating personalized content blocks...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should render error state correctly', () => {
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        error: 'Failed to load lesson',
      };

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Failed to load lesson')).toBeTruthy();
    });

    it('should navigate back when Go Back button is pressed in error state', () => {
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        error: 'Test error',
      };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      fireEvent.press(getByTestId('button-go-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('No Lesson Data State', () => {
    it('should render not found state when lesson is null', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, lesson: null };

      const { getByText, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByTestId('layout-title')).toHaveTextContent('Not Found');
      expect(getByText('Lesson not found')).toBeTruthy();
    });

    it('should navigate back when Go Back button is pressed in not found state', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, lesson: null };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      fireEvent.press(getByTestId('button-go-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Happy Path - Lesson with Blocks', () => {
    it('should render lesson with blocks correctly', () => {
      const lesson = createMockLesson();
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 2,
        completedBlocksCount: 1,
      };
      mockLessonStoreState.localProgress = { completedBlocks: ['b1'] };

      const { getByTestId, getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByTestId('layout-title')).toHaveTextContent('Test Lesson');
      expect(getByTestId('scrollable-blocks')).toBeTruthy();
      expect(getByTestId('blocks-count')).toHaveTextContent('2');
      expect(getByText('1/2 completed')).toBeTruthy();
    });

    it('should render progress bar with correct percentage', () => {
      const lesson = createMockLesson();
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 4,
        completedBlocksCount: 2,
      };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // 2/4 = 50%
      expect(getByTestId('progress-value')).toHaveTextContent('50');
    });

    it('should call submitAnswer when block answer is submitted', () => {
      const lesson = createMockLesson();
      const mockSubmitAnswer = jest.fn();
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 2,
        submitAnswer: mockSubmitAnswer,
      };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      fireEvent.press(getByTestId('submit-answer-btn'));
      expect(mockSubmitAnswer).toHaveBeenCalledWith('test-answer');
    });

    it('should call completeCurrentBlock when block is completed', async () => {
      const lesson = createMockLesson();
      const mockCompleteCurrentBlock = jest.fn().mockResolvedValue(undefined);
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 2,
        completeCurrentBlock: mockCompleteCurrentBlock,
      };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      fireEvent.press(getByTestId('complete-block-btn'));

      await waitFor(() => {
        expect(mockCompleteCurrentBlock).toHaveBeenCalled();
      });
    });
  });

  describe('Pending Blocks State', () => {
    it('should show generate content prompt when blocksStatus is pending', () => {
      const lesson = createMockLesson({ blocksStatus: 'pending', blocks: [] });
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 0,
      };

      const { getByText, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByText('Preparing Lesson Content')).toBeTruthy();
      expect(getByTestId('button-generate-content')).toBeTruthy();
    });

    it('should call generateBlocksIfNeeded when Generate Content button is pressed', () => {
      const lesson = createMockLesson({ blocksStatus: 'pending', blocks: [] });
      const mockGenerateBlocks = jest.fn();
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 0,
        generateBlocksIfNeeded: mockGenerateBlocks,
      };

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      fireEvent.press(getByTestId('button-generate-content'));
      expect(mockGenerateBlocks).toHaveBeenCalled();
    });
  });

  describe('Block Generation Error State', () => {
    it('should show error state when blocksStatus is error', () => {
      const lesson = createMockLesson({ blocksStatus: 'error', blocks: [] });
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 0,
      };

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByText('Failed to Load Content')).toBeTruthy();
    });
  });

  describe('No Blocks State', () => {
    it('should show no content state when lesson has no blocks and status is ready', () => {
      const lesson = createMockLesson({ blocksStatus: 'ready', blocks: [] });
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        totalBlocks: 0,
      };

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByText('No Content Available')).toBeTruthy();
    });
  });

  describe('Lesson Completion', () => {
    it('should navigate to LessonComplete when lesson is complete', async () => {
      const lesson = createMockLesson();
      const mockFinishLesson = jest.fn().mockResolvedValue({ sectionId: 's2', lessonId: 'l1' });
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        lesson,
        isLessonComplete: true,
        score: 85,
        finishLesson: mockFinishLesson,
      };

      render(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);

      await waitFor(() => {
        expect(mockFinishLesson).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('LessonComplete', {
          courseId: 'course-123',
          lessonId: 'lesson-456',
          sectionId: 'section-1',
          score: 85,
          timeSpent: 0,
          nextLesson: { sectionId: 's2', lessonId: 'l1' },
        });
      });
    });
  });

  describe('Hooks Order Compliance (Rules of Hooks)', () => {
    /**
     * These tests verify that the component doesn't crash when transitioning
     * between different states. The bug fixed in commit a2a923f was caused by
     * hooks being called after conditional returns, violating React's Rules of Hooks.
     */

    it('should handle transition from loading to error without crashing', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, isLoading: true };

      const { rerender, getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // Transition to error state
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        isLoading: false,
        error: 'Network error',
      };

      rerender(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);

      expect(getByText('Network error')).toBeTruthy();
    });

    it('should handle transition from loading to no lesson without crashing', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, isLoading: true };

      const { rerender, getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // Transition to no lesson state
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        isLoading: false,
        lesson: null,
      };

      rerender(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);

      expect(getByText('Lesson not found')).toBeTruthy();
    });

    it('should handle transition from generating to ready without crashing', () => {
      mockUseLessonReturn = { ...defaultUseLessonReturn, isGeneratingBlocks: true };

      const { rerender, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // Transition to ready with blocks
      mockUseLessonReturn = {
        ...defaultUseLessonReturn,
        isGeneratingBlocks: false,
        lesson: createMockLesson(),
        totalBlocks: 2,
      };

      rerender(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);

      expect(getByTestId('scrollable-blocks')).toBeTruthy();
    });

    it('should handle multiple rapid state transitions without crashing', () => {
      const { rerender } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // Rapid transitions through multiple states
      const states = [
        { isLoading: true },
        { isLoading: false, isGeneratingBlocks: true },
        { isLoading: false, isGeneratingBlocks: false, lesson: null },
        { isLoading: false, isGeneratingBlocks: false, error: 'Error' },
        { isLoading: false, isGeneratingBlocks: false, lesson: createMockLesson(), totalBlocks: 2 },
      ];

      states.forEach((state) => {
        mockUseLessonReturn = { ...defaultUseLessonReturn, ...state };
        // Should not throw
        expect(() => {
          rerender(<LessonScreen navigation={mockNavigation} route={createMockRoute()} />);
        }).not.toThrow();
      });
    });
  });
});
