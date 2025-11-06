import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';

type HomeScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Welcome! 🎉
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {user?.displayName || user?.email}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              You've successfully logged in to your cross-platform app built with Expo and
              Firebase.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Getting Started
            </Text>
            <Text variant="bodyMedium" style={styles.cardText}>
              This is a base template with authentication, navigation, and Firebase integration.
              You can now start building your app features!
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Features Included
            </Text>
            <Text variant="bodyMedium" style={styles.cardText}>
              ✓ Firebase Authentication{'\n'}
              ✓ Firestore Database{'\n'}
              ✓ Cloud Storage{'\n'}
              ✓ React Navigation{'\n'}
              ✓ TypeScript Support{'\n'}
              ✓ Cross-platform (iOS, Android, Web)
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('Profile')}
          style={styles.button}
          icon="account"
        >
          View Profile
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 12,
    color: '#666',
  },
  description: {
    lineHeight: 22,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardText: {
    lineHeight: 24,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
});

export default HomeScreen;
