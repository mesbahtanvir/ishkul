/**
 * CourseScreen - Redirects to CourseOutlineScreen
 *
 * This is a compatibility layer that redirects old course links to the new
 * CourseOutlineScreen. All course viewing now happens through the
 * section/lesson-based outline screen.
 */

import React, { useEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LoadingScreen } from '../components/LoadingScreen';
import { RootStackParamList } from '../types/navigation';
import { useScreenTracking } from '../services/analytics';

type CourseScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Course'
>;
type CourseScreenRouteProp = RouteProp<RootStackParamList, 'Course'>;

interface CourseScreenProps {
  navigation: CourseScreenNavigationProp;
  route: CourseScreenRouteProp;
}

export const CourseScreen: React.FC<CourseScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('Course', 'CourseScreen');
  const { courseId } = route.params;

  useEffect(() => {
    // Immediately redirect to CourseOutlineScreen
    navigation.replace('CourseOutline', { courseId });
  }, [courseId, navigation]);

  // Show loading while redirecting
  return <LoadingScreen />;
};

export default CourseScreen;
