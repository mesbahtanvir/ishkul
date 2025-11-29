import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore, getEmojiForGoal, generatePathId } from '../state/learningPathsStore';
import { createUserDocument, getUserDocument, addLearningPath } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { LevelType, LearningPath } from '../types/app';
import { RootStackParamList } from '../types/navigation';

type LevelSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LevelSelection'>;
type LevelSelectionScreenRouteProp = RouteProp<RootStackParamList, 'LevelSelection'>;

interface LevelSelectionScreenProps {
  navigation: LevelSelectionScreenNavigationProp;
  route: LevelSelectionScreenRouteProp;
}

const LEVELS = [
  {
    id: 'beginner' as LevelType,
    emoji: '🌱',
    title: 'Beginner',
    description: 'Starting from the basics',
  },
  {
    id: 'intermediate' as LevelType,
    emoji: '🌿',
    title: 'Intermediate',
    description: 'Have some foundation knowledge',
  },
  {
    id: 'advanced' as LevelType,
    emoji: '🌳',
    title: 'Advanced',
    description: 'Ready for complex topics',
  },
];

export const LevelSelectionScreen: React.FC<LevelSelectionScreenProps> = ({
  navigation,
  route,
}) => {
  const { goal, isCreatingNewPath } = route.params;
  const { user, userDocument, setUserDocument } = useUserStore();
  const { addPath } = useLearningPathsStore();
  const [selectedLevel, setSelectedLevel] = useState<LevelType | null>(null);
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();

  const handleConfirm = async () => {
    if (!selectedLevel || !user) return;

    try {
      setLoading(true);

      if (isCreatingNewPath && userDocument) {
        // Creating a new learning path for existing user
        const now = Date.now();
        const newPath: LearningPath = {
          id: generatePathId(),
          goal,
          level: selectedLevel,
          emoji: getEmojiForGoal(goal),
          progress: 0,
          lessonsCompleted: 0,
          totalLessons: 10, // Initial estimate
          memory: { topics: {} },
          history: [],
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
        };

        await addLearningPath(newPath);
        addPath(newPath);

        // Refresh user document
        const userDoc = await getUserDocument();
        setUserDocument(userDoc);

        // Navigate back to Home
        navigation.navigate('Home');
      } else {
        // First-time user - create user document with first learning path
        const now = Date.now();
        const firstPath: LearningPath = {
          id: generatePathId(),
          goal,
          level: selectedLevel,
          emoji: getEmojiForGoal(goal),
          progress: 0,
          lessonsCompleted: 0,
          totalLessons: 10,
          memory: { topics: {} },
          history: [],
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
        };

        await createUserDocument(goal, selectedLevel, firstPath);

        const userDoc = await getUserDocument();
        setUserDocument(userDoc);

        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Responsive values
  const titleSize = responsive(
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize,
    Typography.display.small.fontSize
  );
  const emojiSize = responsive(32, 40, 44, 48);
  const cardPadding = responsive(Spacing.md, Spacing.lg, Spacing.lg, Spacing.xl);

  return (
    <Container>
      <View style={styles.content}>
        {isCreatingNewPath && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Choose your level</Text>
          <Text style={styles.subtitle}>
            For: <Text style={styles.goal}>{goal}</Text>
          </Text>
        </View>

        <View style={[styles.levelsContainer, isSmallPhone && styles.levelsContainerSmall]}>
          {LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelCard,
                { padding: cardPadding },
                selectedLevel === level.id && styles.levelCardSelected,
              ]}
              onPress={() => setSelectedLevel(level.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.levelEmoji, { fontSize: emojiSize }]}>{level.emoji}</Text>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>{level.title}</Text>
                <Text style={styles.levelDescription}>{level.description}</Text>
              </View>
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radio,
                    selectedLevel === level.id && styles.radioSelected,
                  ]}
                >
                  {selectedLevel === level.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Start Learning →"
          onPress={handleConfirm}
          disabled={!selectedLevel}
          loading={loading}
        />
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  backButton: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...Typography.body.medium,
    color: Colors.primary,
    fontWeight: '600',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body.medium,
    color: Colors.ios.gray,
  },
  goal: {
    fontWeight: '600',
    color: Colors.ios.blue,
  },
  levelsContainer: {
    flex: 1,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  levelsContainerSmall: {
    gap: Spacing.sm,
  },
  levelCard: {
    backgroundColor: Colors.card.default,
    borderRadius: Spacing.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelCardSelected: {
    borderColor: Colors.ios.blue,
    backgroundColor: Colors.card.selected,
  },
  levelEmoji: {
    marginRight: Spacing.md,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  levelDescription: {
    ...Typography.body.small,
    color: Colors.ios.gray,
  },
  radioContainer: {
    marginLeft: Spacing.sm,
  },
  radio: {
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 2,
    borderColor: Colors.ios.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.ios.blue,
  },
  radioInner: {
    width: Spacing.sm + 4,
    height: Spacing.sm + 4,
    borderRadius: Spacing.borderRadius.full,
    backgroundColor: Colors.ios.blue,
  },
});
