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
  const { responsive, isSmallPhone } = useResponsive();

  const handleUnderstand = async () => {
    if (!userDocument) return;

    try {
      setLoading(true);

      const historyEntry: HistoryEntry = {
        type: 'lesson',
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
      console.error('Error completing lesson:', error);
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
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>📖</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Lesson</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            {step.title || step.topic}
          </Text>
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
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  emoji: {
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.badge.lesson,
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
  body: {
    ...Typography.body.medium,
    lineHeight: 26,
    color: Colors.text.primary,
  },
});
