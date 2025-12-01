import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { ErrorBanner } from '../components/ErrorBanner';
import { ApiError, ErrorCodes } from '../services/api';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

type AuthMode = 'login' | 'register';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [showPassword, setShowPassword] = useState(false);

  // Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Refs for input focus
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Clear errors when switching modes
  useEffect(() => {
    setErrorMessage(null);
    setEmailError(null);
    setPasswordError(null);
    setNameError(null);
  }, [authMode]);

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const idToken = response.params?.id_token;
        if (idToken) {
          await handleSignInWithIdToken(idToken);
        } else {
          console.error('No ID token in response');
          setErrorMessage('Unable to complete Google sign-in. Please try again.');
        }
      } else if (response?.type === 'error') {
        console.error('Auth error:', response.error);
        setErrorMessage('Google sign-in failed. Please try again.');
      }
    };

    handleAuthResponse();
  }, [response]);

  const handleSignInWithIdToken = async (idToken: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const user = await signInWithGoogleIdToken(idToken);
      setUser(user);

      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      navigation.replace('Main');
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (configError) {
      setErrorMessage(configError);
      return;
    }

    setErrorMessage(null);
    if (request) {
      await promptAsync();
    }
  };

  // Validate email format on blur
  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError(null);
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  // Validate password on blur
  const validatePassword = () => {
    if (!password) {
      setPasswordError(null);
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  // Validate name on blur (only for register)
  const validateName = () => {
    if (authMode !== 'register') return true;
    if (!displayName.trim()) {
      setNameError(null);
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleEmailAuth = async () => {
    // Clear previous errors
    setErrorMessage(null);
    setEmailError(null);
    setPasswordError(null);
    setNameError(null);

    // Validate all fields
    let hasError = false;

    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (authMode === 'register' && !displayName.trim()) {
      setNameError('Name is required');
      hasError = true;
    }

    if (hasError) {
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

      if (error instanceof ApiError) {
        // Handle specific error codes with field-specific errors
        switch (error.code) {
          case ErrorCodes.INVALID_EMAIL:
            setEmailError(error.message);
            break;
          case ErrorCodes.WEAK_PASSWORD:
            setPasswordError(error.message);
            break;
          case ErrorCodes.EMAIL_EXISTS:
            // Show as banner with suggestion to sign in
            setErrorMessage(error.message);
            break;
          case ErrorCodes.INVALID_CREDENTIALS:
          case ErrorCodes.TOO_MANY_REQUESTS:
          case ErrorCodes.NETWORK_ERROR:
          default:
            setErrorMessage(error.message);
            break;
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    // Don't clear the email/password - preserve user input
  };

  const dismissError = () => {
    setErrorMessage(null);
  };

  // Responsive values
  const emojiSize = responsive(36, 42, 48, 52);
  const titleSize = responsive(28, 32, 36, 40);
  const subtitleSize = responsive(14, 16, 18, 20);

  // Get input border color based on error state
  const getInputBorderColor = (hasError: boolean) => {
    return hasError ? colors.danger : colors.border;
  };

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

          {/* Error Banner */}
          <ErrorBanner
            message={errorMessage}
            type="error"
            onDismiss={dismissError}
            showDismiss={true}
          />

          <View style={styles.formSection}>
            {authMode === 'register' && (
              <View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: getInputBorderColor(!!nameError),
                    }
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.text.tertiary}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (nameError) setNameError(null);
                  }}
                  onBlur={validateName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
                {nameError && (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>{nameError}</Text>
                )}
              </View>
            )}

            <View>
              <TextInput
                ref={emailInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: getInputBorderColor(!!emailError),
                  }
                ]}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                }}
                onBlur={validateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              {emailError && (
                <Text style={[styles.fieldError, { color: colors.danger }]}>{emailError}</Text>
              )}
            </View>

            <View>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: getInputBorderColor(!!passwordError),
                    }
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(null);
                  }}
                  onBlur={validatePassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleEmailAuth}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.passwordToggleText, { color: colors.text.tertiary }]}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text style={[styles.fieldError, { color: colors.danger }]}>{passwordError}</Text>
              )}
            </View>

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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60, // Space for toggle button
  },
  passwordToggle: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldError: {
    ...Typography.label.small,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
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
