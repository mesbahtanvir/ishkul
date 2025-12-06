import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LearningPathScreen } from '../LearningPathScreen';
import type { RootStackParamList } from '../../types/navigation';
import type { LearningPath, Step, CourseOutline } from '../../types/app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LearningPath'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'LearningPath'>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Create mock step
const createMockStep = (overrides: Partial<Step> = {}): Step => ({
  id: 'step-1',
  index: 0,
  type: 'lesson',
  topic: 'Variables',
  title: 'Introduction to Variables',
  content: 'Learn about variables',
  completed: false,
  completedAt: 0,
  createdAt: Date.now(),
  ...overrides,
});

// Create mock outline
const createMockOutline = (): CourseOutline => ({
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
      ],
    },
  ],
  metadata: {
    difficulty: 'beginner',
    category: 'programming',
    tags: ['python', 'basics'],
  },
  generatedAt: Date.now(),
});

// Create mock path
const createMockPath = (overrides: Partial<LearningPath> = {}): LearningPath => ({
  id: 'test-path-123',
  goal: 'Learn Python',
  level: 'beginner',
  emoji: '🐍',
  progress: 50,
  lessonsCompleted: 5,
  totalLessons: 10,
  steps: [createMockStep({ completed: true }), createMockStep({ id: 'step-2', index: 1 })],
  memory: { topics: {} },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastAccessedAt: Date.now(),
  ...overrides,
});

// Spy on console.error to suppress expected error logs during tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

// Mock stores
const mockSetActivePath = jest.fn();
const mockAddStep = jest.fn();
const mockGetCachedPath = jest.fn();
const mockIsCacheValid = jest.fn();
let mockActivePath: LearningPath | null = null;

// Create a mock store object with getState function
const mockStore = {
  activePath: null as LearningPath | null,
  setActivePath: mockSetActivePath,
  addStep: mockAddStep,
  getCachedPath: mockGetCachedPath,
  pathsCache: new Map(),
  isCacheValid: mockIsCacheValid,
};

jest.mock('../../state/learningPathsStore', () => ({
  useLearningPathsStore: Object.assign(
    () => ({
      activePath: mockActivePath,
      setActivePath: mockSetActivePath,
      addStep: mockAddStep,
      getCachedPath: mockGetCachedPath,
      pathsCache: new Map(),
      isCacheValid: mockIsCacheValid,
    }),
    {
      getState: () => mockStore,
    }
  ),
  getCurrentStep: jest.fn((steps: Step[]) => steps.find((s) => !s.completed) || null),
}));

// Mock memory service
const mockGetLearningPath = jest.fn();
const mockGetPathNextStep = jest.fn();
const mockViewStep = jest.fn();

jest.mock('../../services/memory', () => ({
  getLearningPath: (...args: unknown[]) => mockGetLearningPath(...args),
  getPathNextStep: (...args: unknown[]) => mockGetPathNextStep(...args),
  viewStep: (...args: unknown[]) => mockViewStep(...args),
}));

// Mock analytics
jest.mock('../../services/analytics', () => ({
  useScreenTracking: jest.fn(),
  useAITracking: () => ({
    startRequest: jest.fn(() => 'request-id'),
    completeRequest: jest.fn(),
    trackError: jest.fn(),
  }),
}));

// Mock useResponsive hook - default to mobile
let mockIsMobile = true;
jest.mock('../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: mockIsMobile,
    isTablet: !mockIsMobile,
    width: mockIsMobile ? 390 : 1024,
    height: 844,
    responsive: <T,>(small: T, standard: T, large?: T, tablet?: T) => {
      if (!mockIsMobile && tablet !== undefined) return tablet;
      return standard;
    },
    fontScale: 1,
    spacingScale: 1,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  replace: jest.fn(),
} as unknown as NavigationProp;

const createMockRoute = (pathId: string = 'test-path-123'): ScreenRouteProp =>
  ({
    key: 'LearningPath-test',
    name: 'LearningPath',
    params: { pathId },
  }) as unknown as ScreenRouteProp;

