import React, { useEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LoadingScreen } from '../components/LoadingScreen';
import { RootStackParamList } from '../types/navigation';

type LearningSessionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LearningSession'
>;
type LearningSessionScreenRouteProp = RouteProp<RootStackParamList, 'LearningSession'>;

interface LearningSessionScreenProps {
  navigation: LearningSessionScreenNavigationProp;
  route: LearningSessionScreenRouteProp;
}

/**
 * LearningSessionScreen (Legacy)
 *
 * This screen is kept for backward compatibility.
 * It redirects to the new LearningPathScreen which provides
 * a Duolingo-style timeline view with all steps visible.
 */
export const LearningSessionScreen: React.FC<LearningSessionScreenProps> = ({
  navigation,
  route,
}) => {
  const { pathId } = route.params;

  useEffect(() => {
    // Redirect to new LearningPath screen
    navigation.replace('LearningPath', { pathId });
  }, [navigation, pathId]);

  // Show loading while redirecting
  return <LoadingScreen />;
};

export default LearningSessionScreen;
