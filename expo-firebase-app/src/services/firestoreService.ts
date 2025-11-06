import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types';

/**
 * Firestore Service
 * Handles all Firebase Firestore database operations
 */
class FirestoreService {
  /**
   * Create a new document in a collection
   */
  async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const timestamp = Timestamp.now();
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }

  /**
   * Set a document with a specific ID (creates or overwrites)
   */
  async set<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T,
    merge: boolean = false
  ): Promise<void> {
    try {
      const timestamp = Timestamp.now();
      const docRef = doc(db, collectionName, documentId);
      await setDoc(
        docRef,
        {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        { merge }
      );
    } catch (error) {
      console.error('Error setting document:', error);
      throw new Error('Failed to set document');
    }
  }

  /**
   * Get a single document by ID
   */
  async get<T extends DocumentData>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw new Error('Failed to get document');
    }
  }

  /**
   * Get all documents from a collection with optional query constraints
   */
  async getAll<T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new Error('Failed to get documents');
    }
  }

  /**
   * Update a document
   */
  async update<T extends Partial<DocumentData>>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Failed to update document');
    }
  }

  /**
   * Delete a document
   */
  async delete(collectionName: string, documentId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Create or update user profile
   */
  async createUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await this.set('users', userId, data, true);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await this.get<UserProfile>('users', userId);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await this.update('users', userId, data);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Query helper - creates query constraints
   */
  createQuery = {
    where: (field: string, operator: any, value: any) => where(field, operator, value),
    orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => orderBy(field, direction),
    limit: (count: number) => limit(count),
  };
}

export default new FirestoreService();
