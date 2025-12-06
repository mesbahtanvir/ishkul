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
};
