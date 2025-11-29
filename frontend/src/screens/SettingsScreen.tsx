import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useUserStore } from '../state/userStore';
import { signOut } from '../services/auth';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../types/navigation';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, clearUser } = useUserStore();
  const [darkMode, setDarkMode] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      setLoading(true);
      await signOut();
      clearUser();
      setShowLogoutDialog(false);
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
      setShowLogoutDialog(false);
    }
  };

  const cancelLogout = () => {
    if (!loading) {
      setShowLogoutDialog(false);
    }
  };

  // Responsive values
  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || '?';
  };

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, isSmallPhone && styles.sectionSmall]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            {user?.displayName && (
              <Text style={styles.profileName}>{user.displayName}</Text>
            )}
            <Text style={styles.profileEmail}>{user?.email || 'Not available'}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, isSmallPhone && styles.sectionSmall]}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Use dark theme throughout the app
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.switch.trackOff, true: Colors.switch.trackOn }}
              thumbColor={Colors.switch.thumb}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Text style={styles.settingDescription}>
                Get reminded to practice every day
              </Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: Colors.switch.trackOff, true: Colors.switch.trackOn }}
              thumbColor={Colors.switch.thumb}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, isSmallPhone && styles.sectionSmall]}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, styles.lastRow]}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>Production</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            loading={loading}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with care for learners</Text>
        </View>
      </ScrollView>

      {/* Custom Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to access your learning progress."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        destructive
        loading={loading}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerSmall: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.display.medium,
    color: Colors.text.primary,
  },
  profileSection: {
    backgroundColor: Colors.card.default,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading.h3,
    color: Colors.white,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.body.large,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionSmall: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    color: Colors.ios.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  settingRow: {
    backgroundColor: Colors.card.default,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingLabel: {
    ...Typography.body.medium,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    ...Typography.label.medium,
    color: Colors.ios.gray,
  },
  aboutRow: {
    backgroundColor: Colors.card.default,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: Spacing.borderRadius.md,
    borderTopRightRadius: Spacing.borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  lastRow: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: Spacing.borderRadius.md,
    borderBottomRightRadius: Spacing.borderRadius.md,
    borderBottomWidth: 0,
  },
  aboutLabel: {
    ...Typography.body.medium,
    color: Colors.text.primary,
  },
  aboutValue: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.label.small,
    color: Colors.text.tertiary,
  },
});
