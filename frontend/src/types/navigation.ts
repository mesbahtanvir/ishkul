import { Step } from './app';

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  GoalSelection: { isCreatingNewPath?: boolean };
  LevelSelection: { goal: string; isCreatingNewPath?: boolean };
  Main: undefined;
  Learn: undefined;
  Home: undefined;
  // New: Main learning path timeline view
  LearningPath: { pathId: string };
  // Legacy: Old session screen (redirect to LearningPath)
  LearningSession: { pathId: string };
  NextStep: undefined; // Legacy - keep for backward compatibility
  // Generating step screen - engaging loader while AI generates content
  GeneratingStep: { pathId: string; topic?: string };
  // Generic step screen - uses tool registry to render any step type
  Step: { step: Step; pathId: string };
  // Legacy step screens - kept for backward compatibility
  Lesson: { step: Step; pathId: string };
  Quiz: { step: Step; pathId: string };
  Practice: { step: Step; pathId: string };
  // New: Read-only step detail view for reviewing past steps
  StepDetail: { step: Step; pathId: string };
  Progress: undefined;
  Settings: undefined;
  SettingsTab: undefined;
  // Subscription management
  Subscription: undefined;
  SubscriptionSuccess: { session_id?: string } | undefined;
  ManageSubscription: undefined;
};
