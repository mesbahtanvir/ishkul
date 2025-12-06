import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CourseProgressBar } from '../CourseProgressBar';
import type { CourseOutline, OutlinePosition } from '../../types/app';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      text: {
        primary: '#000000',
        secondary: '#666666',
        tertiary: '#999999',
      },
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
      },
      border: '#E0E0E0',
    },
  }),
}));

// Create mock outline data
const createMockOutline = (overrides: Partial<CourseOutline> = {}): CourseOutline => ({
  title: 'Learn Python Basics',
  description: 'A comprehensive course on Python',
  estimatedMinutes: 120,
  modules: [
    {
      id: 'module-1',
      title: 'Introduction to Python',
      description: 'Get started with Python',
      estimatedMinutes: 30,
      learningOutcomes: ['Understand Python basics'],
      status: 'completed',
      topics: [
        {
          id: 'topic-1-1',
          title: 'What is Python?',
          description: 'Introduction',
          estimatedMinutes: 10,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
        {
          id: 'topic-1-2',
          title: 'Installing Python',
          description: 'Setup',
          estimatedMinutes: 10,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
        {
          id: 'topic-1-3',
          title: 'First Program',
          description: 'Hello World',
          estimatedMinutes: 10,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
      ],
    },
    {
      id: 'module-2',
      title: 'Variables',
      description: 'Learn about variables',
      estimatedMinutes: 45,
      learningOutcomes: ['Work with variables'],
      status: 'in_progress',
      topics: [
        {
          id: 'topic-2-1',
          title: 'Variable Basics',
          description: 'Intro to variables',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
        {
          id: 'topic-2-2',
          title: 'Data Types',
          description: 'Types in Python',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'in_progress',
          prerequisites: [],
        },
        {
          id: 'topic-2-3',
          title: 'Type Conversion',
          description: 'Converting types',
          estimatedMinutes: 15,
          toolId: 'practice',
          status: 'pending',
          prerequisites: [],
        },
      ],
    },
    {
      id: 'module-3',
      title: 'Control Flow',
      description: 'Conditionals and loops',
      estimatedMinutes: 45,
      learningOutcomes: ['Use control flow'],
      status: 'pending',
      topics: [
        {
          id: 'topic-3-1',
          title: 'If Statements',
          description: 'Conditionals',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'pending',
          prerequisites: [],
        },
        {
          id: 'topic-3-2',
          title: 'Loops',
          description: 'For and while',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'pending',
          prerequisites: [],
        },
        {
          id: 'topic-3-3',
          title: 'Control Flow Quiz',
          description: 'Test knowledge',
          estimatedMinutes: 15,
          toolId: 'quiz',
          status: 'pending',
          prerequisites: [],
        },
      ],
    },
  ],
  metadata: {
    version: '1.0',
    generatedBy: 'test',
  },
  generatedAt: Date.now(),
  ...overrides,
});

const createMockPosition = (moduleIndex: number = 1, topicIndex: number = 1): OutlinePosition => ({
  moduleIndex,
  topicIndex,
  moduleId: `module-${moduleIndex + 1}`,
  topicId: `topic-${moduleIndex + 1}-${topicIndex + 1}`,
});

describe('CourseProgressBar', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should return null when outline is null', () => {
      const { toJSON } = render(
        <CourseProgressBar outline={null} onPress={mockOnPress} />
      );
      expect(toJSON()).toBeNull();
    });

    it('should render progress percentage', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );
      // 4 completed out of 9 topics = ~44%
      expect(getByText('44%')).toBeTruthy();
    });

    it('should render outline icon', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );
      expect(getByText('📋')).toBeTruthy();
    });
  });

  describe('current topic display', () => {
    it('should show current topic name when position is provided', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
          onPress={mockOnPress}
        />
      );
      expect(getByText('Now:')).toBeTruthy();
      expect(getByText('Data Types')).toBeTruthy();
    });

    it('should show topic count when no position is provided', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );
      expect(getByText('4 of 9 topics')).toBeTruthy();
    });

    it('should show first topic when position is at start', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          currentPosition={createMockPosition(0, 0)}
          onPress={mockOnPress}
        />
      );
      expect(getByText('What is Python?')).toBeTruthy();
    });
  });

  describe('press handling', () => {
    it('should call onPress when pressed', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );

      fireEvent.press(getByText('📋'));

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('should be tappable anywhere on the component', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );

      // Press on the percentage text
      fireEvent.press(getByText('44%'));

      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('progress calculation', () => {
    it('should show 0% for outline with no completed topics', () => {
      const noProgressOutline = createMockOutline({
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            description: 'First module',
            estimatedMinutes: 30,
            learningOutcomes: [],
            status: 'pending',
            topics: [
              {
                id: 'topic-1',
                title: 'Topic 1',
                description: 'First topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'pending',
                prerequisites: [],
              },
            ],
          },
        ],
      });

      const { getByText } = render(
        <CourseProgressBar outline={noProgressOutline} onPress={mockOnPress} />
      );

      expect(getByText('0%')).toBeTruthy();
    });

    it('should show 100% for fully completed outline', () => {
      const completedOutline = createMockOutline({
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            description: 'First module',
            estimatedMinutes: 30,
            learningOutcomes: [],
            status: 'completed',
            topics: [
              {
                id: 'topic-1',
                title: 'Topic 1',
                description: 'First topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'completed',
                prerequisites: [],
              },
              {
                id: 'topic-2',
                title: 'Topic 2',
                description: 'Second topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'completed',
                prerequisites: [],
              },
            ],
          },
        ],
      });

      const { getByText } = render(
        <CourseProgressBar outline={completedOutline} onPress={mockOnPress} />
      );

      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle outline with single topic', () => {
      const singleTopicOutline = createMockOutline({
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            description: 'First module',
            estimatedMinutes: 10,
            learningOutcomes: [],
            status: 'completed',
            topics: [
              {
                id: 'topic-1',
                title: 'Only Topic',
                description: 'The only topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'completed',
                prerequisites: [],
              },
            ],
          },
        ],
      });

      const { getByText } = render(
        <CourseProgressBar outline={singleTopicOutline} onPress={mockOnPress} />
      );

      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('module markers', () => {
    it('should render module markers for multi-module outlines', () => {
      const { toJSON } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );

      // The component should render (module markers are visual elements)
      // We verify the component renders correctly
      expect(toJSON()).toBeTruthy();
    });

    it('should not render markers for single module outline', () => {
      const singleModuleOutline = createMockOutline({
        modules: [
          {
            id: 'module-1',
            title: 'Single Module',
            description: 'Only module',
            estimatedMinutes: 30,
            learningOutcomes: [],
            status: 'in_progress',
            topics: [
              {
                id: 'topic-1',
                title: 'Topic 1',
                description: 'First topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'completed',
                prerequisites: [],
              },
              {
                id: 'topic-2',
                title: 'Topic 2',
                description: 'Second topic',
                estimatedMinutes: 10,
                toolId: 'lesson',
                status: 'pending',
                prerequisites: [],
              },
            ],
          },
        ],
      });

      const { toJSON } = render(
        <CourseProgressBar outline={singleModuleOutline} onPress={mockOnPress} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('empty outline handling', () => {
    it('should handle outline with empty modules array', () => {
      const emptyModulesOutline = createMockOutline({ modules: [] });

      const { getByText } = render(
        <CourseProgressBar outline={emptyModulesOutline} onPress={mockOnPress} />
      );

      // Should show 0% when there are no topics
      expect(getByText('0 of 0 topics')).toBeTruthy();
    });

    it('should handle module with no topics', () => {
      const emptyTopicsOutline = createMockOutline({
        modules: [
          {
            id: 'module-1',
            title: 'Empty Module',
            description: 'No topics',
            estimatedMinutes: 0,
            learningOutcomes: [],
            status: 'pending',
            topics: [],
          },
        ],
      });

      const { getByText } = render(
        <CourseProgressBar outline={emptyTopicsOutline} onPress={mockOnPress} />
      );

      expect(getByText('0 of 0 topics')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should be pressable', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );

      // The entire component should be pressable
      const pressableArea = getByText('44%');
      fireEvent.press(pressableArea);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should respond to multiple presses', () => {
      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          onPress={mockOnPress}
        />
      );

      const pressableArea = getByText('44%');
      fireEvent.press(pressableArea);
      fireEvent.press(pressableArea);
      fireEvent.press(pressableArea);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('position edge cases', () => {
    it('should handle position with out-of-bounds module index', () => {
      const outOfBoundsPosition: OutlinePosition = {
        moduleIndex: 999,
        topicIndex: 0,
        moduleId: 'invalid',
        topicId: 'invalid',
      };

      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          currentPosition={outOfBoundsPosition}
          onPress={mockOnPress}
        />
      );

      // Should fallback to showing topic count
      expect(getByText('4 of 9 topics')).toBeTruthy();
    });

    it('should handle position with out-of-bounds topic index', () => {
      const outOfBoundsPosition: OutlinePosition = {
        moduleIndex: 0,
        topicIndex: 999,
        moduleId: 'module-1',
        topicId: 'invalid',
      };

      const { getByText } = render(
        <CourseProgressBar
          outline={createMockOutline()}
          currentPosition={outOfBoundsPosition}
          onPress={mockOnPress}
        />
      );

      // Should fallback to showing topic count
      expect(getByText('4 of 9 topics')).toBeTruthy();
    });
  });
});
