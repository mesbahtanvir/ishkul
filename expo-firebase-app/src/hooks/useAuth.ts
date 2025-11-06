import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services';

/**
 * Custom hook for authentication state management
 */
export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      if (initializing) {
        setInitializing(false);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [initializing]);

  return {
    user,
    loading,
    initializing,
    isAuthenticated: !!user,
  };
};
