import { Step } from './app';

export type RootStackParamList = {
  Landing: undefined;
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
  // Legacy routes for backward compatibility
  LearningPath: { pathId: string };
  LearningSession: { pathId: string };
  NextStep: undefined; // Legacy - keep for backward compatibility
  // Generating step screen - engaging loader while AI generates content
  GeneratingStep: { courseId: string; topic?: string };
  // Generic step screen - uses tool registry to render any step type
  Step: { step: Step; courseId: string };
  // Legacy step screens - kept for backward compatibility
  Lesson: { step: Step; pathId: string };
  Quiz: { step: Step; pathId: string };
  Practice: { step: Step; pathId: string };
  // New: Read-only step detail view for reviewing past steps
  StepDetail: { step: Step; courseId: string };
  Progress: undefined;
  Settings: undefined;
  SettingsTab: undefined;
  // Subscription management
  Subscription: undefined;
  SubscriptionSuccess: { session_id?: string } | undefined;
  ManageSubscription: undefined;
};
