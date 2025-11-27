/**
 * Memory Service
 *
 * This module provides functions for managing user learning data.
 * All data operations go through the backend API - no direct Firebase access.
 * The backend determines the user from the auth token.
 */

import { userApi } from './api';
import { UserDocument, HistoryEntry, NextStep, LevelType } from '../types/app';

/**
 * Get user document (profile + learning data)
 */
export const getUserDocument = async (): Promise<UserDocument | null> => {
  return userApi.getUserDocument();
};

/**
 * Create or initialize user document with goal and level
 */
export const createUserDocument = async (
  goal: string,
  level: LevelType
): Promise<void> => {
  await userApi.createUserDocument(goal, level);
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
