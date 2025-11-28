import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type GoalSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GoalSelection'>;

interface GoalSelectionScreenProps {
  navigation: GoalSelectionScreenNavigationProp;
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
}) => {
  const [goal, setGoal] = useState('');
  const { responsive, isSmallPhone, isTablet } = useResponsive();

  const handleNext = () => {
    if (goal.trim()) {
      navigation.navigate('LevelSelection', { goal: goal.trim() });
    }
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
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            What do you want to learn?
          </Text>
          <Text style={styles.subtitle}>
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
            <Text style={styles.examplesLabel}>Popular Goals</Text>
            <View style={[styles.examplesGrid, isTablet && styles.examplesGridTablet]}>
              {EXAMPLE_GOALS.map((example, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.exampleCard, { minWidth: cardMinWidth }]}
                  onPress={() => handleExamplePress(example.title)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.exampleEmoji, { fontSize: emojiSize }]}>
                    {example.emoji}
                  </Text>
                  <Text style={styles.exampleTitle}>{example.title}</Text>
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
    color: Colors.text.primary,
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
    backgroundColor: Colors.card.default,
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
    color: Colors.text.primary,
    textAlign: 'center',
  },
});
