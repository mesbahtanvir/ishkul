import React, { useEffect, useRef } from 'react';
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
import { signInWithGoogleIdToken, useGoogleAuth } from '../services/auth';
import { userApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';
import { ErrorBanner } from '../components/ErrorBanner';
import { useScreenTracking, useAnalytics } from '../services/analytics';
import { useEmailAuth } from '../hooks/useEmailAuth';
import {
  validateEmailOnBlur,
  validatePasswordOnBlur,
  validateLoginForm,
  validateRegisterForm,
  hasFormErrors,
} from '../utils/validation';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  useScreenTracking('Login', 'LoginScreen');
  const { trackLogin } = useAnalytics();
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { request, response, promptAsync, configError } = useGoogleAuth();
  const { responsive, isSmallPhone } = useResponsive();
  const { colors } = useTheme();

  // Use the email auth hook for login/register logic
  const {
    authMode,
    toggleAuthMode,
    isSubmitting,
    errors,
    setFieldError,
    setGeneralError,
    handleAuth,
  } = useEmailAuth(() => navigation.replace('Main'));

  // Local form state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // Refs for input focus
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Handle Google sign-in response
  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const idToken = response.params?.id_token;
        if (idToken) {
          await handleSignInWithIdToken(idToken);
        } else {
          console.error('No ID token in response');
          setGeneralError('Unable to complete Google sign-in. Please try again.');
        }
      } else if (response?.type === 'error') {
        console.error('Auth error:', response.error);
        setGeneralError('Google sign-in failed. Please try again.');
      }
    };

    handleAuthResponse();
  }, [response, setGeneralError]);

  const handleSignInWithIdToken = async (idToken: string) => {
    try {
      setLoading(true);
      setGeneralError(null);
      const user = await signInWithGoogleIdToken(idToken);
      setUser(user);

      // Track Google login
      await trackLogin({ method: 'google' });

      const userDoc = await userApi.getUserDocument();
      setUserDocument(userDoc);

      navigation.replace('Main');
    } catch (error) {
      console.error('Sign in error:', error);
      setGeneralError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (configError) {
      setGeneralError(configError);
      return;
    }

    setGeneralError(null);
    if (request) {
      await promptAsync();
    }
  };

  // Validate email format on blur
  const handleEmailBlur = () => {
    const result = validateEmailOnBlur(email);
    setFieldError('email', result.error);
  };

  // Validate password on blur
  const handlePasswordBlur = () => {
    const result = validatePasswordOnBlur(password);
    setFieldError('password', result.error);
  };

  // Validate name on blur (only for register)
  const handleNameBlur = () => {
    // For now, no specific validation on blur for name
  };

  // Handle form submission
  const handleEmailAuth = async () => {
    // Validate all fields using centralized validation
    const formErrors =
      authMode === 'login'
        ? validateLoginForm({ email, password })
        : validateRegisterForm({ email, password, displayName });

    // Set field errors
    setFieldError('email', formErrors.email);
    setFieldError('password', formErrors.password);
    if (formErrors.displayName !== undefined) {
      setFieldError('name', formErrors.displayName);
    }

    // Stop if there are validation errors
    if (hasFormErrors(formErrors)) {
      return;
    }

    // Delegate to auth hook
    await handleAuth(email, password, displayName);
  };

  const dismissError = () => {
    setGeneralError(null);
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
            message={errors.message}
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
                      borderColor: getInputBorderColor(!!errors.nameError),
                    }
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.text.tertiary}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (errors.nameError) setFieldError('name', null);
                  }}
                  onBlur={handleNameBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
                {errors.nameError && (
                  <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.nameError}</Text>
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
                    borderColor: getInputBorderColor(!!errors.emailError),
                  }
                ]}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.emailError) setFieldError('email', null);
                }}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              {errors.emailError && (
                <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.emailError}</Text>
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
                      borderColor: getInputBorderColor(!!errors.passwordError),
                    }
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.passwordError) setFieldError('password', null);
                  }}
                  onBlur={handlePasswordBlur}
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
              {errors.passwordError && (
                <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.passwordError}</Text>
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
