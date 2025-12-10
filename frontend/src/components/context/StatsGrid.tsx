/**
 * StatsGrid Component
 *
 * Displays learning statistics in a grid layout.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DerivedContext } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// =============================================================================
// Types
// =============================================================================

interface StatsGridProps {
  derived: DerivedContext;
}

interface StatItemProps {
  emoji: string;
  value: string | number;
  label: string;
  colorKey: 'warning' | 'success' | 'primary';
}

// =============================================================================
// StatItem Component
// =============================================================================

const StatItem: React.FC<StatItemProps> = ({ emoji, value, label, colorKey }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.statItem, { backgroundColor: colors[colorKey] + '15' }]}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: colors.text.primary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>
    </View>
  );
};

// =============================================================================
// StatsGrid Component
// =============================================================================

export const StatsGrid: React.FC<StatsGridProps> = ({ derived }) => {
  const { colors } = useTheme();

  const hasStats =
    derived.completedCourses > 0 ||
    derived.currentStreak > 0 ||
    derived.avgQuizScore > 0;

  if (!hasStats) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>📊</Text>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Your Learning Stats
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        {derived.currentStreak > 0 && (
          <StatItem
            emoji="🔥"
            value={derived.currentStreak}
            label="Day Streak"
            colorKey="warning"
          />
        )}
        {derived.avgQuizScore > 0 && (
          <StatItem
            emoji="⚡"
            value={`${derived.avgQuizScore}%`}
            label="Avg Score"
            colorKey="success"
          />
        )}
        {derived.completedCourses > 0 && (
          <StatItem
            emoji="📚"
            value={derived.completedCourses}
            label="Courses"
            colorKey="primary"
          />
        )}
      </View>
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Spacing.borderRadius.lg,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.heading.h3,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.body.small,
    textAlign: 'center',
  },
});
