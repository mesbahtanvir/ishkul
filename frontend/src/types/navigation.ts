import { Lesson } from './app';

export type RootStackParamList = {
  Login: undefined;
  GoalSelection: { isCreatingNewCourse?: boolean };
  Main: undefined;
  Learn: undefined;
  Home: undefined;
  // Course generation screen - shows progress while outline is being generated
  CourseGenerating: { courseId: string };
  Progress: undefined;
  Settings: undefined;
  SettingsTab: undefined;
  // Subscription management
  Subscription: undefined;
  SubscriptionSuccess: { session_id?: string } | undefined;
  ManageSubscription: undefined;
  // ============================================
  // Unified Course View (SPA-like experience)
  // ============================================
  // Single screen that shows both course overview and lessons
  // - Overview mode: shows sections and lessons (like CourseOutline)
  // - Lesson mode: shows lesson blocks (like LessonScreen)
  // No page transitions - content swaps within the same screen
  CourseView: {
    courseId: string;
    // Optional: start directly on a specific lesson
    lessonId?: string;
    sectionId?: string;
  };
  // ============================================
  // Legacy screens (kept for backward compatibility)
  // ============================================
  // Course outline view - redirects to CourseView
  CourseOutline: {
    courseId: string;
  };
  // Lesson content view - redirects to CourseView with lessonId
  Lesson: {
    courseId: string;
    lessonId: string;
    sectionId: string;
    lesson?: Lesson;
  };
};
