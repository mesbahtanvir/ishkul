import { Step, Lesson, Block, LessonPosition } from './app';

export type RootStackParamList = {
  Login: undefined;
  GoalSelection: { isCreatingNewCourse?: boolean };
  LevelSelection: { goal: string; isCreatingNewCourse?: boolean };
  Main: undefined;
  Learn: undefined;
  Home: undefined;
  // Course generation screen - shows progress while outline is being generated
  CourseGenerating: { courseId: string };
  // Main course timeline view
  Course: { courseId: string };
  // Generating step screen - engaging loader while AI generates content
  GeneratingStep: { courseId: string; topic?: string };
  // Generic step screen - uses tool registry to render any step type
  Step: { step: Step; courseId: string };
  // Step detail view for reviewing past steps
  StepDetail: { step: Step; courseId: string };
  Progress: undefined;
  Settings: undefined;
  SettingsTab: undefined;
  // Subscription management
  Subscription: undefined;
  SubscriptionSuccess: { session_id?: string } | undefined;
  ManageSubscription: undefined;
  // ============================================
  // Lesson Screens (New 3-Stage Generation)
  // ============================================
  // Lesson content view - shows blocks and handles progression
  Lesson: {
    courseId: string;
    lessonId: string;
    sectionId: string;
    // Optional: pre-populated lesson data to avoid re-fetch
    lesson?: Lesson;
  };
  // Generating lesson blocks screen - shows progress while blocks are generated
  LessonGenerating: {
    courseId: string;
    lessonId: string;
    sectionId: string;
    lessonTitle: string;
  };
  // Block content view - for full-screen block display (optional)
  BlockView: {
    courseId: string;
    lessonId: string;
    block: Block;
    blockIndex: number;
    totalBlocks: number;
  };
  // Course outline view - shows sections and lessons
  CourseOutline: {
    courseId: string;
  };
  // Lesson complete summary screen
  LessonComplete: {
    courseId: string;
    lessonId: string;
    sectionId: string;
    score: number;
    timeSpent: number;
    nextLesson?: LessonPosition;
  };
};
