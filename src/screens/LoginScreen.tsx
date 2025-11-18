import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Alert } from 'react-native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useUserStore } from '../state/userStore';
import { signInWithGoogle, signInWithGoogleMobile, useGoogleAuth } from '../services/auth';
import { getUserDocument } from '../services/memory';

interface LoginScreenProps {
  navigation: any;
}

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

        // Navigate based on whether user has a profile
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

        // Navigate based on whether user has a profile
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
    <Container>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎓</Text>
          <Text style={styles.title}>Learning AI</Text>
          <Text style={styles.subtitle}>
            Your personal adaptive learning companion
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Continue with Google"
            onPress={handleSignIn}
            disabled={Platform.OS !== 'web' && !request}
          />
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
});
