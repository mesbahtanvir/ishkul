import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Container } from '../components/Container';
import { CreatePathCard } from '../components/CreatePathCard';
import { LearningPathCard } from '../components/LearningPathCard';
import { LoadingScreen } from '../components/LoadingScreen';

import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';

import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

import { RootStackParamList } from '../types/navigation';
import { LearningPath } from '../types/app';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, userDocument } = useUserStore();
  const { paths, setPaths, setActivePath, loading } = useLearningPathsStore();

  // Load learning paths from userDocument
  useEffect(() => {
    if (userDocument?.learningPaths) {
      setPaths(userDocument.learningPaths);
    }
  }, [userDocument?.learningPaths]);

  const handleCreatePath = () => {
    navigation.navigate('GoalSelection', { isCreatingNewPath: true });
  };

  const handlePathPress = (path: LearningPath) => {
    setActivePath(path);
    navigation.navigate('LearningSession', { pathId: path.id });
  };

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Container scrollable padding="medium">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {firstName}</Text>
        <Text style={styles.subtitle}>Continue your learning journey</Text>
      </View>

      {/* Create New Path Card */}
      <CreatePathCard onPress={handleCreatePath} />

      {/* Learning Paths Section */}
      {paths.length > 0 ? (
        <View style={styles.pathsSection}>
          <Text style={styles.sectionTitle}>My Learning Paths</Text>
          {paths.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              onPress={handlePathPress}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>Start Your Learning Journey</Text>
          <Text style={styles.emptySubtitle}>
            Create your first learning path and begin mastering new skills!
          </Text>
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  greeting: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
  },
  pathsSection: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.heading.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.heading.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});

export default HomeScreen;
