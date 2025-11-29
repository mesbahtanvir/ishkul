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
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser, setUserDocument, setLoading } = useUserStore();
  const { request, response, promptAsync, configError } = useGoogleAuth();
  const { responsive, isSmallPhone } = useResponsive();

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

      // Always navigate to Main - the Home screen will show empty state for new users
      navigation.replace('Main');
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (configError) {
      Alert.alert('Configuration Error', configError, [{ text: 'OK' }]);
      return;
    }

    if (request) {
      await promptAsync();
    }
  };

  // Responsive values
  const emojiSize = responsive(48, 56, 64, 72);
  const titleSize = responsive(36, 42, 48, 52);
  const subtitleSize = responsive(16, 18, 20, 22);

  return (
    <View style={styles.container}>
      <Container padding="none" scrollable>
        <View style={styles.content}>
          <View style={styles.topSection}>
            <Text style={[styles.emoji, { fontSize: emojiSize }]}>🎓</Text>
          </View>

          <View style={styles.middleSection}>
            <Text style={[styles.title, { fontSize: titleSize }]}>Ishkul</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Learn anything</Text>
          </View>

          <View style={[styles.bottomSection, isSmallPhone && styles.bottomSectionSmall]}>
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
    minHeight: '100%',
  },
  topSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  emoji: {
    // fontSize set dynamically
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
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
  bottomSectionSmall: {
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  googleButton: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.borderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: Spacing.buttonHeight.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    ...Typography.button.medium,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  termsText: {
    ...Typography.label.medium,
    fontWeight: '400',
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
