import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUserStore } from '../state/userStore';
import { signInWithGoogleIdToken, signInWithEmail, registerWithEmail, useGoogleAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

type AuthMode = 'login' | 'register';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { request, response, promptAsync, configError } = useGoogleAuth();
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const idToken = response.params?.id_token;
        if (idToken) {
          await handleSignInWithIdToken(idToken);
        } else {
          console.error('No ID token in response');
          Alert.alert('Error', 'Authentication failed. Please try again.');
        }
      } else if (response?.type === 'error') {
        console.error('Auth error:', response.error);
        Alert.alert('Error', 'Authentication failed. Please try again.');
      }
    };

    handleAuthResponse();
  }, [response]);

  const handleSignInWithIdToken = async (idToken: string) => {
    try {
      setLoading(true);
      const user = await signInWithGoogleIdToken(idToken);
      setUser(user);

      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      navigation.replace('Main');
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (configError) {
      Alert.alert('Configuration Error', configError, [{ text: 'OK' }]);
      return;
    }

    if (request) {
      await promptAsync();
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (authMode === 'register' && !displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setLoading(true);

      let user;
      if (authMode === 'login') {
        user = await signInWithEmail(email.trim(), password);
      } else {
        user = await registerWithEmail(email.trim(), password, displayName.trim());
      }

      setUser(user);
      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      navigation.replace('Main');
    } catch (error) {
      console.error('Email auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  // Responsive values
  const emojiSize = responsive(36, 42, 48, 52);
  const titleSize = responsive(28, 32, 36, 40);
  const subtitleSize = responsive(14, 16, 18, 20);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topSection}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>🎓</Text>
            <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>Ishkul</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleSize, color: colors.text.secondary }]}>
              {authMode === 'login' ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          <View style={styles.formSection}>
            {authMode === 'register' && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: colors.border,
                  }
                ]}
                placeholder="Full Name"
                placeholderTextColor={colors.text.tertiary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border,
                }
              ]}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border,
                }
              ]}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleEmailAuth}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {isSubmitting
                  ? (authMode === 'login' ? 'Signing in...' : 'Creating account...')
                  : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleAuthMode} activeOpacity={0.7}>
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {authMode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerSection}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.bottomSection, isSmallPhone && styles.bottomSectionSmall]}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: colors.border,
                },
                !request && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={!request}
              activeOpacity={0.7}
            >
              <Text style={[styles.googleButtonText, { color: colors.text.primary }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <Text style={[styles.termsText, { color: colors.text.tertiary }]}>
              By continuing, you agree to our Terms and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '400',
    textAlign: 'center',
  },
  formSection: {
    gap: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  primaryButton: {
    borderRadius: Spacing.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: Spacing.buttonHeight.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.button.medium,
    letterSpacing: 0.3,
  },
  toggleText: {
    ...Typography.body.medium,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.label.medium,
    marginHorizontal: Spacing.md,
  },
  bottomSection: {
    gap: Spacing.lg,
  },
  bottomSectionSmall: {
    gap: Spacing.md,
  },
  googleButton: {
    borderRadius: Spacing.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: Spacing.buttonHeight.large,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  googleButtonText: {
    ...Typography.button.medium,
    letterSpacing: 0.3,
  },
  termsText: {
    ...Typography.label.medium,
    fontWeight: '400',
    textAlign: 'center',
  },
});
