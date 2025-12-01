import { getNextStep } from '../llmEngine';
import { LLMRequest, LLMResponse } from '../../types/app';

// Mock the authApi to provide a valid token for tests
jest.mock('../api', () => ({
  authApi: {
    getAccessToken: jest.fn().mockReturnValue('test-token'),
  },
}));

// Mock the firebase config
jest.mock('../../config/firebase.config', () => ({
  apiConfig: {
    baseURL: 'http://localhost:8080/api',
  },
}));

// Mock next step responses for different goals
const mockPythonStep = {
  type: 'lesson',
  topic: 'Data Types',
  title: 'Python Basics: Data Types',
  content: 'Python has several built-in data types...',
};

const mockCookingStep = {
  type: 'lesson',
  topic: 'Kitchen Basics',
  title: 'Essential Kitchen Tools',
  content: 'Every beginner needs these essential tools...',
};

const mockDefaultStep = {
  type: 'lesson',
  topic: 'Getting Started',
  title: 'Welcome to Your Learning Journey',
  content: 'Great choice! Learning something new is an exciting adventure.',
};

describe('llmEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    beforeEach(() => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ nextStep: mockDefaultStep }),
      });
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
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ nextStep: mockPythonStep }),
      });
      const request = createRequest('Learn Python');

      const response = await getNextStep(request);

      expect(response.nextStep.topic).toBe('Data Types');
    });

    it('should return cooking lessons for cooking goal', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ nextStep: mockCookingStep }),
      });
      const request = createRequest('Learn to cook');

      const response = await getNextStep(request);

      expect(response.nextStep.topic).toBe('Kitchen Basics');
    });

    it('should return default lessons for unknown goal', async () => {
      const request = createRequest('Random topic');

      const response = await getNextStep(request);

      expect(response.nextStep).toBeDefined();
    });

    it('should throw error when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const request = createRequest('Learn Python');

      await expect(getNextStep(request)).rejects.toThrow('Network error');
    });

    it('should throw error when API returns error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        text: async () => 'Server error message',
      });
      const request = createRequest('Learn Python');

      await expect(getNextStep(request)).rejects.toThrow('Server error message');
    });

    it('should throw error when user not authenticated', async () => {
      const { authApi } = require('../api');
      authApi.getAccessToken.mockReturnValue(null);
      const request = createRequest('Learn Python');

      await expect(getNextStep(request)).rejects.toThrow('User not authenticated');
    });

    it('should return lesson type', async () => {
      const request = createRequest('Learn Python', 0);

      const response = await getNextStep(request);

      expect(['lesson', 'quiz', 'practice']).toContain(response.nextStep.type);
    });

    it('should include title for lesson type', async () => {
      const request = createRequest('Learn Python', 0);

      const response = await getNextStep(request);

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

    it('should call API with correct parameters', async () => {
      const request = createRequest('Learn Python', 2);

      await getNextStep(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/llm/next-step',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('API response handling', () => {
    it('should return valid lesson structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ nextStep: mockPythonStep }),
      });

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
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ nextStep: mockDefaultStep }),
      });

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
