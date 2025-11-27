import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningStore } from '../state/learningStore';
import { updateUserHistory, clearNextStep, getUserDocument } from '../services/memory';
import { HistoryEntry, NextStep } from '../types/app';
import { RootStackParamList } from '../types/navigation';

type LessonScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;

interface LessonScreenProps {
  navigation: LessonScreenNavigationProp;
  route: { params: { step: NextStep } };
}

export const LessonScreen: React.FC<LessonScreenProps> = ({
  navigation,
  route,
}) => {
  const { step } = route.params;
  const { userDocument, setUserDocument } = useUserStore();
  const { clearCurrentStep } = useLearningStore();
  const [loading, setLoading] = useState(false);

  const handleUnderstand = async () => {
    if (!userDocument) return;

    try {
      setLoading(true);

      // Create history entry
      const historyEntry: HistoryEntry = {
        type: 'lesson',
        topic: step.topic,
        timestamp: Date.now(),
      };

      // Update Firestore
      await updateUserHistory(historyEntry);
      await clearNextStep();

      // Update local state
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Clear current step
      clearCurrentStep();

      // Navigate back to NextStep screen
      navigation.navigate('NextStep');
    } catch (error) {
      console.error('Error completing lesson:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📖</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Lesson</Text>
          </View>
          <Text style={styles.title}>{step.title || step.topic}</Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.body}>{step.content}</Text>
        </View>

        <Button
          title="I Understand →"
          onPress={handleUnderstand}
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
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: 24,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: '#000000',
  },
});
