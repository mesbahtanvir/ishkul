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

type PracticeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Practice'>;

interface PracticeScreenProps {
  navigation: PracticeScreenNavigationProp;
  route: { params: { step: NextStep } };
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  navigation,
  route,
}) => {
  const { step } = route.params;
  const { userDocument, setUserDocument } = useUserStore();
  const { clearCurrentStep } = useLearningStore();
  const [loading, setLoading] = useState(false);

  const handleDone = async () => {
    if (!userDocument) return;

    try {
      setLoading(true);

      // Create history entry
      const historyEntry: HistoryEntry = {
        type: 'practice',
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
      console.error('Error completing practice:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💪</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Practice</Text>
          </View>
          <Text style={styles.title}>{step.title || step.topic}</Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.taskLabel}>Your Task:</Text>
          <Text style={styles.task}>{step.task}</Text>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            <Text style={styles.tipsText}>
              • Take your time{'\n'}
              • Try it yourself first{'\n'}
              • Don't worry about making mistakes{'\n'}
              • Mark as done when you've practiced
            </Text>
          </View>
        </View>

        <Button
          title="I'm Done →"
          onPress={handleDone}
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
    backgroundColor: '#5856D6',
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
  taskLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  task: {
    fontSize: 17,
    lineHeight: 26,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 32,
  },
  tipsContainer: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
  },
});
