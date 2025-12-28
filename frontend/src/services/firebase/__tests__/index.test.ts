/**
 * Tests for Firebase service initialization
 */

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({ type: 'firestore' })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ type: 'auth' })),
}));

jest.mock('../../../config/firebase.config', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456',
    appId: '1:123456:web:abc123',
  },
}));

describe('Firebase initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase app on first call', () => {
      const { initializeApp, getApps } = require('firebase/app');
      const { initializeFirebase } = require('../index');

      (getApps as jest.Mock).mockReturnValue([]);

      const app = initializeFirebase();

      expect(initializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-api-key',
          projectId: 'test-project',
        })
      );
      expect(app).toEqual({ name: 'test-app' });
    });

    it('should return existing app if already initialized', () => {
      const { initializeApp, getApps, getApp } = require('firebase/app');
      const { initializeFirebase } = require('../index');

      const existingApp = { name: 'existing-app' };
      (getApps as jest.Mock).mockReturnValue([existingApp]);
      (getApp as jest.Mock).mockReturnValue(existingApp);

      const app = initializeFirebase();

      expect(initializeApp).not.toHaveBeenCalled();
      expect(app).toEqual(existingApp);
    });

    it('should return cached app on subsequent calls', () => {
      jest.resetModules();
      const { initializeApp, getApps } = require('firebase/app');
      const { initializeFirebase } = require('../index');

      (getApps as jest.Mock).mockReturnValue([]);

      const app1 = initializeFirebase();
      const app2 = initializeFirebase();

      expect(initializeApp).toHaveBeenCalledTimes(1);
      expect(app1).toBe(app2);
    });
  });

  describe('getFirestoreClient', () => {
    it('should return Firestore instance', () => {
      jest.resetModules();
      const { getFirestore } = require('firebase/firestore');
      const { getFirestoreClient } = require('../index');

      const db = getFirestoreClient();

      expect(getFirestore).toHaveBeenCalled();
      expect(db).toEqual({ type: 'firestore' });
    });

    it('should return cached instance on subsequent calls', () => {
      jest.resetModules();
      const { getFirestore } = require('firebase/firestore');
      const { getFirestoreClient } = require('../index');

      const db1 = getFirestoreClient();
      const db2 = getFirestoreClient();

      expect(getFirestore).toHaveBeenCalledTimes(1);
      expect(db1).toBe(db2);
    });
  });

  describe('getFirebaseAuth', () => {
    it('should return Auth instance', () => {
      jest.resetModules();
      const { getAuth } = require('firebase/auth');
      const { getFirebaseAuth } = require('../index');

      const auth = getFirebaseAuth();

      expect(getAuth).toHaveBeenCalled();
      expect(auth).toEqual({ type: 'auth' });
    });

    it('should return cached instance on subsequent calls', () => {
      jest.resetModules();
      const { getAuth } = require('firebase/auth');
      const { getFirebaseAuth } = require('../index');

      const auth1 = getFirebaseAuth();
      const auth2 = getFirebaseAuth();

      expect(getAuth).toHaveBeenCalledTimes(1);
      expect(auth1).toBe(auth2);
    });
  });
});
