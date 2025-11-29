import { LLMRequest, LLMResponse, NextStep } from '../types/app';
import { apiConfig } from '../config/firebase.config';
import { authApi } from './api';

// Mock lessons database
const mockLessons: { [key: string]: NextStep[] } = {
  python: [
    {
      type: 'lesson',
      topic: 'Data Types',
      title: 'Python Basics: Data Types',
      content: `Python has several built-in data types:

• Strings (str): Text data, e.g., "Hello"
• Integers (int): Whole numbers, e.g., 42
• Floats (float): Decimal numbers, e.g., 3.14
• Booleans (bool): True or False
• Lists (list): Ordered collections, e.g., [1, 2, 3]

Example:
name = "Alice"  # String
age = 25        # Integer
height = 5.6    # Float
is_student = True  # Boolean`,
    },
    {
      type: 'quiz',
      topic: 'Print Statement',
      title: 'Quiz: Hello World',
      question: 'Write a Python statement to print "Hello World" to the console.',
      expectedAnswer: 'print("Hello World")',
    },
    {
      type: 'lesson',
      topic: 'Variables',
      title: 'Python Variables',
      content: `Variables store data values. In Python, you don't need to declare types explicitly.

Creating variables:
x = 5
name = "John"
is_active = True

Variable naming rules:
• Must start with a letter or underscore
• Can contain letters, numbers, and underscores
• Case-sensitive (age and Age are different)`,
    },
    {
      type: 'quiz',
      topic: 'Variables',
      title: 'Quiz: Create a Variable',
      question: 'Create a variable called "message" that stores the text "Learning Python".',
      expectedAnswer: 'message = "Learning Python"',
    },
    {
      type: 'practice',
      topic: 'Calculator',
      title: 'Practice: Simple Calculator',
      task: 'Create two variables (a = 10, b = 5) and print their sum, difference, product, and quotient.',
    },
  ],
  cooking: [
    {
      type: 'lesson',
      topic: 'Kitchen Basics',
      title: 'Essential Kitchen Tools',
      content: `Every beginner needs these essential tools:

• Chef's knife: For chopping and slicing
• Cutting board: Protects counters and knives
• Mixing bowls: For preparation
• Measuring cups/spoons: For accuracy
• Pots and pans: For cooking

Start with quality basics before expanding your collection.`,
    },
    {
      type: 'quiz',
      topic: 'Knife Safety',
      title: 'Quiz: Safe Cutting',
      question: 'What is the safest way to hold a knife while cutting?',
      expectedAnswer: 'Grip the handle firmly with your dominant hand and use a claw grip with your other hand to hold the food.',
    },
  ],
  default: [
    {
      type: 'lesson',
      topic: 'Getting Started',
      title: 'Welcome to Your Learning Journey',
      content: `Great choice! Learning something new is an exciting adventure.

Here's how this works:
• We'll break down your goal into small, manageable steps
• You'll learn through lessons, quizzes, and practice
• We adapt to your pace and understanding

Let's begin with the fundamentals!`,
    },
    {
      type: 'quiz',
      topic: 'Motivation',
      title: 'Quick Check',
      question: 'Why do you want to learn this skill? (Type your answer)',
      expectedAnswer: 'Any thoughtful response',
    },
  ],
};

// Get the next learning step using OpenAI backend
export const getNextStep = async (request: LLMRequest): Promise<LLMResponse> => {
  try {
    // Get the current user's access token for authentication
    const accessToken = authApi.getAccessToken();
    if (!accessToken) {
      throw new Error('User not authenticated');
    }

    // Call the backend API
    const response = await fetch(`${apiConfig.baseURL}/llm/next-step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        goal: request.goal,
        level: request.level,
        history: request.history.map((h) => h.topic),
        memory: JSON.stringify(request.memory),
        recentHistory: request.history
          .slice(-3)
          .map((h) => h.topic)
          .join(', '),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', errorText);
      throw new Error(`Failed to generate next step: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      nextStep: data.nextStep as NextStep,
    };
  } catch (error) {
    console.error('Error calling OpenAI backend:', error);

    // Fallback to mock data if OpenAI fails
    console.log('Falling back to mock data...');
    return getNextStepMock(request);
  }
};

// Fallback mock implementation (kept for development/offline use)
const getNextStepMock = async (request: LLMRequest): Promise<LLMResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Determine which lesson set to use
  const goalLower = request.goal.toLowerCase();
  let lessonSet = mockLessons.default;

  if (goalLower.includes('python') || goalLower.includes('programming')) {
    lessonSet = mockLessons.python;
  } else if (goalLower.includes('cook') || goalLower.includes('chef')) {
    lessonSet = mockLessons.cooking;
  }

  // Get the next step based on history length
  const stepIndex = request.history.length % lessonSet.length;
  const nextStep = lessonSet[stepIndex];

  return {
    nextStep,
  };
};
