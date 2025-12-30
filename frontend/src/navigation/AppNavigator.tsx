import React, { useEffect, useState } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Stores
import { useUserStore } from '../state/userStore';
import { useCoursesStore } from '../state/coursesStore';
import { useSubscriptionStore } from '../state/subscriptionStore';

// Hooks
import { useResponsive } from '../hooks/useResponsive';
import { checkAuthState, initializeAuth } from '../services/auth';
import { userApi } from '../services/api';
import { tokenStorage } from '../services/api/tokenStorage';

// Types
import { RootStackParamList } from '../types/navigation';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { GoalSelectionScreen } from '../screens/GoalSelectionScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ContextScreen } from '../screens/ContextScreen';
// Unified course experience (SPA-like) - handles generating, overview, and lesson states
import { CourseViewScreen } from '../screens/CourseViewScreen';

// Legacy route wrappers - redirect to CourseView
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Wrapper for legacy CourseOutline route - redirects to CourseView
const CourseOutlineRedirect: React.FC<NativeStackScreenProps<RootStackParamList, 'CourseOutline'>> = ({ navigation, route }) => {
  React.useEffect(() => {
    navigation.replace('CourseView', { courseId: route.params.courseId });
  }, [navigation, route.params.courseId]);
  return null;
};

// Wrapper for legacy Lesson route - redirects to CourseView with lessonId
const LessonRedirect: React.FC<NativeStackScreenProps<RootStackParamList, 'Lesson'>> = ({ navigation, route }) => {
  React.useEffect(() => {
    navigation.replace('CourseView', {
      courseId: route.params.courseId,
      lessonId: route.params.lessonId,
      sectionId: route.params.sectionId,
    });
  }, [navigation, route.params]);
  return null;
};

// Wrapper for legacy CourseGenerating route - redirects to CourseView (handles generating state internally)
const CourseGeneratingRedirect: React.FC<NativeStackScreenProps<RootStackParamList, 'CourseGenerating'>> = ({ navigation, route }) => {
  React.useEffect(() => {
    navigation.replace('CourseView', { courseId: route.params.courseId });
  }, [navigation, route.params.courseId]);
  return null;
};

// Initialize tool registry
import '../tools';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { SubscriptionSuccessScreen } from '../screens/SubscriptionSuccessScreen';
import { ManageSubscriptionScreen } from '../screens/ManageSubscriptionScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { UpgradeModal } from '../components/UpgradeModal';
import { PastDueBanner } from '../components/PastDueBanner';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'learnanything://',
    'https://ishkul.org',
    'https://www.ishkul.org',
  ],
  config: {
    screens: {
      Login: 'login',
      GoalSelection: 'goal-selection',
      Main: {
        path: '',
        screens: {
          Learn: {
            path: 'learn',
            screens: {
              Home: 'home',
              GoalSelection: 'goal-selection',
              CourseGenerating: 'course-generating',
              // Unified course view - handles both course overview and lessons
              CourseView: {
                path: 'course/:courseId',
                parse: {
                  courseId: (courseId: string) => courseId,
                  lessonId: (lessonId: string) => lessonId,
                  sectionId: (sectionId: string) => sectionId,
                },
              },
              // Legacy routes - redirect to CourseView
              CourseOutline: {
                path: 'course-outline',
                alias: ['course-outline'],
              },
              Lesson: 'lesson',
            },
          },
          Progress: 'progress',
          Context: 'context',
          SettingsTab: {
            path: 'settings',
            screens: {
              Settings: '',
              Subscription: 'subscription',
              SubscriptionSuccess: 'subscription/success',
              ManageSubscription: 'subscription/manage',
            },
          },
        },
      },
    },
  },
  // Custom getInitialURL for handling deep links
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    return null;
  },
  // Custom subscribe for handling deep links while app is open
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });
    return () => subscription.remove();
  },
};

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
      {/* Unified course view - SPA-like experience for course and lessons */}
      {/* Handles generating, overview, and lesson states internally */}
      <Stack.Screen name="CourseView" component={CourseViewScreen} />
      {/* Legacy routes - redirect to CourseView for backward compatibility */}
      <Stack.Screen name="CourseGenerating" component={CourseGeneratingRedirect} />
      <Stack.Screen name="CourseOutline" component={CourseOutlineRedirect} />
      <Stack.Screen name="Lesson" component={LessonRedirect} />
    </Stack.Navigator>
  );
};

