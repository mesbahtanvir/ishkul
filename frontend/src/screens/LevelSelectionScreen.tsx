import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { createUserDocument, getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { LevelType } from '../types/app';
import { RootStackParamList } from '../types/navigation';

type LevelSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LevelSelection'>;

interface LevelSelectionScreenProps {
  navigation: LevelSelectionScreenNavigationProp;
  route: { params: { goal: string } };
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
  const { goal } = route.params;
  const { user, setUserDocument } = useUserStore();
  const [selectedLevel, setSelectedLevel] = useState<LevelType | null>(null);
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();

  const handleConfirm = async () => {
    if (!selectedLevel || !user) return;

    try {
      setLoading(true);
      await createUserDocument(goal, selectedLevel);

      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving user profile:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
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
