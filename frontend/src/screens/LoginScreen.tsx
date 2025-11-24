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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { signInWithGoogle, signInWithGoogleMobile, useGoogleAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
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
                Platform.OS !== 'web' && !request && styles.googleButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={Platform.OS !== 'web' && !request}
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
