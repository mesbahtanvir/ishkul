import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Container } from '../components/Container';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface GoalSelectionScreenProps {
  navigation: any;
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

  const handleNext = () => {
    if (goal.trim()) {
      navigation.navigate('LevelSelection', { goal: goal.trim() });
    }
  };

  const handleExamplePress = (exampleGoal: string) => {
    setGoal(exampleGoal);
  };

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>What do you want to learn?</Text>
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

          <View style={styles.examplesContainer}>
            <Text style={styles.examplesLabel}>Popular Goals</Text>
            <View style={styles.examplesGrid}>
              {EXAMPLE_GOALS.map((example, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.exampleCard}
                  onPress={() => handleExamplePress(example.title)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exampleEmoji}>{example.emoji}</Text>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    lineHeight: 24,
  },
  form: {
    flex: 1,
    marginBottom: 24,
  },
  examplesContainer: {
    marginTop: 32,
  },
  examplesLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exampleCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    maxWidth: '48%',
  },
  exampleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
});
