/**
 * ProfileSection Component
 *
 * Displays user profile information (role, company, location, personality).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ParsedContext } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// =============================================================================
// Types
// =============================================================================

interface ProfileSectionProps {
  professional: ParsedContext['professional'];
  location: ParsedContext['location'];
  personality?: string;
}

interface ProfileRowProps {
  icon: string;
  primary: string;
  secondary?: string;
}

// =============================================================================
// ProfileRow Component
// =============================================================================

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, primary, secondary }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.profileSection}>
      <View style={styles.profileRow}>
        <Text style={styles.profileIcon}>{icon}</Text>
        <View style={styles.profileContent}>
          <Text style={[styles.profilePrimary, { color: colors.text.primary }]}>
            {primary}
          </Text>
          {secondary && (
            <Text style={[styles.profileSecondary, { color: colors.text.secondary }]}>
              {secondary}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// ProfileSection Component
// =============================================================================

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  professional,
  location,
  personality,
}) => {
  const { colors } = useTheme();

  const hasProfessionalInfo = professional.role || professional.company;
  const hasLocationInfo = location.current || location.journey?.length;

  if (!hasProfessionalInfo && !hasLocationInfo && !personality) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card.default }]}>
      {/* Professional Info */}
      {hasProfessionalInfo && (
        <ProfileRow
          icon="💼"
          primary={`${professional.role || 'Professional'}${
            professional.company ? ` at ${professional.company}` : ''
          }`}
          secondary={
            professional.yearsExperience
              ? `${professional.yearsExperience} years experience`
              : undefined
          }
        />
      )}

      {/* Location */}
      {hasLocationInfo && (
        <ProfileRow
          icon="📍"
          primary={
            location.journey?.length
              ? location.journey.join(' → ')
              : location.current || ''
          }
        />
      )}

      {/* Personality */}
      {personality && <ProfileRow icon="🎭" primary={personality} />}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  profileSection: {
    marginBottom: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  profileContent: {
    flex: 1,
  },
  profilePrimary: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  profileSecondary: {
    ...Typography.body.small,
    marginTop: 2,
  },
});
