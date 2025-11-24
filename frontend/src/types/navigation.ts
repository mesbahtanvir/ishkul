import { NextStep } from './app';

export type RootStackParamList = {
  Login: undefined;
  GoalSelection: undefined;
  LevelSelection: { goal: string };
  Main: undefined;
  Learn: undefined;
  NextStep: undefined;
  Lesson: { step: NextStep };
  Quiz: { step: NextStep };
  Practice: { step: NextStep };
  Progress: undefined;
  Settings: undefined;
};
