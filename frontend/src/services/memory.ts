/**
 * Memory Service
 *
 * This module provides functions for managing user learning data.
 * All data operations go through the backend API - no direct Firebase access.
 * The backend determines the user from the auth token.
 */

import { userApi, coursesApi } from './api';
import {
  UserDocument,
  HistoryEntry,
  NextStep,
  Course,
  Step,
  StepCompleteRequest,
} from '../types/app';

/**
 * Get user document (profile + learning data)
 */
export const getUserDocument = async (): Promise<UserDocument | null> => {
  return userApi.getUserDocument();
};

/**
 * Create or initialize user document with goal
 * Optionally includes the first course
 * Level is no longer required - AI adapts based on user context
 */
export const createUserDocument = async (
  goal: string,
  firstCourse?: Partial<Course>
): Promise<void> => {
  await userApi.createUserDocument(goal);

  // If a first course is provided, create it
  if (firstCourse) {
    await coursesApi.createCourse(firstCourse);
  }
};

/**
 * Add a new course
 */
export const addCourse = async (
  course: Partial<Course>
): Promise<Course> => {
  return coursesApi.createCourse(course);
};

/**
 * Get all courses
 */
export const getCourses = async (): Promise<Course[]> => {
  return coursesApi.getCourses();
};

/**
 * Get a specific course
 */
export const getCourse = async (
  courseId: string
): Promise<Course | null> => {
  return coursesApi.getCourse(courseId);
};

/**
 * Update a course
 */
export const updateCourse = async (
  courseId: string,
  updates: Partial<Course>
): Promise<void> => {
  await coursesApi.updateCourse(courseId, updates);
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId: string): Promise<void> => {
  await coursesApi.deleteCourse(courseId);
};

/**
 * Archive a course
 */
export const archiveCourse = async (courseId: string): Promise<Course> => {
  return coursesApi.archiveCourse(courseId);
};

/**
 * Restore an archived course
 */
export const restoreCourse = async (courseId: string): Promise<Course> => {
  return coursesApi.restoreCourse(courseId);
};

/**
 * Get next step - returns existing incomplete step or generates new one
 */
export const getCourseNextStep = async (
  courseId: string
): Promise<{ step: Step; stepIndex: number }> => {
  return coursesApi.getNextStep(courseId);
};

/**
 * Complete current step (first incomplete step)
 */
export const completeCurrentStep = async (
  courseId: string,
  data?: StepCompleteRequest
): Promise<{ course: Course; completedStep: Step; nextStepNeeded: boolean }> => {
  return coursesApi.completeCurrentStep(courseId, data);
};

/**
 * Complete a specific step by ID
 */
export const completeStep = async (
  courseId: string,
  stepId: string,
  data?: StepCompleteRequest
): Promise<{ course: Course; completedStep: Step; nextStepNeeded: boolean }> => {
  return coursesApi.completeStep(courseId, stepId, data);
};

/**
 * View a step (records the view and updates lastReviewed)
 */
export const viewStep = async (
  courseId: string,
  stepId: string
): Promise<{ success: boolean; step: Step }> => {
  return coursesApi.viewStep(courseId, stepId);
};

/**
 * Update user's goal
 */
export const updateUserGoal = async (
  goal: string
): Promise<void> => {
  await userApi.updateGoal(goal);
};

/**
 * Add a history entry
 */
export const updateUserHistory = async (
  historyEntry: HistoryEntry
): Promise<void> => {
  await userApi.addHistory({
    type: historyEntry.type,
    topic: historyEntry.topic,
    score: historyEntry.score,
  });
};

/**
 * Set the next recommended step
 */
export const updateNextStep = async (nextStep: NextStep): Promise<void> => {
  await userApi.setNextStep({
    type: nextStep.type,
    topic: nextStep.topic,
    title: nextStep.title,
    content: nextStep.content,
    question: nextStep.question,
    answer: nextStep.expectedAnswer,
    task: nextStep.task,
  });
};

/**
 * Clear the next step
 */
export const clearNextStep = async (): Promise<void> => {
  await userApi.clearNextStep();
};

/**
 * Update memory for a specific topic
 */
export const updateTopicMemory = async (
  topic: string,
  confidence: number,
  timesTested: number
): Promise<void> => {
  await userApi.updateMemory({
    topic,
    confidence,
    timesTested,
  });
};

/**
 * Update memory for a topic in a specific course
 */
export const updateCourseTopicMemory = async (
  courseId: string,
  topic: string,
  confidence: number,
  timesTested: number
): Promise<void> => {
  await coursesApi.updateCourseMemory(courseId, {
    topic,
    confidence,
    timesTested,
  });
};
