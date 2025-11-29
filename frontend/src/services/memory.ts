/**
 * Memory Service
 *
 * This module provides functions for managing user learning data.
 * All data operations go through the backend API - no direct Firebase access.
 * The backend determines the user from the auth token.
 */

import { userApi, learningPathsApi } from './api';
import { UserDocument, HistoryEntry, NextStep, LevelType, LearningPath } from '../types/app';

/**
 * Get user document (profile + learning data)
 */
export const getUserDocument = async (): Promise<UserDocument | null> => {
  return userApi.getUserDocument();
};

/**
 * Create or initialize user document with goal and level
 * Optionally includes the first learning path
 */
export const createUserDocument = async (
  goal: string,
  level: LevelType,
  firstPath?: LearningPath
): Promise<void> => {
  await userApi.createUserDocument(goal, level);

  // If a first path is provided, create it
  if (firstPath) {
    await learningPathsApi.createPath(firstPath);
  }
};

/**
 * Add a new learning path
 */
export const addLearningPath = async (path: LearningPath): Promise<LearningPath> => {
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
export const getLearningPath = async (pathId: string): Promise<LearningPath | null> => {
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
 * Start/continue learning session - get next step for a path
 */
export const getPathNextStep = async (pathId: string): Promise<NextStep> => {
  return learningPathsApi.getNextStep(pathId);
};

/**
 * Complete a step in a learning path
 */
export const completePathStep = async (
  pathId: string,
  stepData: { type: string; topic: string; score?: number }
): Promise<{ path: LearningPath; nextStep?: NextStep }> => {
  return learningPathsApi.completeStep(pathId, stepData);
};

/**
 * Update user's goal and level
 */
export const updateUserGoalAndLevel = async (
  goal: string,
  level: LevelType
): Promise<void> => {
  await userApi.updateGoalAndLevel(goal, level);
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
export const updateNextStep = async (
  nextStep: NextStep
): Promise<void> => {
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
