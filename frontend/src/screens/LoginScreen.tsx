import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { useUserStore } from '../state/userStore';
import { signInWithGoogleIdToken, useGoogleAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { request, response, promptAsync, configError } = useGoogleAuth();

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        // Get the ID token from the response params
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

      // Send ID token to backend for validation and get session tokens
      const user = await signInWithGoogleIdToken(idToken);

      setUser(user);

      // Fetch user document from backend
      const userDoc = await getUserDocument();
      setUserDocument(userDoc);

      // Navigate based on whether user has completed onboarding
      if (!userDoc || !userDoc.goal) {
        navigation.replace('GoalSelection');
      } else {
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    // Check if Google OAuth is properly configured
    if (configError) {
      Alert.alert(
        'Configuration Error',
        configError,
        [{ text: 'OK' }]
      );
      return;
    }

    if (request) {
      await promptAsync();
    }
  };

  return (
    <View style={styles.container}>
      <Container padding="none" scrollable>
        <View style={styles.content}>
          {/* Top Section - Logo */}
          <View style={styles.topSection}>
            <Text style={styles.emoji}>🎓</Text>
          </View>

          {/* Middle Section - Content */}
          <View style={styles.middleSection}>
            <Text style={styles.title}>Ishkul</Text>
            <Text style={styles.subtitle}>Learn anything</Text>
          </View>

          {/* Bottom Section - CTA */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                !request && styles.googleButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={!request}
              activeOpacity={0.7}
            >
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms and Privacy Policy
            </Text>
          </View>
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  topSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  emoji: {
    fontSize: 56,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  googleButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  termsText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
