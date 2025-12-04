import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LearningPathScreen } from '../LearningPathScreen';
import type { RootStackParamList } from '../../types/navigation';
import type { LearningPath, Step } from '../../types/app';

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

      it('should show Get Next Step when no current step', async () => {
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
          expect(getByText('Get Next Step')).toBeTruthy();
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

    it('should navigate to GeneratingStep when Get Next Step is pressed', async () => {
      // Path with all steps completed - should show "Get Next Step" button
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
        expect(getByText('Get Next Step')).toBeTruthy();
      });

      fireEvent.press(getByText('Get Next Step'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('GeneratingStep', {
          pathId: 'test-path-123',
          topic: pathWithAllCompleted.goal,
        });
      });
    });
  });
});
