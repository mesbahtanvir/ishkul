import { Step } from './app';

export type RootStackParamList = {
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
  // Step screens - now accept Step instead of NextStep
  Lesson: { step: Step; pathId: string };
  Quiz: { step: Step; pathId: string };
  Practice: { step: Step; pathId: string };
  // New: Read-only step detail view for reviewing past steps
  StepDetail: { step: Step; pathId: string };
  Progress: undefined;
  Settings: undefined;
};
