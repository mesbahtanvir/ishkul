import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

// Stores
import { useUserStore } from '../state/userStore';
import { subscribeToAuthChanges } from '../services/auth';
import { getUserDocument } from '../services/memory';

// Types
import { RootStackParamList } from '../types/navigation';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { GoalSelectionScreen } from '../screens/GoalSelectionScreen';
import { LevelSelectionScreen } from '../screens/LevelSelectionScreen';
import { NextStepScreen } from '../screens/NextStepScreen';
import { LessonScreen } from '../screens/LessonScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { PracticeScreen } from '../screens/PracticeScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoadingScreen } from '../components/LoadingScreen';

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
      <Stack.Screen name="NextStep" component={NextStepScreen} />
      <Stack.Screen name="Lesson" component={LessonScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="Practice" component={PracticeScreen} />
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
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🎓</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        <>
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
  const { setUser, setUserDocument, setLoading } = useUserStore();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        setUser(user);
        try {
          const userDoc = await getUserDocument(user.uid);
          setUserDocument(userDoc);
        } catch (error) {
          console.error('Error fetching user document:', error);
        }
      } else {
        setUser(null);
        setUserDocument(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};
