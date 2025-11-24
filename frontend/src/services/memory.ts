import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserDocument, HistoryEntry, NextStep } from '../types/app';

const USERS_COLLECTION = 'users';

export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserDocument;
    }
    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

export const createUserDocument = async (
  uid: string,
  email: string,
  displayName: string,
  goal: string,
  level: 'beginner' | 'intermediate' | 'advanced'
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const newUser: UserDocument = {
      uid,
      email,
      displayName,
      goal,
      level,
      memory: {
        topics: {},
      },
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(userRef, newUser);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

export const updateUserGoalAndLevel = async (
  uid: string,
  goal: string,
  level: 'beginner' | 'intermediate' | 'advanced'
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      goal,
      level,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating user goal and level:', error);
    throw error;
  }
};

export const updateUserHistory = async (
  uid: string,
  historyEntry: HistoryEntry
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getUserDocument(uid);

    if (userDoc) {
      const updatedHistory = [...userDoc.history, historyEntry];
      await updateDoc(userRef, {
        history: updatedHistory,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error updating user history:', error);
    throw error;
  }
};

export const updateNextStep = async (
  uid: string,
  nextStep: NextStep
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      nextStep,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating next step:', error);
    throw error;
  }
};

export const clearNextStep = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      nextStep: null,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error clearing next step:', error);
    throw error;
  }
};
