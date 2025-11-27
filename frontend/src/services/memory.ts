/**
 * Memory Service
 *
 * This module provides functions for managing user learning data.
 * All data operations go through the backend API - no direct Firebase access.
 */

import { userApi } from './api';
import { UserDocument, HistoryEntry, NextStep, LevelType } from '../types/app';

/**
 * Get user document (profile + learning data)
 * Note: uid parameter is kept for API compatibility but is no longer needed
 * as the backend determines the user from the auth token
 */
export const getUserDocument = async (_uid?: string): Promise<UserDocument | null> => {
  return userApi.getUserDocument();
};

/**
 * Create or initialize user document with goal and level
 * Note: uid, email, displayName parameters are kept for API compatibility
 * but are no longer needed as the backend uses auth token
 */
export const createUserDocument = async (
  _uid: string,
  _email: string,
  _displayName: string,
  goal: string,
  level: LevelType
): Promise<void> => {
  await userApi.createUserDocument(goal, level);
};

/**
 * Update user's goal and level
 * Note: uid parameter is kept for API compatibility but is no longer needed
 */
export const updateUserGoalAndLevel = async (
  _uid: string,
  goal: string,
  level: LevelType
): Promise<void> => {
  await userApi.updateGoalAndLevel(goal, level);
};

/**
 * Add a history entry
 * Note: uid parameter is kept for API compatibility but is no longer needed
 */
export const updateUserHistory = async (
  _uid: string,
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
 * Note: uid parameter is kept for API compatibility but is no longer needed
 */
export const updateNextStep = async (
  _uid: string,
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
 * Note: uid parameter is kept for API compatibility but is no longer needed
 */
export const clearNextStep = async (_uid?: string): Promise<void> => {
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
