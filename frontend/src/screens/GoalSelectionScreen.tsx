import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { useScreenTracking, useOnboardingTracking } from '../services/analytics';

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

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  navigation,
  route,
}) => {
  useScreenTracking('GoalSelection', 'GoalSelectionScreen');
  const { startOnboarding, selectGoal } = useOnboardingTracking();
  const [goal, setGoal] = useState('');
  const { responsive, isSmallPhone, isTablet } = useResponsive();
  const { colors } = useTheme();
  const isCreatingNewPath = route.params?.isCreatingNewPath ?? false;

  // Track onboarding start when entering this screen (only for new users)
  React.useEffect(() => {
    if (!isCreatingNewPath) {
      startOnboarding(true);
    }
  }, [isCreatingNewPath, startOnboarding]);

  const handleNext = () => {
    if (goal.trim()) {
      // Track goal selection
      selectGoal(goal.trim());

      navigation.navigate('LevelSelection', {
        goal: goal.trim(),
        isCreatingNewPath,
      });
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
            Set your learning goal and we'll create a personalized learning path for you
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
          title="Next →"
          onPress={handleNext}
          disabled={!goal.trim()}
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
