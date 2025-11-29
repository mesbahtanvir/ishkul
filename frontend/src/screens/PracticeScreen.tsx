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

type PracticeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Practice'>;
type PracticeScreenRouteProp = RouteProp<RootStackParamList, 'Practice'>;

interface PracticeScreenProps {
  navigation: PracticeScreenNavigationProp;
  route: PracticeScreenRouteProp;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  navigation,
  route,
}) => {
  const { step, pathId } = route.params;
  const { setUserDocument } = useUserStore();
  const { updatePath, setCurrentStep } = useLearningPathsStore();
  const [loading, setLoading] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  const handleDone = async () => {
    try {
      setLoading(true);

      // Complete the step
      const result = await completePathStep(pathId, {
        type: 'practice',
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
          <View style={[styles.badge, { backgroundColor: colors.badge.practice }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>Practice</Text>
          </View>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            {step.title || step.topic}
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={[styles.taskLabel, { color: colors.ios.gray }]}>Your Task:</Text>
          <Text style={[styles.task, { color: colors.text.primary }]}>{step.task}</Text>

          <View style={[styles.tipsContainer, { backgroundColor: colors.card.default }]}>
            <Text style={[styles.tipsTitle, { color: colors.text.primary }]}>💡 Tips:</Text>
            <Text style={[styles.tipsText, { color: colors.text.primary }]}>
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
  taskLabel: {
    ...Typography.body.small,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  task: {
    ...Typography.body.medium,
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: Spacing.xl,
  },
  tipsContainer: {
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  tipsTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  tipsText: {
    ...Typography.body.small,
    lineHeight: 22,
  },
});
