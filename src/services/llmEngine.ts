import { LLMRequest, LLMResponse, NextStep, StepType } from '../types/app';

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

// Placeholder LLM engine
// This simulates an AI that returns the next learning step
export const getNextStep = async (request: LLMRequest): Promise<LLMResponse> => {
  // In production, this would call OpenAI/Anthropic API
  // For now, return mock data based on the goal

  console.log('LLM Request:', request);

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

// Future: Real LLM integration
export const getNextStepFromLLM = async (request: LLMRequest): Promise<LLMResponse> => {
  // Example structure for future OpenAI/Anthropic integration

  const systemPrompt = `You are an adaptive learning tutor. Based on the user's goal, level, learning history, and current understanding, provide the next optimal learning step.

Return JSON in this format:
{
  "nextStep": {
    "type": "lesson" | "quiz" | "practice",
    "topic": "string",
    "title": "string",
    "content": "string (for lessons)",
    "question": "string (for quizzes)",
    "expectedAnswer": "string (for quizzes)",
    "task": "string (for practice)"
  }
}`;

  const userPrompt = `Goal: ${request.goal}
Level: ${request.level}
History: ${JSON.stringify(request.history, null, 2)}
Memory: ${JSON.stringify(request.memory, null, 2)}

Provide the next learning step.`;

  // TODO: Uncomment and configure when ready to use real LLM
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
  */

  // For now, use mock implementation
  return getNextStep(request);
};
