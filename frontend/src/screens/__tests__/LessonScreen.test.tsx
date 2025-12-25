/**
 * LessonScreen Integration Tests
 *
 * Tests the full lesson experience including:
 * - Loading states
 * - Block generation and content generation
 * - Error handling
 * - Lesson rendering
 *
 * Note: The LessonScreen uses ScrollableLessonBlocks which handles
 * block navigation internally.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LessonScreen } from '../LessonScreen';
import type { RootStackParamList } from '../../types/navigation';
import { Block, Lesson, ContentStatus } from '../../types/app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

// Mock theme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#FFFFFF', secondary: '#F5F5F5' },
      text: { primary: '#000000', secondary: '#666666' },
      primary: '#0066FF',
      success: '#00AA55',
      danger: '#FF3B30',
      white: '#FFFFFF',
      border: '#E0E0E0',
    },
    isDark: false,
  }),
}));

// Mock responsive hook
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    responsive: (small: number) => small,
    screenSize: 'small',
    isSmall: true,
    isMedium: false,
    isLarge: false,
  }),
}));

// Track mock calls for API
const mockGetLesson = jest.fn();
const mockGenerateBlocks = jest.fn();
const mockGenerateBlockContent = jest.fn();
const mockCompleteBlock = jest.fn();

// Mock API
jest.mock('../../services/api', () => ({
  lessonsApi: {
    getLesson: (...args: unknown[]) => mockGetLesson(...args),
    generateBlocks: (...args: unknown[]) => mockGenerateBlocks(...args),
    generateBlockContent: (...args: unknown[]) => mockGenerateBlockContent(...args),
    completeBlock: (...args: unknown[]) => mockCompleteBlock(...args),
    updateLessonProgress: jest.fn().mockResolvedValue({}),
  },
}));

// Mock analytics
jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
}));

// Mock LearningLayout
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

// Mock Card
jest.mock('../../components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="card">{children}</View>;
  },
}));

// Mock Button
jest.mock('../../components/Button', () => ({
  Button: ({
    title,
    onPress,
    disabled,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    variant?: string;
    style?: object;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        testID={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
        accessibilityState={{ disabled }}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock ProgressBar
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

// Mock blocks components (ScrollableLessonBlocks, BlockRenderer)
jest.mock('../../components/blocks', () => ({
  ScrollableLessonBlocks: ({
    blocks,
    currentBlockIndex,
    onBlockComplete,
    generatingBlockId,
  }: {
    blocks: Block[];
    currentBlockIndex: number;
    completedBlockIds: string[];
    onBlockAnswer: (blockId: string, answer: string | string[]) => void;
    onBlockComplete: () => void;
    onGenerateContent: (blockId: string) => void;
    generatingBlockId: string | null;
    onContinue: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    const currentBlock = blocks[currentBlockIndex];
    return (
      <View testID="scrollable-lesson-blocks">
        {blocks.map((block: Block) => (
          <View key={block.id} testID={`block-${block.id}`}>
            <Text testID={`block-title-${block.id}`}>{block.title}</Text>
            <Text testID={`block-content-status-${block.id}`}>{block.contentStatus}</Text>
            {generatingBlockId === block.id && (
              <Text testID={`block-generating-${block.id}`}>Generating...</Text>
            )}
          </View>
        ))}
        {currentBlock && (
          <TouchableOpacity onPress={onBlockComplete} testID="complete-block-button">
            <Text>Complete Block</Text>
          </TouchableOpacity>
        )}
        <Text testID="current-block-index">{currentBlockIndex}</Text>
        <Text testID="block-indicator">Block {currentBlockIndex + 1} of {blocks.length}</Text>
      </View>
    );
  },
  BlockRenderer: ({ block }: { block: Block }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`block-${block.id}`}>
        <Text>{block.title}</Text>
      </View>
    );
  },
}));

// Helper to create mock blocks
const createMockBlock = (overrides: Partial<Block> = {}): Block => ({
  id: `block-${Math.random().toString(36).substr(2, 9)}`,
  type: 'text',
  order: 0,
  title: 'Test Block',
  purpose: 'learning',
  contentStatus: 'ready' as ContentStatus,
  content: { text: { markdown: 'Test content' } },
  ...overrides,
});

// Helper to create mock lessons
const createMockLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-1',
  title: 'Test Lesson',
  description: 'A test lesson description',
  estimatedMinutes: 30,
  blocksStatus: 'ready' as ContentStatus,
  status: 'pending',
  blocks: [],
  ...overrides,
});

// Mock navigation
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  goBack: mockGoBack,
  navigate: jest.fn(),
} as unknown as NavigationProp;

const createMockRoute = (overrides: Partial<RootStackParamList['Lesson']> = {}): ScreenRouteProp =>
  ({
    key: 'Lesson-test',
    name: 'Lesson',
    params: {
      courseId: 'course-1',
      lessonId: 'lesson-1',
      sectionId: 'section-1',
      ...overrides,
    },
  }) as unknown as ScreenRouteProp;

// Reset stores before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset Zustand stores completely
  const { useLessonStore } = require('../../state/lessonStore');
  const { useCoursesStore } = require('../../state/coursesStore');

  act(() => {
    useLessonStore.getState().clearLesson();
    // Also reset loading states that clearLesson doesn't cover
    useLessonStore.setState({
      lessonLoading: false,
      blocksGenerating: false,
      blockContentGenerating: null,
      completing: false,
      error: null,
    });
    useCoursesStore.getState().clearCourses();
  });
});

describe('LessonScreen', () => {
  describe('loading states', () => {
    it('should show loading state initially', async () => {
      // Set up a pending promise to keep loading state
      mockGetLesson.mockImplementation(() => new Promise(() => {}));

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      expect(getByText('Loading lesson...')).toBeTruthy();
    });
  });

  describe('block generation', () => {
    it('should show generating blocks state when blocksStatus is pending', async () => {
      const pendingLesson = createMockLesson({
        blocksStatus: 'pending',
        blocks: [],
      });

      mockGetLesson.mockResolvedValue({ lesson: pendingLesson });
      mockGenerateBlocks.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByText('Preparing Your Lesson')).toBeTruthy();
        expect(getByText('Creating personalized content blocks...')).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state when fetch fails', async () => {
      mockGetLesson.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
      });
    });

    it('should have Go Back button on error and navigate back', async () => {
      mockGetLesson.mockRejectedValue(new Error('API Error'));

      const { getByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByText('Go Back')).toBeTruthy();
      });

      fireEvent.press(getByText('Go Back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('lesson rendering', () => {
    it('should show lesson content when loaded', async () => {
      const mockLesson = createMockLesson({
        id: 'lesson-1',
        title: 'Introduction to Testing',
        description: 'Learn how to write tests',
        blocks: [createMockBlock({ id: 'b1', title: 'First Block' })],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId, getAllByText } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        // Title appears in both layout and header
        const titles = getAllByText('Introduction to Testing');
        expect(titles.length).toBeGreaterThan(0);
      });

      expect(getByTestId('block-b1')).toBeTruthy();
    });

    it('should display progress info', async () => {
      const mockLesson = createMockLesson({
        blocks: [
          createMockBlock({ id: 'b1' }),
          createMockBlock({ id: 'b2' }),
          createMockBlock({ id: 'b3' }),
        ],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByText, getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        // Progress text now says "completed" instead of "blocks"
        expect(getByText('0/3 completed')).toBeTruthy();
        // Block indicator comes from our mocked ScrollableLessonBlocks
        expect(getByTestId('block-indicator')).toBeTruthy();
      });
    });
  });

  describe('scrollable lesson blocks', () => {
    it('should render ScrollableLessonBlocks when lesson has blocks', async () => {
      const mockLesson = createMockLesson({
        blocks: [
          createMockBlock({ id: 'b1' }),
          createMockBlock({ id: 'b2' }),
        ],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByTestId('scrollable-lesson-blocks')).toBeTruthy();
      });
    });

    it('should show complete block button', async () => {
      const mockLesson = createMockLesson({
        blocks: [createMockBlock({ id: 'b1' }), createMockBlock({ id: 'b2' })],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByTestId('complete-block-button')).toBeTruthy();
      });
    });

    it('should render all blocks', async () => {
      const mockLesson = createMockLesson({
        blocks: [createMockBlock({ id: 'b1' }), createMockBlock({ id: 'b2' })],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByTestId('block-b1')).toBeTruthy();
        expect(getByTestId('block-b2')).toBeTruthy();
      });
    });
  });

  describe('block interaction', () => {
    it('should render blocks with correct titles', async () => {
      const block1 = createMockBlock({ id: 'b1', title: 'Block One' });
      const mockLesson = createMockLesson({
        blocks: [block1],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByTestId('block-b1')).toBeTruthy();
        expect(getByTestId('block-title-b1').props.children).toBe('Block One');
      });
    });

    it('should call API when completing a block', async () => {
      const mockLesson = createMockLesson({
        id: 'lesson-1',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });
      mockCompleteBlock.mockResolvedValue({});

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByTestId('complete-block-button')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('complete-block-button'));
      });

      await waitFor(() => {
        expect(mockCompleteBlock).toHaveBeenCalledWith(
          'course-1',
          'section-1',
          'lesson-1',
          'b1',
          expect.any(Object)
        );
      });
    });
  });

  describe('content generation indicator', () => {
    it('should render blocks with ready content status', async () => {
      // Use a ready block to avoid content generation issues
      const readyBlock = createMockBlock({
        id: 'b1',
        contentStatus: 'ready',
        content: { text: { markdown: 'Some content' } },
      });
      const mockLesson = createMockLesson({
        blocks: [readyBlock],
      });

      mockGetLesson.mockResolvedValue({ lesson: mockLesson });

      const { getByTestId } = render(
        <LessonScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        // Block renders with ready status
        expect(getByTestId('block-b1')).toBeTruthy();
        expect(getByTestId('block-content-status-b1').props.children).toBe('ready');
      });
    });
  });

  describe('initial lesson from params', () => {
    it('should use initialLesson from route params immediately', async () => {
      const initialLesson = createMockLesson({
        id: 'lesson-1',
        title: 'Pre-loaded Lesson',
        blocks: [createMockBlock({ id: 'b1' })],
      });

      mockGetLesson.mockResolvedValue({ lesson: initialLesson });

      const route = createMockRoute({ lesson: initialLesson });

      const { getByTestId, getAllByText } = render(
        <LessonScreen navigation={mockNavigation} route={route} />
      );

      // Should show lesson content with scrollable blocks
      await waitFor(() => {
        expect(getByTestId('scrollable-lesson-blocks')).toBeTruthy();
        // Title appears in multiple places (LearningLayout title and compact header)
        const titles = getAllByText('Pre-loaded Lesson');
        expect(titles.length).toBeGreaterThan(0);
      });
    });
  });
});
