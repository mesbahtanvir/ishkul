import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadTask,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { UploadProgress, UploadResult } from '../types';

/**
 * Storage Service
 * Handles all Firebase Storage operations for file uploads/downloads
 */
class StorageService {
  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(
    file: Blob | Uint8Array | ArrayBuffer,
    path: string,
    metadata?: any
  ): Promise<UploadResult> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        downloadURL,
        fullPath: snapshot.ref.fullPath,
        metadata: snapshot.metadata,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload a file with progress tracking
   */
  uploadFileWithProgress(
    file: Blob | Uint8Array | ArrayBuffer,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
    metadata?: any
  ): UploadTask {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        };
        onProgress(progress);
      });
    }

    return uploadTask;
  }

  /**
   * Get download URL for a file
   */
  async getFileURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error('Failed to get file URL');
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * List all files in a directory
   */
  async listFiles(path: string): Promise<string[]> {
    try {
      const storageRef = ref(storage, path);
      const result = await listAll(storageRef);
      return result.items.map((item) => item.fullPath);
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Upload user profile image
   */
  async uploadProfileImage(
    userId: string,
    file: Blob | Uint8Array | ArrayBuffer,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      const path = `users/${userId}/profile.jpg`;
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          userId,
          type: 'profile',
        },
      };

      if (onProgress) {
        const uploadTask = this.uploadFileWithProgress(file, path, onProgress, metadata);
        const snapshot = await uploadTask;
        return await getDownloadURL(snapshot.ref);
      } else {
        const result = await this.uploadFile(file, path, metadata);
        return result.downloadURL;
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw new Error('Failed to upload profile image');
    }
  }

  /**
   * Delete user profile image
   */
  async deleteProfileImage(userId: string): Promise<void> {
    try {
      const path = `users/${userId}/profile.jpg`;
      await this.deleteFile(path);
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw new Error('Failed to delete profile image');
    }
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(userId: string, fileName: string, folder: string = 'files'): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${folder}/${userId}/${timestamp}_${sanitizedFileName}`;
  }
}

export default new StorageService();