// Settings Stack Navigator
const SettingsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="SubscriptionSuccess" component={SubscriptionSuccessScreen} />
      <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const { isSmallPhone } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarShowLabel: !isSmallPhone,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: 8,
          paddingBottom: isSmallPhone ? 12 : 8,
          height: isSmallPhone ? 56 : 60,
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
          tabBarLabel: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Context"
        component={ContextScreen}
        options={{
          tabBarLabel: 'Context',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = ({ tokensInitialized }: { tokensInitialized: boolean }) => {
  const { user, loading } = useUserStore();

  // Show loading screen while:
  // 1. User store is loading (auth validation in progress)
  // 2. Token storage hasn't been initialized yet (tokens not loaded from localStorage)
  if (loading || !tokensInitialized) {
    return <LoadingScreen />;
  }

  // Now it's safe to check hasTokens - tokens have been loaded from storage
  const hasTokens = tokenStorage.hasTokens();

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
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
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
  const { setCourses, setLoading: setCoursesLoading } = useCoursesStore();
  const { fetchStatus } = useSubscriptionStore();
  // Track whether tokenStorage has been initialized (tokens loaded from localStorage/AsyncStorage)
  const [tokensInitialized, setTokensInitialized] = useState(false);

  // Handle subscription success/cancel URLs on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname;

      if (path === '/subscription/success') {
        // Clear the URL and refresh subscription status
        window.history.replaceState({}, '', '/');

        // Fetch updated subscription status
        fetchStatus();

        // Mark checkout as complete
        useSubscriptionStore.setState({ checkoutInProgress: false });
      } else if (path === '/subscription/cancel') {
        // User canceled checkout, just clear the URL
        window.history.replaceState({}, '', '/');
        useSubscriptionStore.setState({ checkoutInProgress: false });
      }
    }
  }, [fetchStatus]);

  useEffect(() => {
    // Wait for store to be hydrated before checking auth
    if (_hasHydrated === 0) {
      return;
    }

    // Check auth state on app startup
    const checkAuth = async () => {
      try {
        // Initialize token storage (loads tokens from localStorage/AsyncStorage)
        await initializeAuth();
        // Mark tokens as initialized so RootNavigator can safely check hasTokens()
        setTokensInitialized(true);

        // If we have a hydrated user, validate with backend
        // Otherwise check if we have stored tokens
        const validatedUser = await checkAuthState();

        if (validatedUser) {
          setUser(validatedUser);
          // Clear cache when user logs in to ensure fresh data from Firebase subscription
          useCoursesStore.getState().clearAllCache();
          try {
            // Fetch user document - courses will be loaded via Firebase subscription
            const userDoc = await userApi.getUserDocument();
            setUserDocument(userDoc);
            // Courses are now loaded via Firebase real-time subscription in HomeScreen
          } catch (error) {
            // Log detailed error information for debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error fetching user data on app startup:', {
              message: errorMessage,
              error,
            });
            // User will see the app with empty data
            // Firebase subscription will populate courses when HomeScreen mounts
          }
        } else {
          // Only clear user if tokens don't exist
          // This prevents clearing user when backend validation fails but tokens are still valid
          if (!tokenStorage.hasTokens()) {
            setUser(null);
            setUserDocument(null);
            setCourses([]);
          }
          // If tokens exist but validation failed, keep existing user state
          // The user will see the Main dashboard with potentially stale data
          // Next sync will update when tokens refresh
        }
      } catch (error) {
        // Log detailed error information for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error checking auth state:', {
          message: errorMessage,
          error,
        });
        // Only clear user if tokens don't exist
        if (!tokenStorage.hasTokens()) {
          setUser(null);
          setUserDocument(null);
          setCourses([]);
        }
      } finally {
        setLoading(false);
        setCoursesLoading(false);
      }
    };

    checkAuth();
  }, [_hasHydrated]);

  return (
    <>
      <PastDueBanner />
      <NavigationContainer
        linking={linking}
        documentTitle={{
          enabled: Platform.OS === 'web',
          formatter: (options, route) => {
            // Use explicit title if set, otherwise format route name
            const title = options?.title ?? route?.name;
            if (!title) {
              return 'Ishkul';
            }
            // Convert CamelCase to readable format (e.g., "GoalSelection" -> "Goal Selection")
            const formatted = title.replace(/([A-Z])/g, ' $1').trim();
            return `${formatted} | Ishkul`;
          },
        }}
      >
        <RootNavigator tokensInitialized={tokensInitialized} />
        <UpgradeModal />
      </NavigationContainer>
    </>
  );
};
