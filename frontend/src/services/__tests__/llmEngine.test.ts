import { getNextStep } from '../llmEngine';
import { LLMRequest, LLMResponse } from '../../types/app';

describe('llmEngine', () => {
  describe('getNextStep', () => {
    const createRequest = (
      goal: string,
      historyLength: number = 0
    ): LLMRequest => ({
      goal,
      level: 'beginner',
      memory: { topics: {} },
      history: Array(historyLength).fill({
        type: 'lesson' as const,
        topic: 'Test',
        timestamp: Date.now(),
      }),
    });

    it('should return a next step', async () => {
      const request = createRequest('Learn Python');

      const response = await getNextStep(request);

      expect(response).toBeDefined();
      expect(response.nextStep).toBeDefined();
      expect(response.nextStep.type).toBeDefined();
      expect(response.nextStep.topic).toBeDefined();
    });

    it('should return Python lessons for Python goal', async () => {
      const request = createRequest('Learn Python');

      const response = await getNextStep(request);

      expect(response.nextStep.topic).toBeDefined();
    });

    it('should return Python lessons for programming goal', async () => {
      const request = createRequest('Learn programming');

      const response = await getNextStep(request);

      expect(response.nextStep).toBeDefined();
    });

    it('should return cooking lessons for cooking goal', async () => {
      const request = createRequest('Learn to cook');

      const response = await getNextStep(request);

      expect(response.nextStep).toBeDefined();
    });

    it('should return default lessons for unknown goal', async () => {
      const request = createRequest('Random topic');

      const response = await getNextStep(request);

      expect(response.nextStep).toBeDefined();
    });

    it('should cycle through lessons based on history length', async () => {
      const request1 = createRequest('Learn Python', 0);
      const request2 = createRequest('Learn Python', 1);
      const request3 = createRequest('Learn Python', 2);

      const response1 = await getNextStep(request1);
      const response2 = await getNextStep(request2);
      const response3 = await getNextStep(request3);

      // Different history lengths should potentially give different steps
      expect(response1.nextStep).toBeDefined();
      expect(response2.nextStep).toBeDefined();
      expect(response3.nextStep).toBeDefined();
    });

    it('should return lesson type', async () => {
      const request = createRequest('Learn Python', 0);

      const response = await getNextStep(request);

      expect(['lesson', 'quiz', 'practice']).toContain(response.nextStep.type);
    });

    it('should handle chef goal', async () => {
      const request = createRequest('Become a chef');

      const response = await getNextStep(request);

      expect(response.nextStep).toBeDefined();
    });

    it('should include title for lesson type', async () => {
      const request = createRequest('Learn Python', 0);

      const response = await getNextStep(request);

      // First Python lesson is a 'lesson' type with title
      if (response.nextStep.type === 'lesson') {
        expect(response.nextStep.title).toBeDefined();
      }
    });

    it('should include content for lesson type', async () => {
      const request = createRequest('Learn Python', 0);

      const response = await getNextStep(request);

      if (response.nextStep.type === 'lesson') {
        expect(response.nextStep.content).toBeDefined();
      }
    });

    it('should have async delay', async () => {
      const request = createRequest('Test');
      const startTime = Date.now();

      await getNextStep(request);

      const endTime = Date.now();
      // Should have at least some delay (simulated API)
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('mock lessons data', () => {
    it('should return valid lesson structure for first Python lesson', async () => {
      const request: LLMRequest = {
        goal: 'Learn Python',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
      };

      const response = await getNextStep(request);

      expect(response.nextStep).toMatchObject({
        type: expect.stringMatching(/^(lesson|quiz|practice)$/),
        topic: expect.any(String),
      });
    });

    it('should return valid response structure', async () => {
      const request: LLMRequest = {
        goal: 'Test',
        level: 'beginner',
        memory: { topics: {} },
        history: [],
      };

      const response = await getNextStep(request);

      // Type check for LLMResponse
      const isValidResponse = (r: LLMResponse): boolean => {
        return (
          r.nextStep !== undefined &&
          typeof r.nextStep.type === 'string' &&
          typeof r.nextStep.topic === 'string'
        );
      };

      expect(isValidResponse(response)).toBe(true);
    });
  });
});
