/**
 * SkillItem Component
 *
 * Displays a single skill with level, intent, and progress visualization.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserSkill } from '../../types/app';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';

// =============================================================================
// Constants
// =============================================================================

const SKILL_LEVEL_DISPLAY: Record<string, { label: string; dots: number }> = {
  beginner: { label: 'Beginner', dots: 1 },
  intermediate: { label: 'Intermediate', dots: 2 },
  proficient: { label: 'Proficient', dots: 3 },
  expert: { label: 'Expert', dots: 4 },
};

const SKILL_INTENT_ICONS: Record<string, string> = {
  know: '✓',
  improving: '📈',
  want_to_learn: '🎯',
};

// =============================================================================
// Types
// =============================================================================

interface SkillItemProps {
  skill: UserSkill;
}

// =============================================================================
// Component
// =============================================================================

export const SkillItem: React.FC<SkillItemProps> = ({ skill }) => {
  const { colors } = useTheme();

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'know':
        return colors.success;
      case 'improving':
        return colors.primary;
      case 'want_to_learn':
        return colors.warning;
      default:
        return colors.text.secondary;
    }
  };

  const intentColor = getIntentColor(skill.intent);
  const { dots } = SKILL_LEVEL_DISPLAY[skill.level] || { dots: 0 };
  const progressWidth = `${(dots / 4) * 100}%` as const;

  return (
    <View style={styles.container}>
      {/* Header: Name, Intent Icon, Level */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text.primary }]}>
            {skill.name}
          </Text>
          <Text style={[styles.intentBadge, { color: intentColor }]}>
            {SKILL_INTENT_ICONS[skill.intent] || ''}
          </Text>
        </View>
        <Text style={[styles.levelLabel, { color: colors.text.secondary }]}>
          {SKILL_LEVEL_DISPLAY[skill.level]?.label || skill.level}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: intentColor,
              width: progressWidth,
            },
          ]}
        />
      </View>

      {/* Target Level (if improving) */}
      {skill.intent !== 'know' && skill.targetLevel && (
        <Text style={[styles.targetText, { color: colors.text.tertiary }]}>
          Goal: {SKILL_LEVEL_DISPLAY[skill.targetLevel]?.label || skill.targetLevel}
        </Text>
      )}

      {/* Context Note */}
      {skill.context && (
        <Text
          style={[styles.contextText, { color: colors.text.tertiary }]}
          numberOfLines={2}
        >
          {skill.context}
        </Text>
      )}
    </View>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  intentBadge: {
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  levelLabel: {
    ...Typography.body.small,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  targetText: {
    ...Typography.body.small,
    marginTop: 2,
  },
  contextText: {
    ...Typography.body.small,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
