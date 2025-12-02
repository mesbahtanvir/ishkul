import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Stores
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { checkAuthState, initializeAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';
import { learningPathsApi } from '../services/api';
import { tokenStorage } from '../services/api/tokenStorage';

// Types
import { RootStackParamList } from '../types/navigation';

// Screens
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { GoalSelectionScreen } from '../screens/GoalSelectionScreen';
import { LevelSelectionScreen } from '../screens/LevelSelectionScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LearningPathScreen } from '../screens/LearningPathScreen';
import { LearningSessionScreen } from '../screens/LearningSessionScreen';
import { StepDetailScreen } from '../screens/StepDetailScreen';
import { LessonScreen } from '../screens/LessonScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { PracticeScreen } from '../screens/PracticeScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { UpgradeModal } from '../components/UpgradeModal';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Learn Stack Navigator
const LearnStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="LevelSelection" component={LevelSelectionScreen} />
      {/* New: Main timeline view for learning path */}
      <Stack.Screen name="LearningPath" component={LearningPathScreen} />
      {/* Legacy: Redirect to LearningPath for backward compatibility */}
      <Stack.Screen name="LearningSession" component={LearningSessionScreen} />
      {/* New: Read-only view for completed steps */}
      <Stack.Screen name="StepDetail" component={StepDetailScreen} />
      {/* Step interaction screens */}
      <Stack.Screen name="Lesson" component={LessonScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="Practice" component={PracticeScreen} />
      {/* Subscription management */}
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Learn"
        component={LearnStack}
        options={{
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>🎓</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: () => (
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { user, loading } = useUserStore();
  const hasTokens = tokenStorage.hasTokens();

  if (loading) {
    return <LoadingScreen />;
  }

  // User is authenticated if they have both user state AND valid tokens
  // This prevents showing Landing page when tokens exist but user state is temporarily null
  const isAuthenticated = !!user && hasTokens;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
          <Stack.Screen name="LevelSelection" component={LevelSelectionScreen} />
        </>
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
};

// App Navigator with Auth State Management
export const AppNavigator: React.FC = () => {
  const { _hasHydrated, setUser, setUserDocument, setLoading } = useUserStore();
  const { setPaths, setLoading: setPathsLoading } = useLearningPathsStore();

  useEffect(() => {
    // Wait for store to be hydrated before checking auth
    if (_hasHydrated === 0) {
      return;
    }

    // Check auth state on app startup
    const checkAuth = async () => {
      try {
        // Initialize token storage
        await initializeAuth();

        // If we have a hydrated user, validate with backend
        // Otherwise check if we have stored tokens
        const validatedUser = await checkAuthState();

        if (validatedUser) {
          setUser(validatedUser);
          // Clear cache when user logs in to ensure fresh data from backend
          useLearningPathsStore.getState().clearAllCache();
          try {
            // Fetch user document and learning paths in parallel
            const [userDoc, paths] = await Promise.all([
              getUserDocument(),
              learningPathsApi.getPaths(),
            ]);
            setUserDocument(userDoc);
            setPaths(paths);
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else {
          // Only clear user if tokens don't exist
          // This prevents clearing user when backend validation fails but tokens are still valid
          if (!tokenStorage.hasTokens()) {
            setUser(null);
            setUserDocument(null);
            setPaths([]);
          }
          // If tokens exist but validation failed, keep existing user state
          // The user will see the Main dashboard with potentially stale data
          // Next sync will update when tokens refresh
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // Only clear user if tokens don't exist
        if (!tokenStorage.hasTokens()) {
          setUser(null);
          setUserDocument(null);
          setPaths([]);
        }
      } finally {
        setLoading(false);
        setPathsLoading(false);
      }
    };

    checkAuth();
  }, [_hasHydrated]);

  return (
    <NavigationContainer>
      <RootNavigator />
      <UpgradeModal />
    </NavigationContainer>
  );
};
