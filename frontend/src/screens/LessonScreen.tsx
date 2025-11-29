import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { useLearningPathsStore } from '../state/learningPathsStore';
import { completePathStep, getUserDocument } from '../services/memory';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../types/navigation';

type LessonScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lesson'>;
type LessonScreenRouteProp = RouteProp<RootStackParamList, 'Lesson'>;

interface LessonScreenProps {
  navigation: LessonScreenNavigationProp;
  route: LessonScreenRouteProp;
}

export const LessonScreen: React.FC<LessonScreenProps> = ({
  navigation,
  route,
}) => {
  const { step, pathId } = route.params;
  const { setUserDocument } = useUserStore();
  const { updatePath, setCurrentStep } = useLearningPathsStore();
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  const handleUnderstand = async () => {
    try {
      setLoading(true);

      // Complete the step and get updated path
      const result = await completePathStep(pathId, {
        type: 'lesson',
        topic: step.topic,
      });

      // Update local state
      updatePath(pathId, result.path);
      setCurrentStep(pathId, result.nextStep);

      // Refresh user document
      const updatedDoc = await getUserDocument();
      setUserDocument(updatedDoc);

      // Navigate back to session
      navigation.navigate('LearningSession', { pathId });
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
          <View style={[styles.badge, { backgroundColor: colors.badge.lesson }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>Lesson</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            {step.title || step.topic}
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={[styles.body, { color: colors.text.primary }]}>{step.content}</Text>
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
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    ...Typography.label.medium,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading.h2,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  body: {
    ...Typography.body.medium,
    lineHeight: 26,
  },
});
