import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { useScreenTracking, useOnboardingTracking, useAnalytics } from '../services/analytics';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore, getEmojiForGoal } from '../state/learningPathsStore';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { createUserDocument, getUserDocument, addLearningPath } from '../services/memory';
import { learningPathsApi, ApiError, ErrorCodes } from '../services/api';
import { LevelType } from '../types/app';

type GoalSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GoalSelection'>;
type GoalSelectionScreenRouteProp = RouteProp<RootStackParamList, 'GoalSelection'>;

interface GoalSelectionScreenProps {
  navigation: GoalSelectionScreenNavigationProp;
  route: GoalSelectionScreenRouteProp;
}

const EXAMPLE_GOALS = [
  { emoji: '🐍', title: 'Learn Python' },
  { emoji: '🍳', title: 'Learn to Cook' },
  { emoji: '🎹', title: 'Learn Piano' },
  { emoji: '🎨', title: 'Learn to Draw' },
  { emoji: '💪', title: 'Get Fit' },
];

// Default level for all new courses - level selection has been removed from the flow
const DEFAULT_LEVEL: LevelType = 'beginner';

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('GoalSelection', 'GoalSelectionScreen');
  const { startOnboarding, selectGoal, completeOnboarding } = useOnboardingTracking();
  const { trackLearningPathCreated } = useAnalytics();
  const { user, userDocument, setUserDocument } = useUserStore();
  const { addPath } = useLearningPathsStore();
  const { showUpgradePrompt } = useSubscriptionStore();
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone, isTablet } = useResponsive();
  const { colors } = useTheme();
  const isCreatingNewPath = route.params?.isCreatingNewPath ?? false;

  // Track onboarding start when entering this screen (only for new users)
  React.useEffect(() => {
    if (!isCreatingNewPath) {
      startOnboarding(true);
    }
  }, [isCreatingNewPath, startOnboarding]);

  const handleNext = async () => {
    if (!goal.trim() || !user) return;

    const trimmedGoal = goal.trim();

    try {
      setLoading(true);

      // Track goal selection
      selectGoal(trimmedGoal);

      if (isCreatingNewPath && userDocument) {
        // Creating a new learning path for existing user
        const newPathData = {
          goal: trimmedGoal,
          level: DEFAULT_LEVEL,
          emoji: getEmojiForGoal(trimmedGoal),
        };

        const createdPath = await addLearningPath(newPathData);
        addPath(createdPath);

        // Track learning path created
        await trackLearningPathCreated({
          path_id: createdPath.id,
          goal: trimmedGoal,
          level: DEFAULT_LEVEL,
          is_first_path: false,
        });

        // Navigate to CourseGenerating to show outline generation progress
        navigation.navigate('CourseGenerating', { pathId: createdPath.id });
      } else {
        // First-time user - create user document with first learning path
        const firstPathData = {
          goal: trimmedGoal,
          level: DEFAULT_LEVEL,
          emoji: getEmojiForGoal(trimmedGoal),
        };

        await createUserDocument(trimmedGoal, DEFAULT_LEVEL, firstPathData);

        const userDoc = await getUserDocument();
        setUserDocument(userDoc);

        // Track onboarding complete for first-time users
        await completeOnboarding(trimmedGoal, DEFAULT_LEVEL);

        // Fetch the created path from the user document
        const fetchedPaths = await learningPathsApi.getPaths();
        if (fetchedPaths.length > 0) {
          const createdPath = fetchedPaths[0];
          addPath(createdPath);

          // Track learning path created
          await trackLearningPathCreated({
            path_id: createdPath.id,
            goal: trimmedGoal,
            level: DEFAULT_LEVEL,
            is_first_path: true,
          });

          // Navigate to Main first, then to CourseGenerating
          navigation.replace('Main');
          // Use setTimeout to ensure Main is mounted before navigating to CourseGenerating
          setTimeout(() => {
            navigation.navigate('CourseGenerating', { pathId: createdPath.id });
          }, 100);
        } else {
          // Fallback: just navigate to Main
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);

      // Check if this is a path limit error
      if (error instanceof ApiError && error.code === ErrorCodes.PATH_LIMIT_REACHED) {
        // Show upgrade modal instead of generic error
        showUpgradePrompt('path_limit');
      } else {
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleExamplePress = (exampleGoal: string) => {
    setGoal(exampleGoal);
  };

  // Responsive values
  const titleSize = responsive(
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize,
    Typography.display.small.fontSize
  );
  const cardMinWidth = responsive(90, 100, 120, 140);
  const emojiSize = responsive(28, 32, 36, 40);

  return (
    <Container scrollable>
      <View style={styles.content}>
        {isCreatingNewPath && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            What do you want to learn?
          </Text>
          <Text style={[styles.subtitle, { color: colors.ios.gray }]}>
            Set your learning goal and we'll create a personalized course for you
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Your Learning Goal"
            placeholder="e.g., Learn Spanish, Master React Native..."
            value={goal}
            onChangeText={setGoal}
            autoCapitalize="sentences"
            autoFocus
          />

          <View style={[styles.examplesContainer, isSmallPhone && styles.examplesContainerSmall]}>
            <Text style={[styles.examplesLabel, { color: colors.text.primary }]}>Popular Goals</Text>
            <View style={[styles.examplesGrid, isTablet && styles.examplesGridTablet]}>
              {EXAMPLE_GOALS.map((example, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.exampleCard, { minWidth: cardMinWidth, backgroundColor: colors.card.default }]}
                  onPress={() => handleExamplePress(example.title)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.exampleEmoji, { fontSize: emojiSize }]}>
                    {example.emoji}
                  </Text>
                  <Text style={[styles.exampleTitle, { color: colors.text.primary }]}>{example.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Button
          title="Start Learning →"
          onPress={handleNext}
          disabled={!goal.trim()}
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
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body.medium,
    lineHeight: Typography.body.large.lineHeight,
  },
  form: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  examplesContainer: {
    marginTop: Spacing.xl,
  },
  examplesContainerSmall: {
    marginTop: Spacing.lg,
  },
  examplesLabel: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  examplesGridTablet: {
    gap: Spacing.md,
  },
  exampleCard: {
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    flex: 1,
    maxWidth: '48%',
  },
  exampleEmoji: {
    marginBottom: Spacing.sm,
  },
  exampleTitle: {
    ...Typography.body.small,
    fontWeight: '500',
    textAlign: 'center',
  },
});
