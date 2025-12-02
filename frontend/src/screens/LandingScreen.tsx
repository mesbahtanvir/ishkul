import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type LandingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

interface LandingScreenProps {
  navigation: LandingScreenNavigationProp;
}

// Feature card interface
interface Feature {
  emoji: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    emoji: '🎯',
    title: 'Learn Anything',
    description: 'Choose any topic you want to master - languages, coding, skills, and more.',
  },
  {
    emoji: '🤖',
    title: 'AI-Powered Learning',
    description: 'Personalized lessons and quizzes generated just for you by advanced AI.',
  },
  {
    emoji: '📈',
    title: 'Track Progress',
    description: 'Watch your skills grow with detailed progress tracking and insights.',
  },
  {
    emoji: '💡',
    title: 'Smart Recommendations',
    description: 'Get personalized suggestions based on your learning patterns and pace.',
  },
  {
    emoji: '🎓',
    title: 'Adaptive Paths',
    description: 'Content difficulty adjusts to your level for optimal learning.',
  },
  {
    emoji: '⚡',
    title: 'Learn at Your Pace',
    description: 'No pressure - learn whenever and wherever you want, at your own speed.',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { responsive, isSmallPhone } = useResponsive();
  const [scaleAnim] = React.useState(new Animated.Value(0.9));

  React.useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleGetStarted = () => {
    navigation.replace('Login');
  };

  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );

  const subtitleSize = responsive(
    Typography.heading.h4.fontSize,
    Typography.heading.h3.fontSize,
    Typography.heading.h2.fontSize
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {/* Header Section with Gradient Background */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Large Logo/Icon */}
          <Text style={styles.heroEmoji}>📚</Text>

          {/* Main Headline */}
          <Text
            style={[
              styles.heroTitle,
              {
                fontSize: titleSize,
                color: colors.white,
              },
            ]}
          >
            Learn Anything
          </Text>

          {/* Tagline */}
          <Text
            style={[
              styles.heroSubtitle,
              {
                fontSize: subtitleSize * 0.7,
                color: colors.white,
                opacity: 0.9,
              },
            ]}
          >
            Master any skill with AI-powered, adaptive learning paths
          </Text>
        </Animated.View>

        {/* Features Grid */}
        <View
          style={[
            styles.featuresSection,
            { paddingHorizontal: isSmallPhone ? Spacing.md : Spacing.lg },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text.primary, marginBottom: Spacing.lg },
            ]}
          >
            Why Choose Learn Anything?
          </Text>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.card.default,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: colors.text.primary },
                  ]}
                >
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: colors.text.secondary },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Social Proof / Stats Section */}
        <View
          style={[
            styles.statsSection,
            {
              backgroundColor: colors.card.default,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              500+
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Learning Topics
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              10K+
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Active Learners
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: colors.border },
            ]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              98%
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Satisfaction
            </Text>
          </View>
        </View>

        {/* Call to Action Section */}
        <View
          style={[
            styles.ctaSection,
            { paddingHorizontal: isSmallPhone ? Spacing.md : Spacing.lg },
          ]}
        >
          <Text
            style={[
              styles.ctaTitle,
              { color: colors.text.primary, marginBottom: Spacing.md },
            ]}
          >
            Ready to Start Learning?
          </Text>
          <Text
            style={[
              styles.ctaDescription,
              { color: colors.text.secondary, marginBottom: Spacing.lg },
            ]}
          >
            Join thousands of learners mastering new skills with AI-powered guidance.
          </Text>

          {/* Primary CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.ctaButtonText,
                { color: colors.white },
              ]}
            >
              Get Started
            </Text>
          </TouchableOpacity>

          {/* Secondary CTA */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                borderColor: colors.border,
              },
            ]}
            onPress={handleGetStarted}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.primary },
              ]}
            >
              Learn More
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Text */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: colors.text.tertiary },
            ]}
          >
            No credit card required • Start learning today
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    ...Typography.display.large,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    ...Typography.body.large,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  featuresSection: {
    paddingVertical: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.heading.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  featuresGrid: {
    gap: Spacing.md,
  },
  featureCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  featureTitle: {
    ...Typography.heading.h4,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  featureDescription: {
    ...Typography.body.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsSection: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.heading.h2,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.body.small,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.md,
  },
  ctaSection: {
    paddingVertical: Spacing.xl,
  },
  ctaTitle: {
    ...Typography.heading.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaDescription: {
    ...Typography.body.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonText: {
    ...Typography.button.large,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryButtonText: {
    ...Typography.button.medium,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.label.small,
    fontWeight: '500',
  },
});
