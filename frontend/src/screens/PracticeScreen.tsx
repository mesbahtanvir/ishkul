import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningStore } from '../state/learningStore';
import { updateUserHistory, clearNextStep, getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
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
  const { responsive, isSmallPhone } = useResponsive();

  const handleDone = async () => {
    if (!userDocument) return;

    try {
      setLoading(true);

      const historyEntry: HistoryEntry = {
        type: 'practice',
        topic: step.topic,
        timestamp: Date.now(),
      };

      await updateUserHistory(historyEntry);
      await clearNextStep();

      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      clearCurrentStep();
      navigation.navigate('NextStep');
    } catch (error) {
      console.error('Error completing practice:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Responsive values
  const emojiSize = responsive(48, 60, 68, 76);
  const titleSize = responsive(
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize,
    Typography.heading.h1.fontSize
  );

  return (
    <Container scrollable>
      <View style={styles.content}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>💪</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Practice</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            {step.title || step.topic}
          </Text>
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
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.badge.practice,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    color: Colors.white,
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  taskLabel: {
    ...Typography.body.small,
    fontWeight: '600',
    color: Colors.ios.gray,
    marginBottom: Spacing.sm,
  },
  task: {
    ...Typography.body.medium,
    lineHeight: 26,
    color: Colors.text.primary,
    fontWeight: '500',
    marginBottom: Spacing.xl,
  },
  tipsContainer: {
    backgroundColor: Colors.card.default,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  tipsTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  tipsText: {
    ...Typography.body.small,
    lineHeight: 22,
    color: Colors.text.primary,
  },
});
