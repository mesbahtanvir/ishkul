import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { signInWithGoogle, signInWithGoogleMobile, useGoogleAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

interface LoginScreenProps {
  navigation: any;
}

const { height } = Dimensions.get('window');

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleMobileSignIn(authentication?.idToken || '');
    }
  }, [response]);

  const handleWebSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      if (user) {
        setUser(user);
        const userDoc = await getUserDocument(user.uid);
        setUserDocument(userDoc);

        if (!userDoc || !userDoc.goal) {
          navigation.replace('GoalSelection');
        } else {
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSignIn = async (idToken: string) => {
    try {
      setLoading(true);
      const user = await signInWithGoogleMobile(idToken);
      if (user) {
        setUser(user);
        const userDoc = await getUserDocument(user.uid);
        setUserDocument(userDoc);

        if (!userDoc || !userDoc.goal) {
          navigation.replace('GoalSelection');
        } else {
          navigation.replace('Main');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (Platform.OS === 'web') {
      await handleWebSignIn();
    } else {
      if (request) {
        await promptAsync();
      }
    }
  };

  return (
    <View style={styles.container}>
      <Container padding="medium" scrollable>
        <View style={styles.content}>
          {/* Hero Section - Minimalist */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.emoji}>🎓</Text>
            </View>

            <Text style={styles.title}>Ishkul</Text>
            <Text style={styles.tagline}>Learn smarter, faster</Text>

            <View style={styles.divider} />

            <Text style={styles.description}>
              Personalized adaptive learning powered by AI. Learn any skill at your own pace.
            </Text>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                Platform.OS !== 'web' && !request && styles.googleButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={Platform.OS !== 'web' && !request}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our Terms and Privacy Policy
              </Text>
            </View>
          </View>
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    ...Typography.display.large,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    ...Typography.body.large,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaSection: {
    gap: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: Spacing.buttonHeight.large,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  googleButtonText: {
    ...Typography.button.medium,
    color: Colors.text.primary,
  },
  termsContainer: {
    marginTop: Spacing.md,
  },
  termsText: {
    ...Typography.label.small,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
