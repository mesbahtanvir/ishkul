import { NextStep, LearningPath } from './app';

export type RootStackParamList = {
  Login: undefined;
  GoalSelection: { isCreatingNewPath?: boolean };
  LevelSelection: { goal: string; isCreatingNewPath?: boolean };
  Main: undefined;
  Learn: undefined;
  Home: undefined;
  LearningSession: { pathId: string };
  NextStep: undefined; // Legacy - keep for backward compatibility
  Lesson: { step: NextStep; pathId: string };
  Quiz: { step: NextStep; pathId: string };
  Practice: { step: NextStep; pathId: string };
  Progress: undefined;
  Settings: undefined;
};
