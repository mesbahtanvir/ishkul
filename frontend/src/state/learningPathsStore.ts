// Legacy re-exports for backward compatibility
// All functionality has been moved to coursesStore.ts
export {
  useCoursesStore,
  useCoursesStore as useLearningPathsStore,
  getCurrentStep,
  getCompletedSteps,
  getEmojiForGoal,
  generateCourseId,
  generateCourseId as generatePathId,
} from './coursesStore';
