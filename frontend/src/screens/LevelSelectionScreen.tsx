import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { createUserDocument, getUserDocument } from '../services/memory';
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

  const handleConfirm = async () => {
    if (!selectedLevel || !user) return;

    try {
      setLoading(true);

      // Create or update user document in Firestore
      await createUserDocument(goal, selectedLevel);

      // Fetch and update local state
      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving user profile:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose your level</Text>
          <Text style={styles.subtitle}>
            For: <Text style={styles.goal}>{goal}</Text>
          </Text>
        </View>

        <View style={styles.levelsContainer}>
          {LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.levelCard,
                selectedLevel === level.id && styles.levelCardSelected,
              ]}
              onPress={() => setSelectedLevel(level.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.levelEmoji}>{level.emoji}</Text>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
  },
  goal: {
    fontWeight: '600',
    color: '#007AFF',
  },
  levelsContainer: {
    flex: 1,
    gap: 16,
    marginBottom: 24,
  },
  levelCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  levelEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 15,
    color: '#8E8E93',
  },
  radioContainer: {
    marginLeft: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
});
