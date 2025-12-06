/**
 * Memory Service
 *
 * This module provides functions for managing user learning data.
 * All data operations go through the backend API - no direct Firebase access.
 * The backend determines the user from the auth token.
 */

import { userApi, learningPathsApi } from './api';
import {
  UserDocument,
  HistoryEntry,
  NextStep,
  LearningPath,
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
 * Optionally includes the first learning path
 * Level is no longer required - AI adapts based on user context
 */
export const createUserDocument = async (
  goal: string,
  firstPath?: Partial<LearningPath>
): Promise<void> => {
  await userApi.createUserDocument(goal);

  // If a first path is provided, create it
  if (firstPath) {
    await learningPathsApi.createPath(firstPath);
  }
};

/**
 * Add a new learning path
 */
export const addLearningPath = async (
  path: Partial<LearningPath>
): Promise<LearningPath> => {
  return learningPathsApi.createPath(path);
};

/**
 * Get all learning paths
 */
export const getLearningPaths = async (): Promise<LearningPath[]> => {
  return learningPathsApi.getPaths();
};

/**
 * Get a specific learning path
 */
export const getLearningPath = async (
  pathId: string
): Promise<LearningPath | null> => {
  return learningPathsApi.getPath(pathId);
};

/**
 * Update a learning path
 */
export const updateLearningPath = async (
  pathId: string,
  updates: Partial<LearningPath>
): Promise<void> => {
  await learningPathsApi.updatePath(pathId, updates);
};

/**
 * Delete a learning path
 */
export const deleteLearningPath = async (pathId: string): Promise<void> => {
  await learningPathsApi.deletePath(pathId);
};

/**
 * Archive a learning path
 */
export const archiveLearningPath = async (pathId: string): Promise<LearningPath> => {
  return learningPathsApi.archivePath(pathId);
};

/**
 * Restore an archived learning path
 */
export const restoreLearningPath = async (pathId: string): Promise<LearningPath> => {
  return learningPathsApi.restorePath(pathId);
};

/**
 * Get next step - returns existing incomplete step or generates new one
 */
export const getPathNextStep = async (
  pathId: string
): Promise<{ step: Step; stepIndex: number }> => {
  return learningPathsApi.getNextStep(pathId);
};

/**
 * Complete current step (first incomplete step)
 */
export const completeCurrentStep = async (
  pathId: string,
  data?: StepCompleteRequest
): Promise<{ path: LearningPath; completedStep: Step; nextStepNeeded: boolean }> => {
  return learningPathsApi.completeCurrentStep(pathId, data);
};

/**
 * Complete a specific step by ID
 */
export const completeStep = async (
  pathId: string,
  stepId: string,
  data?: StepCompleteRequest
): Promise<{ path: LearningPath; completedStep: Step; nextStepNeeded: boolean }> => {
  return learningPathsApi.completeStep(pathId, stepId, data);
};

/**
 * View a step (records the view and updates lastReviewed)
 */
export const viewStep = async (
  pathId: string,
  stepId: string
): Promise<{ success: boolean; step: Step }> => {
  return learningPathsApi.viewStep(pathId, stepId);
};

/**
 * Legacy: Complete a step in a learning path (backward compatibility)
 * @deprecated Use completeStep or completeCurrentStep instead
 */
export const completePathStep = async (
  pathId: string,
  stepData: { type: string; topic: string; score?: number }
): Promise<{ path: LearningPath; nextStep?: NextStep }> => {
  const result = await learningPathsApi.completeCurrentStep(pathId, {
    score: stepData.score,
  });
  return {
    path: result.path,
    nextStep: undefined, // New API doesn't return next step
  };
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
 * Update memory for a topic in a specific learning path
 */
export const updatePathTopicMemory = async (
  pathId: string,
  topic: string,
  confidence: number,
  timesTested: number
): Promise<void> => {
  await learningPathsApi.updatePathMemory(pathId, {
    topic,
    confidence,
    timesTested,
  });
};
