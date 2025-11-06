import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Card, Avatar, Divider } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services';

type ProfileScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await authService.logout();
            // Navigation will happen automatically via useAuth hook
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleSendVerificationEmail = async () => {
    setLoading(true);
    try {
      await authService.sendEmailVerification();
      Alert.alert('Email Sent', 'Verification email has been sent to your email address.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <Card style={styles.card}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name}>
              {user?.displayName || 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user?.email}
            </Text>
          </Card.Content>
        </Card>

        {/* Account Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Account Information
            </Text>
            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                User ID:
              </Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {user?.uid}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                Email:
              </Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {user?.email}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                Email Verified:
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.infoValue,
                  { color: user?.emailVerified ? '#4caf50' : '#f44336' },
                ]}
              >
                {user?.emailVerified ? 'Yes ✓' : 'No ✗'}
              </Text>
            </View>

            {!user?.emailVerified && (
              <Button
                mode="outlined"
                onPress={handleSendVerificationEmail}
                loading={loading}
                disabled={loading}
                style={styles.verifyButton}
              >
                Send Verification Email
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Account Actions
            </Text>
            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => Alert.alert('Coming Soon', 'Edit profile feature coming soon!')}
              style={styles.actionButton}
              icon="pencil"
            >
              Edit Profile
            </Button>

            <Button
              mode="outlined"
              onPress={() => Alert.alert('Coming Soon', 'Change password feature coming soon!')}
              style={styles.actionButton}
              icon="lock-reset"
            >
              Change Password
            </Button>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="contained"
          onPress={handleLogout}
          loading={loading}
          disabled={loading}
          style={styles.logoutButton}
          buttonColor="#f44336"
          icon="logout"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    backgroundColor: '#6200ee',
    marginBottom: 12,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  verifyButton: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 6,
  },
});

export default ProfileScreen;
