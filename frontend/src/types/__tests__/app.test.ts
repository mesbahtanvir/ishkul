import { CourseStatuses, CourseStatus, Course, Step } from '../app';

describe('CourseStatus', () => {
  describe('CourseStatuses constants', () => {
    it('should have ACTIVE status', () => {
      expect(CourseStatuses.ACTIVE).toBe('active');
    });

    it('should have COMPLETED status', () => {
      expect(CourseStatuses.COMPLETED).toBe('completed');
    });

    it('should have ARCHIVED status', () => {
      expect(CourseStatuses.ARCHIVED).toBe('archived');
    });

    it('should have DELETED status', () => {
      expect(CourseStatuses.DELETED).toBe('deleted');
    });

    it('should have all four status types', () => {
      const statuses = Object.values(CourseStatuses);
      expect(statuses).toHaveLength(4);
      expect(statuses).toContain('active');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('archived');
      expect(statuses).toContain('deleted');
    });
  });

  describe('CourseStatus type', () => {
    it('should accept valid status values', () => {
      const active: CourseStatus = 'active';
      const completed: CourseStatus = 'completed';
      const archived: CourseStatus = 'archived';
      const deleted: CourseStatus = 'deleted';

      expect(active).toBe('active');
      expect(completed).toBe('completed');
      expect(archived).toBe('archived');
      expect(deleted).toBe('deleted');
    });
  });

  describe('Course interface', () => {
    const createValidPath = (overrides: Partial<Course> = {}): Course => ({
      id: 'test-id',
      userId: 'test-user-id',
      title: 'Learn Python',
      goal: 'Learn Python',
      emoji: '🐍',
      status: 'active',
      outlineStatus: 'ready',
      progress: 50,
      lessonsCompleted: 5,
      totalLessons: 10,
      steps: [],
      memory: { topics: {} },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      ...overrides,
    });

    it('should allow path without status (optional field)', () => {
      const path = createValidPath();
      expect(path.status).toBeUndefined();
    });

    it('should allow path with active status', () => {
      const path = createValidPath({ status: 'active' });
      expect(path.status).toBe('active');
    });

    it('should allow path with completed status', () => {
      const path = createValidPath({ status: 'completed', completedAt: Date.now() });
      expect(path.status).toBe('completed');
      expect(path.completedAt).toBeDefined();
    });

    it('should allow path with archived status', () => {
      const path = createValidPath({ status: 'archived', archivedAt: Date.now() });
      expect(path.status).toBe('archived');
      expect(path.archivedAt).toBeDefined();
    });

    it('should have optional completedAt field', () => {
      const path = createValidPath();
      expect(path.completedAt).toBeUndefined();
    });

    it('should have optional archivedAt field', () => {
      const path = createValidPath();
      expect(path.archivedAt).toBeUndefined();
    });
  });

  describe('Step interface', () => {
    const createValidStep = (overrides: Partial<Step> = {}): Step => ({
      id: 'step-1',
      index: 0,
      type: 'lesson',
      topic: 'Variables',
      title: 'Default Title',
      completed: false,
      completedAt: 0,
      createdAt: Date.now(),
      ...overrides,
    });

    it('should create valid lesson step', () => {
      const step = createValidStep({
        type: 'lesson',
        title: 'Intro to Variables',
        content: 'Learn about variables',
      });

      expect(step.type).toBe('lesson');
      expect(step.title).toBe('Intro to Variables');
      expect(step.content).toBe('Learn about variables');
    });

    it('should create valid quiz step', () => {
      const step = createValidStep({
        type: 'quiz',
        question: 'What is a variable?',
        options: ['A', 'B', 'C', 'D'],
        expectedAnswer: 'A',
      });

      expect(step.type).toBe('quiz');
      expect(step.question).toBe('What is a variable?');
      expect(step.options).toEqual(['A', 'B', 'C', 'D']);
      expect(step.expectedAnswer).toBe('A');
    });

    it('should create valid practice step', () => {
      const step = createValidStep({
        type: 'practice',
        task: 'Write a function',
        hints: ['Hint 1', 'Hint 2'],
      });

      expect(step.type).toBe('practice');
      expect(step.task).toBe('Write a function');
      expect(step.hints).toEqual(['Hint 1', 'Hint 2']);
    });

    it('should track completion status', () => {
      const incompleteStep = createValidStep({ completed: false });
      const completeStep = createValidStep({ completed: true, completedAt: Date.now() });

      expect(incompleteStep.completed).toBe(false);
      expect(completeStep.completed).toBe(true);
      expect(completeStep.completedAt).toBeGreaterThan(0);
    });

    it('should track user answer and score for quiz', () => {
      const step = createValidStep({
        type: 'quiz',
        userAnswer: 'A',
        score: 100,
      });

      expect(step.userAnswer).toBe('A');
      expect(step.score).toBe(100);
    });
  });
});