describe('LearningPathScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivePath = null;
    mockGetCachedPath.mockReturnValue(null);
    mockIsCacheValid.mockReturnValue(false);
    mockViewStep.mockResolvedValue({ success: true, step: createMockStep() });
    mockIsMobile = true; // Reset to mobile by default
  });

  describe('path status states', () => {
    describe('active path', () => {
      beforeEach(() => {
        const activePath = createMockPath({ status: 'active' });
        mockActivePath = activePath;
        mockGetLearningPath.mockResolvedValue(activePath);
        mockGetCachedPath.mockReturnValue(activePath);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should render active path with Continue button', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue →')).toBeTruthy();
        });
      });

      it('should render path goal and progress', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Learn Python')).toBeTruthy();
          expect(getByText('50%')).toBeTruthy();
        });
      });

      it('should show Continue when no current step', async () => {
        const pathWithAllCompleted = createMockPath({
          status: 'active',
          steps: [createMockStep({ completed: true })],
        });
        mockActivePath = pathWithAllCompleted;
        mockGetLearningPath.mockResolvedValue(pathWithAllCompleted);
        mockGetCachedPath.mockReturnValue(pathWithAllCompleted);

        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue')).toBeTruthy();
        });
      });

      it('should navigate to Step screen when Continue is pressed', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue →')).toBeTruthy();
        });

        fireEvent.press(getByText('Continue →'));

        expect(mockNavigate).toHaveBeenCalledWith('Step', expect.any(Object));
      });
    });

    describe('completed path', () => {
      beforeEach(() => {
        const completedPath = createMockPath({
          status: 'completed',
          progress: 100,
          steps: [
            createMockStep({ completed: true }),
            createMockStep({ id: 'step-2', index: 1, completed: true }),
          ],
          completedAt: Date.now(),
        });
        mockActivePath = completedPath;
        mockGetLearningPath.mockResolvedValue(completedPath);
        mockGetCachedPath.mockReturnValue(completedPath);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should render completion celebration UI', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Congratulations!')).toBeTruthy();
          expect(getByText("You've completed this track!")).toBeTruthy();
        });
      });

      it('should show steps completed badge', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('2 steps completed')).toBeTruthy();
        });
      });

      it('should show Start New Track button', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Start New Track')).toBeTruthy();
        });
      });

      it('should navigate to GoalSelection when Start New Track is pressed', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Start New Track')).toBeTruthy();
        });

        fireEvent.press(getByText('Start New Track'));

        expect(mockNavigate).toHaveBeenCalledWith('GoalSelection', { isCreatingNewPath: true });
      });

      it('should NOT fetch next step for completed path', async () => {
        render(<LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />);

        await waitFor(() => {
          expect(mockGetPathNextStep).not.toHaveBeenCalled();
        });
      });

      it('should still allow viewing completed steps', async () => {
        const { getByText, getAllByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Congratulations!')).toBeTruthy();
        });

        // Steps should still be rendered and clickable
        const stepElements = getAllByText('Introduction to Variables');
        expect(stepElements.length).toBeGreaterThan(0);
      });
    });

    describe('archived path', () => {
      beforeEach(() => {
        const archivedPath = createMockPath({
          status: 'archived',
          archivedAt: Date.now(),
        });
        mockActivePath = archivedPath;
        mockGetLearningPath.mockResolvedValue(archivedPath);
        mockGetCachedPath.mockReturnValue(archivedPath);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should render archived notice', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Path Archived')).toBeTruthy();
          expect(getByText('This path is archived. You can review your progress below.')).toBeTruthy();
        });
      });

      it('should show Back to Home button', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Back to Home')).toBeTruthy();
        });
      });

      it('should navigate back when Back to Home is pressed', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Back to Home')).toBeTruthy();
        });

        fireEvent.press(getByText('Back to Home'));

        expect(mockGoBack).toHaveBeenCalled();
      });

      it('should NOT fetch next step for archived path', async () => {
        render(<LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />);

        await waitFor(() => {
          expect(mockGetPathNextStep).not.toHaveBeenCalled();
        });
      });
    });

    describe('legacy path without status', () => {
      beforeEach(() => {
        const legacyPath = createMockPath();
        delete (legacyPath as Partial<LearningPath>).status;
        mockActivePath = legacyPath;
        mockGetLearningPath.mockResolvedValue(legacyPath);
        mockGetCachedPath.mockReturnValue(legacyPath);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should treat path without status as active', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue →')).toBeTruthy();
        });
      });
    });
  });

  describe('step interaction', () => {
    beforeEach(() => {
      const activePath = createMockPath({ status: 'active' });
      mockActivePath = activePath;
      mockGetLearningPath.mockResolvedValue(activePath);
      mockGetCachedPath.mockReturnValue(activePath);
      mockIsCacheValid.mockReturnValue(true);
    });

    it('should navigate to StepDetail for completed steps', async () => {
      const { getAllByText } = render(
        <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        const stepCards = getAllByText('Introduction to Variables');
        expect(stepCards.length).toBeGreaterThan(0);
      });

      // Get first step card (which is completed)
      const stepCards = getAllByText('Introduction to Variables');
      fireEvent.press(stepCards[0]);

      await waitFor(() => {
        expect(mockViewStep).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('StepDetail', expect.any(Object));
      });
    });
  });

  describe('loading states', () => {
    it('should show loading screen initially', () => {
      mockGetLearningPath.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockPath()), 1000))
      );

      const { getByTestId } = render(
        <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      // LoadingScreen should be rendered (the component may use a testID)
      // Since LoadingScreen doesn't have testID, we check that main content is not rendered
      expect(() => getByTestId('learning-path-content')).toThrow();
    });
  });

  describe('error handling', () => {
    it('should show error alert on load failure', async () => {
      mockGetLearningPath.mockRejectedValue(new Error('Network error'));
      mockGetCachedPath.mockReturnValue(null);

      render(<LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load track. Please try again.'
        );
      });
    });

    it('should handle path not found gracefully', async () => {
      // When path is null, the component should still render without crashing
      mockGetLearningPath.mockResolvedValue(null);
      mockGetCachedPath.mockReturnValue(null);
      mockIsCacheValid.mockReturnValue(false);

      render(<LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />);

      // Should show some form of error state
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('next step generation', () => {
    it('should NOT fetch next step when current step exists', async () => {
      const pathWithCurrentStep = createMockPath({
        status: 'active',
        steps: [createMockStep({ completed: false })],
      });
      mockActivePath = pathWithCurrentStep;
      mockGetLearningPath.mockResolvedValue(pathWithCurrentStep);
      mockGetCachedPath.mockReturnValue(pathWithCurrentStep);
      mockIsCacheValid.mockReturnValue(true);

      render(<LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />);

      await waitFor(() => {
        expect(mockGetPathNextStep).not.toHaveBeenCalled();
      });
    });

    it('should navigate to GeneratingStep when Continue is pressed', async () => {
      // Path with all steps completed - should show "Continue" button
      const pathWithAllCompleted = createMockPath({
        status: 'active',
        steps: [createMockStep({ completed: true })],
      });
      mockActivePath = pathWithAllCompleted;
      mockGetLearningPath.mockResolvedValue(pathWithAllCompleted);
      mockGetCachedPath.mockReturnValue(pathWithAllCompleted);
      mockIsCacheValid.mockReturnValue(true);

      const { getByText } = render(
        <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
      );

      await waitFor(() => {
        expect(getByText('Continue')).toBeTruthy();
      });

      fireEvent.press(getByText('Continue'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('GeneratingStep', {
          pathId: 'test-path-123',
          topic: pathWithAllCompleted.goal,
        });
      });
    });
  });

  describe('responsive outline behavior', () => {
    const createPathWithOutline = () =>
      createMockPath({
        status: 'active',
        outline: createMockOutline(),
        outlinePosition: {
          moduleIndex: 1,
          topicIndex: 1,
          moduleId: 'module-2',
          topicId: 'topic-2-2',
        },
      });

    describe('mobile view', () => {
      beforeEach(() => {
        mockIsMobile = true;
        const pathWithOutline = createPathWithOutline();
        mockActivePath = pathWithOutline;
        mockGetLearningPath.mockResolvedValue(pathWithOutline);
        mockGetCachedPath.mockReturnValue(pathWithOutline);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should show CourseProgressBar on mobile when outline exists', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          // Progress bar shows current topic or topic count
          expect(getByText('Now:')).toBeTruthy();
        });
      });

      it('should open drawer when CourseProgressBar is pressed on mobile', async () => {
        const { getByText, getAllByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Now:')).toBeTruthy();
        });

        // Press the progress bar (via the outline icon) - may be multiple
        const outlineIcons = getAllByText('📋');
        fireEvent.press(outlineIcons[0]);

        // The drawer should open
        await waitFor(() => {
          expect(getByText('Course Outline')).toBeTruthy();
        });
      });
    });

    describe('web/tablet view', () => {
      beforeEach(() => {
        mockIsMobile = false;
        const pathWithOutline = createPathWithOutline();
        mockActivePath = pathWithOutline;
        mockGetLearningPath.mockResolvedValue(pathWithOutline);
        mockGetCachedPath.mockReturnValue(pathWithOutline);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should show sidebar on web when outline exists', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          // Sidebar shows Course Outline header directly (not in drawer)
          expect(getByText('Course Outline')).toBeTruthy();
        });
      });

      it('should show module titles in sidebar on web', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Introduction to Python')).toBeTruthy();
          expect(getByText('Variables and Data Types')).toBeTruthy();
        });
      });

      it('should show progress stats in sidebar on web', async () => {
        const { getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          // Sidebar shows modules and topics counts
          expect(getByText('Modules')).toBeTruthy();
          expect(getByText('Topics')).toBeTruthy();
        });
      });
    });

    describe('path without outline', () => {
      beforeEach(() => {
        const pathWithoutOutline = createMockPath({ status: 'active' });
        mockActivePath = pathWithoutOutline;
        mockGetLearningPath.mockResolvedValue(pathWithoutOutline);
        mockGetCachedPath.mockReturnValue(pathWithoutOutline);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should NOT show Outline button when path has no outline (mobile)', async () => {
        mockIsMobile = true;
        const { queryByText, getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue →')).toBeTruthy();
        });

        expect(queryByText('Outline')).toBeNull();
      });

      it('should NOT show sidebar when path has no outline (web)', async () => {
        mockIsMobile = false;
        const { queryByText, getByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Continue →')).toBeTruthy();
        });

        // Course Outline header should not be visible without outline
        expect(queryByText('Course Outline')).toBeNull();
      });
    });

    describe('outline topic navigation', () => {
      beforeEach(() => {
        mockIsMobile = true;
        const pathWithOutline = createPathWithOutline();
        mockActivePath = pathWithOutline;
        mockGetLearningPath.mockResolvedValue(pathWithOutline);
        mockGetCachedPath.mockReturnValue(pathWithOutline);
        mockIsCacheValid.mockReturnValue(true);
      });

      it('should navigate to step when topic with stepId is pressed', async () => {
        const { getByText, getAllByText } = render(
          <LearningPathScreen navigation={mockNavigation} route={createMockRoute()} />
        );

        await waitFor(() => {
          expect(getByText('Outline')).toBeTruthy();
        });

        // Open the drawer
        fireEvent.press(getByText('Outline'));

        await waitFor(() => {
          expect(getByText('Course Outline')).toBeTruthy();
        });

        // The current module should be expanded showing its topics
        // Press a topic that has a stepId - "Variables" may appear in multiple places
        const variablesElements = getAllByText('Variables');
        fireEvent.press(variablesElements[0]);

        // Should navigate to the step
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalled();
        });
      });
    });
  });
});
