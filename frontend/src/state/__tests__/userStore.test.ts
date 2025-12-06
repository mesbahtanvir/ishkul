import { useUserStore } from '../userStore';
import { User, UserDocument } from '../../types/app';

describe('userStore', () => {
  beforeEach(() => {
    // Reset store state
    useUserStore.setState({
      user: null,
      userDocument: null,
      loading: true,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have null user', () => {
      const state = useUserStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null userDocument', () => {
      const state = useUserStore.getState();
      expect(state.userDocument).toBeNull();
    });

    it('should have loading as true', () => {
      const state = useUserStore.getState();
      expect(state.loading).toBe(true);
    });

    it('should have null error', () => {
      const state = useUserStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      const mockUser: User = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      useUserStore.getState().setUser(mockUser);

      expect(useUserStore.getState().user).toEqual(mockUser);
    });

    it('should set user to null', () => {
      const mockUser: User = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setUser(null);

      expect(useUserStore.getState().user).toBeNull();
    });
  });

  describe('setUserDocument', () => {
    it('should set userDocument', () => {
      const mockDocument: UserDocument = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        goal: 'Learn Python',
        memory: { topics: {} },
        history: [],
        courses: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useUserStore.getState().setUserDocument(mockDocument);

      expect(useUserStore.getState().userDocument).toEqual(mockDocument);
    });

    it('should set userDocument to null', () => {
      const mockDocument: UserDocument = {
        uid: 'user123',
        goal: 'Test',
        memory: { topics: {} },
        history: [],
        courses: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useUserStore.getState().setUserDocument(mockDocument);
      useUserStore.getState().setUserDocument(null);

      expect(useUserStore.getState().userDocument).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      useUserStore.getState().setLoading(false);
      useUserStore.getState().setLoading(true);

      expect(useUserStore.getState().loading).toBe(true);
    });

    it('should set loading to false', () => {
      useUserStore.getState().setLoading(false);

      expect(useUserStore.getState().loading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useUserStore.getState().setError('Something went wrong');

      expect(useUserStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      useUserStore.getState().setError('Error');
      useUserStore.getState().setError(null);

      expect(useUserStore.getState().error).toBeNull();
    });
  });

  describe('clearUser', () => {
    it('should clear user and userDocument', () => {
      const mockUser: User = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      const mockDocument: UserDocument = {
        uid: 'user123',
        goal: 'Test',
        memory: { topics: {} },
        history: [],
        courses: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setUserDocument(mockDocument);
      useUserStore.getState().setError('Some error');

      useUserStore.getState().clearUser();

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().userDocument).toBeNull();
      expect(useUserStore.getState().error).toBeNull();
    });

    it('should not affect loading state', () => {
      useUserStore.getState().setLoading(false);
      useUserStore.getState().clearUser();

      // clearUser doesn't change loading state
      expect(useUserStore.getState().loading).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('should maintain state across multiple operations', () => {
      const mockUser: User = {
        uid: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setLoading(false);
      useUserStore.getState().setError('Test error');

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Test error');
    });
  });

  describe('store structure', () => {
    it('should have all required methods', () => {
      const state = useUserStore.getState();

      expect(typeof state.setUser).toBe('function');
      expect(typeof state.setUserDocument).toBe('function');
      expect(typeof state.setLoading).toBe('function');
      expect(typeof state.setError).toBe('function');
      expect(typeof state.clearUser).toBe('function');
    });
  });
});
