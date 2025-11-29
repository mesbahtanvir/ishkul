import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useUserStore } from '../state/userStore';
import { signOut } from '../services/auth';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../theme/colors';
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
  const { colors, themeMode, setThemeMode } = useTheme();
  const [dailyReminder, setDailyReminder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { responsive, isSmallPhone } = useResponsive();

  // Theme mode options
  const themeModes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

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
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.card.default }, isSmallPhone && styles.sectionSmall]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.white }]}>{getInitials()}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            {user?.displayName && (
              <Text style={[styles.profileName, { color: colors.text.primary }]}>{user.displayName}</Text>
            )}
            <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>{user?.email || 'Not available'}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, isSmallPhone && styles.sectionSmall]}>
          <Text style={[styles.sectionTitle, { color: colors.ios.gray }]}>Appearance</Text>

          <View style={[styles.themeSelector, { backgroundColor: colors.card.default }]}>
            {themeModes.map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.themeOption,
                  themeMode === mode.value && { backgroundColor: colors.primary },
                ]}
                onPress={() => setThemeMode(mode.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === mode.value ? colors.white : colors.text.primary },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.ios.gray, marginTop: Spacing.lg }]}>Notifications</Text>

          <View style={[styles.settingRow, { backgroundColor: colors.card.default }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text.primary }]}>Daily Reminder</Text>
              <Text style={[styles.settingDescription, { color: colors.ios.gray }]}>
                Get reminded to practice every day
              </Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: colors.switch.trackOff, true: colors.switch.trackOn }}
              thumbColor={colors.switch.thumb}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, isSmallPhone && styles.sectionSmall]}>
          <Text style={[styles.sectionTitle, { color: colors.ios.gray }]}>About</Text>
          <View style={[styles.aboutRow, { backgroundColor: colors.card.default, borderBottomColor: colors.border }]}>
            <Text style={[styles.aboutLabel, { color: colors.text.primary }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.text.secondary }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, styles.lastRow, { backgroundColor: colors.card.default }]}>
            <Text style={[styles.aboutLabel, { color: colors.text.primary }]}>Build</Text>
            <Text style={[styles.aboutValue, { color: colors.text.secondary }]}>Production</Text>
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
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>Made with care for learners</Text>
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
  },
  profileSection: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading.h3,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.body.large,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    ...Typography.body.medium,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.xs,
  },
  themeOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.sm,
    alignItems: 'center',
  },
  themeOptionText: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  settingRow: {
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
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    ...Typography.label.medium,
  },
  aboutRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: Spacing.borderRadius.md,
    borderTopRightRadius: Spacing.borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
  aboutValue: {
    ...Typography.body.medium,
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
  },
});
