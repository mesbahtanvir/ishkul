import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type SubscriptionSuccessScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SubscriptionSuccess'
>;

interface SubscriptionSuccessScreenProps {
  navigation: SubscriptionSuccessScreenNavigationProp;
}

// Constants for polling
const POLL_INTERVAL_MS = 1500; // Poll every 1.5 seconds
const MAX_POLL_ATTEMPTS = 10; // Max 15 seconds of polling

export const SubscriptionSuccessScreen: React.FC<SubscriptionSuccessScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const { fetchStatus } = useSubscriptionStore();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  const pollAttempts = useRef(0);

  // Poll for subscription status until it shows 'pro' or max attempts reached
  const pollForProStatus = useCallback(async () => {
    await fetchStatus();
    const currentTier = useSubscriptionStore.getState().tier;

    if (currentTier === 'pro') {
      // Successfully updated to pro
      return;
    }

    pollAttempts.current += 1;
    if (pollAttempts.current < MAX_POLL_ATTEMPTS) {
      // Schedule next poll
      setTimeout(pollForProStatus, POLL_INTERVAL_MS);
    }
  }, [fetchStatus]);

  useEffect(() => {
    // Mark checkout as complete
    useSubscriptionStore.setState({ checkoutInProgress: false });

    // Start polling for pro status (handles webhook race condition)
    pollForProStatus();

    // Run animations
    Animated.sequence([
      // Scale in the circle
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Show checkmark
      Animated.timing(checkmarkAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in content
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [pollForProStatus, scaleAnim, checkmarkAnim, opacityAnim]);

  const handleContinue = () => {
    // Navigate back to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <Container>
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successCircle,
            {
              backgroundColor: colors.ios.green,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.checkmark,
              {
                color: colors.white,
                opacity: checkmarkAnim,
              },
            ]}
          >
            {'\u2713'}
          </Animated.Text>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.textContent, { opacity: opacityAnim }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Welcome to Pro!
          </Text>

          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Your subscription is now active. Enjoy all the premium features!
          </Text>

          {/* Benefits List */}
          <View style={[styles.benefitsCard, { backgroundColor: colors.card.default }]}>
            <BenefitItem text="5 active learning paths" colors={colors} />
            <BenefitItem text="1,000 steps per day" colors={colors} />
            <BenefitItem text="GPT-5 Pro AI model" colors={colors} />
            <BenefitItem text="Priority generation" colors={colors} />
          </View>

          <Button
            title="Start Learning"
            onPress={handleContinue}
            style={styles.continueButton}
          />
        </Animated.View>
      </View>
    </Container>
  );
};

interface BenefitItemProps {
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

const BenefitItem: React.FC<BenefitItemProps> = ({ text, colors }) => (
  <View style={styles.benefitItem}>
    <Text style={[styles.benefitCheck, { color: colors.primary }]}>{'\u2713'}</Text>
    <Text style={[styles.benefitText, { color: colors.text.primary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  checkmark: {
    fontSize: 50,
    fontWeight: '700',
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...Typography.display.medium,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body.large,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  benefitsCard: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  benefitCheck: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: Spacing.sm,
    width: 24,
  },
  benefitText: {
    ...Typography.body.medium,
    flex: 1,
  },
  continueButton: {
    width: '100%',
  },
});
