import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CourseOutlineSidebar } from '../CourseOutlineSidebar';
import type { CourseOutline, OutlinePosition } from '../../types/app';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      primaryLight: '#E3F2FD',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
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
      ios: {
        gray: '#8E8E93',
      },
    },
  }),
}));

// Create mock outline data
const createMockOutline = (overrides: Partial<CourseOutline> = {}): CourseOutline => ({
  title: 'Learn Python Basics',
  description: 'A comprehensive course on Python',
  estimatedMinutes: 120,
  prerequisites: [],
  learningOutcomes: ['Understand Python basics', 'Write simple programs'],
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
          description: 'Introduction to the language',
          estimatedMinutes: 10,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
        {
          id: 'topic-1-2',
          title: 'Installing Python',
          description: 'Setup your environment',
          estimatedMinutes: 10,
          toolId: 'lesson',
          status: 'completed',
          prerequisites: [],
        },
        {
          id: 'topic-1-3',
          title: 'Python Quiz',
          description: 'Test your knowledge',
          estimatedMinutes: 10,
          toolId: 'quiz',
          status: 'completed',
          prerequisites: [],
        },
      ],
    },
    {
      id: 'module-2',
      title: 'Variables and Data Types',
      description: 'Learn about variables',
      estimatedMinutes: 45,
      learningOutcomes: ['Work with variables'],
      status: 'in_progress',
      topics: [
        {
          id: 'topic-2-1',
          title: 'Variables',
          description: 'Learn about variables',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'completed',
          stepId: 'step-1',
          prerequisites: [],
        },
        {
          id: 'topic-2-2',
          title: 'Data Types',
          description: 'Explore data types',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'pending',
          stepId: 'step-2',
          prerequisites: [],
        },
        {
          id: 'topic-2-3',
          title: 'Practice Exercises',
          description: 'Practice what you learned',
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
      description: 'Learn about conditionals and loops',
      estimatedMinutes: 45,
      learningOutcomes: ['Use control flow statements'],
      status: 'pending',
      topics: [
        {
          id: 'topic-3-1',
          title: 'If Statements',
          description: 'Conditional logic',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'pending',
          prerequisites: [],
        },
        {
          id: 'topic-3-2',
          title: 'Loops',
          description: 'For and while loops',
          estimatedMinutes: 15,
          toolId: 'lesson',
          status: 'pending',
          prerequisites: [],
        },
        {
          id: 'topic-3-3',
          title: 'Control Flow Quiz',
          description: 'Test your knowledge',
          estimatedMinutes: 15,
          toolId: 'quiz',
          status: 'pending',
          prerequisites: [],
        },
      ],
    },
  ],
  metadata: {
    difficulty: 'beginner',
    category: 'programming',
    tags: ['python', 'basics'],
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

describe('CourseOutlineSidebar', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should return null when outline is null', () => {
      const { toJSON } = render(<CourseOutlineSidebar outline={null} />);
      expect(toJSON()).toBeNull();
    });

    it('should render header with title', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(getByText('Course Outline')).toBeTruthy();
    });

    it('should render course title in progress section', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(getByText('Learn Python Basics')).toBeTruthy();
    });

    it('should render all module titles', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(getByText('Introduction to Python')).toBeTruthy();
      expect(getByText('Variables and Data Types')).toBeTruthy();
      expect(getByText('Control Flow')).toBeTruthy();
    });
  });

  describe('progress display', () => {
    it('should show correct topic completion count', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      // 4 completed out of 9 total topics
      expect(getByText('4 of 9 topics completed')).toBeTruthy();
    });

    it('should show correct progress percentage', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      // 4/9 = ~44%
      expect(getByText('44%')).toBeTruthy();
    });

    it('should show module count in stats', () => {
      const { getAllByText, getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      // '3' appears multiple times (module count + topic counts), so use getAllByText
      expect(getAllByText('3').length).toBeGreaterThan(0);
      expect(getByText('Modules')).toBeTruthy();
    });

    it('should show topics count in stats', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(getByText('9')).toBeTruthy(); // 9 topics
      expect(getByText('Topics')).toBeTruthy();
    });

    it('should show total time in stats', () => {
      const { getByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      expect(getByText('2h')).toBeTruthy(); // 120 minutes = 2 hours
      expect(getByText('Total')).toBeTruthy();
    });
  });

  describe('current position highlighting', () => {
    it('should highlight current module', () => {
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
        />
      );
      // The current module should be rendered
      expect(getByText('Variables and Data Types')).toBeTruthy();
    });

    it('should show NOW badge for current topic when module is expanded', () => {
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
        />
      );
      // The NOW badge should be visible
      expect(getByText('NOW')).toBeTruthy();
    });
  });

  describe('module expansion', () => {
    it('should expand current module by default', () => {
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
        />
      );
      // Topics from module 2 should be visible
      expect(getByText('Variables')).toBeTruthy();
      expect(getByText('Data Types')).toBeTruthy();
    });

    it('should toggle module expansion on press', () => {
      const { getByText, queryByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(0, 0)} // Current is module 1
        />
      );

      // Module 3 should be collapsed
      expect(queryByText('If Statements')).toBeNull();

      // Press module 3 to expand
      fireEvent.press(getByText('Control Flow'));

      // Topics should now be visible
      expect(getByText('If Statements')).toBeTruthy();
    });
  });

  describe('topic press handling', () => {
    it('should call onTopicPress when topic is pressed', () => {
      const mockOnTopicPress = jest.fn();
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
          onTopicPress={mockOnTopicPress}
        />
      );

      // Press a topic in the current (expanded) module
      fireEvent.press(getByText('Variables'));

      expect(mockOnTopicPress).toHaveBeenCalledWith(
        1, // moduleIndex
        0, // topicIndex
        expect.objectContaining({ title: 'Variables', stepId: 'step-1' })
      );
    });

    it('should pass correct topic data to onTopicPress', () => {
      const mockOnTopicPress = jest.fn();
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
          onTopicPress={mockOnTopicPress}
        />
      );

      fireEvent.press(getByText('Data Types'));

      expect(mockOnTopicPress).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          id: 'topic-2-2',
          title: 'Data Types',
          toolId: 'lesson',
          status: 'pending',
        })
      );
    });
  });

  describe('collapsed state', () => {
    it('should render collapsed view when collapsed prop is true', () => {
      const { queryByText, getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          collapsed={true}
        />
      );

      // Should not show full header
      expect(queryByText('Course Outline')).toBeNull();

      // Should show collapsed progress
      expect(getByText('44%')).toBeTruthy();
    });

    it('should call onToggleCollapse when expand button is pressed', () => {
      const mockToggle = jest.fn();
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          collapsed={true}
          onToggleCollapse={mockToggle}
        />
      );

      // Press the expand button (»)
      fireEvent.press(getByText('»'));

      expect(mockToggle).toHaveBeenCalled();
    });

    it('should call onToggleCollapse when collapse button is pressed', () => {
      const mockToggle = jest.fn();
      const { getByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          collapsed={false}
          onToggleCollapse={mockToggle}
        />
      );

      // Press the collapse button («)
      fireEvent.press(getByText('«'));

      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('tool icons', () => {
    it('should show lesson icon for lesson topics', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
        />
      );
      // Lesson icon is 📖, but completed topics show ✓
      // The pending topics should show the tool icon
      expect(getAllByText('lesson').length).toBeGreaterThan(0);
    });

    it('should show checkmark for completed topics', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 1)}
        />
      );
      // Completed topics show ✓
      expect(getAllByText('✓').length).toBeGreaterThan(0);
    });
  });

  describe('module status indicators', () => {
    it('should show checkmark for completed modules', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      // Module 1 is completed, should show ✓ in the module number
      expect(getAllByText('✓').length).toBeGreaterThan(0);
    });

    it('should show module number for non-completed modules', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar outline={createMockOutline()} />
      );
      // Module 2 and 3 are not completed - numbers appear multiple times
      expect(getAllByText('2').length).toBeGreaterThan(0);
      expect(getAllByText('3').length).toBeGreaterThan(0);
    });
  });

  describe('empty outline', () => {
    it('should handle outline with no modules', () => {
      const emptyOutline = createMockOutline({ modules: [] });
      const { getByText } = render(
        <CourseOutlineSidebar outline={emptyOutline} />
      );
      expect(getByText('Course Outline')).toBeTruthy();
      expect(getByText('0 of 0 topics completed')).toBeTruthy();
    });

    it('should handle module with no topics', () => {
      const outlineWithEmptyModule = createMockOutline({
        modules: [
          {
            id: 'module-empty',
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
        <CourseOutlineSidebar outline={outlineWithEmptyModule} />
      );
      expect(getByText('Empty Module')).toBeTruthy();
      expect(getByText('0/0 topics')).toBeTruthy();
    });
  });

  describe('estimated time display', () => {
    it('should show module estimated time', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 0)}
        />
      );
      // Module 2 has 45 minutes - may appear multiple times
      expect(getAllByText(/45 min/).length).toBeGreaterThan(0);
    });

    it('should show topic duration when expanded', () => {
      const { getAllByText } = render(
        <CourseOutlineSidebar
          outline={createMockOutline()}
          currentPosition={createMockPosition(1, 0)}
        />
      );
      // Topics have 15 min each
      expect(getAllByText('15 min').length).toBeGreaterThan(0);
    });
  });
});
