import { useLearningStore } from '../learningStore';
import { NextStep } from '../../types/app';

describe('learningStore', () => {
  beforeEach(() => {
    // Reset store state
    useLearningStore.setState({
      currentStep: null,
      loading: false,
    });
  });

  describe('initial state', () => {
    it('should have null currentStep', () => {
      const state = useLearningStore.getState();
      expect(state.currentStep).toBeNull();
    });

    it('should have loading as false', () => {
      const state = useLearningStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe('setCurrentStep', () => {
    it('should set currentStep with lesson', () => {
      const mockStep: NextStep = {
        type: 'lesson',
        topic: 'Python Basics',
        title: 'Introduction to Python',
        content: 'Python is a programming language...',
      };

      useLearningStore.getState().setCurrentStep(mockStep);

      expect(useLearningStore.getState().currentStep).toEqual(mockStep);
    });

    it('should set currentStep with quiz', () => {
      const mockStep: NextStep = {
        type: 'quiz',
        topic: 'Python Quiz',
        question: 'What is the output of print(2+2)?',
        expectedAnswer: '4',
      };

      useLearningStore.getState().setCurrentStep(mockStep);

      expect(useLearningStore.getState().currentStep).toEqual(mockStep);
    });

    it('should set currentStep with practice', () => {
      const mockStep: NextStep = {
        type: 'practice',
        topic: 'Python Practice',
        task: 'Write a function that adds two numbers',
      };

      useLearningStore.getState().setCurrentStep(mockStep);

      expect(useLearningStore.getState().currentStep).toEqual(mockStep);
    });

    it('should set currentStep to null', () => {
      const mockStep: NextStep = {
        type: 'lesson',
        topic: 'Test',
      };

      useLearningStore.getState().setCurrentStep(mockStep);
      useLearningStore.getState().setCurrentStep(null);

      expect(useLearningStore.getState().currentStep).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      useLearningStore.getState().setLoading(true);

      expect(useLearningStore.getState().loading).toBe(true);
    });

    it('should set loading to false', () => {
      useLearningStore.getState().setLoading(true);
      useLearningStore.getState().setLoading(false);

      expect(useLearningStore.getState().loading).toBe(false);
    });
  });

  describe('clearCurrentStep', () => {
    it('should clear currentStep', () => {
      const mockStep: NextStep = {
        type: 'lesson',
        topic: 'Test Topic',
        title: 'Test Title',
      };

      useLearningStore.getState().setCurrentStep(mockStep);
      useLearningStore.getState().clearCurrentStep();

      expect(useLearningStore.getState().currentStep).toBeNull();
    });

    it('should not affect loading state', () => {
      useLearningStore.getState().setLoading(true);
      useLearningStore.getState().clearCurrentStep();

      expect(useLearningStore.getState().loading).toBe(true);
    });
  });

  describe('state persistence', () => {
    it('should maintain state across multiple operations', () => {
      const mockStep: NextStep = {
        type: 'quiz',
        topic: 'JavaScript',
        question: 'What is let?',
      };

      useLearningStore.getState().setCurrentStep(mockStep);
      useLearningStore.getState().setLoading(true);

      const state = useLearningStore.getState();
      expect(state.currentStep).toEqual(mockStep);
      expect(state.loading).toBe(true);
    });
  });

  describe('store structure', () => {
    it('should have all required methods', () => {
      const state = useLearningStore.getState();

      expect(typeof state.setCurrentStep).toBe('function');
      expect(typeof state.setLoading).toBe('function');
      expect(typeof state.clearCurrentStep).toBe('function');
    });
  });

  describe('NextStep types', () => {
    it('should handle minimal NextStep', () => {
      const minimalStep: NextStep = {
        type: 'lesson',
        topic: 'Topic',
      };

      useLearningStore.getState().setCurrentStep(minimalStep);

      expect(useLearningStore.getState().currentStep?.type).toBe('lesson');
      expect(useLearningStore.getState().currentStep?.topic).toBe('Topic');
    });

    it('should handle NextStep with all optional fields', () => {
      const fullStep: NextStep = {
        type: 'quiz',
        topic: 'Full Topic',
        title: 'Full Title',
        content: 'Full Content',
        question: 'Full Question',
        expectedAnswer: 'Full Answer',
        task: 'Full Task',
      };

      useLearningStore.getState().setCurrentStep(fullStep);

      const currentStep = useLearningStore.getState().currentStep;
      expect(currentStep?.title).toBe('Full Title');
      expect(currentStep?.content).toBe('Full Content');
      expect(currentStep?.question).toBe('Full Question');
      expect(currentStep?.expectedAnswer).toBe('Full Answer');
      expect(currentStep?.task).toBe('Full Task');
    });
  });
});
