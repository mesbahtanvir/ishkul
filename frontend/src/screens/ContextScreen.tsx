/**
 * ContextScreen
 *
 * Main screen for managing user learning context. Supports:
 * - Empty state for new users (onboarding)
 * - Populated state for users with existing context
 * - Context updates with change detection
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import {
  EmptyContextState,
  ChangesList,
  ProfileSection,
  SkillItem,
  StatsGrid,
} from '../components/context';
import { useContextStore } from '../state/contextStore';
import { contextApi } from '../services/api';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { useScreenTracking } from '../services/analytics';

// =============================================================================
// Main Component
// =============================================================================

export const ContextScreen: React.FC = () => {
  useScreenTracking('Context', 'ContextScreen');

  const { colors } = useTheme();
  const { responsive, isSmallPhone } = useResponsive();

  const {
    context,
    updating,
    pendingUpdate,
    error,
    setUpdating,
    setPendingUpdate,
    setError,
    applyPendingUpdate,
    addInputToHistory,
  } = useContextStore();

  const [inputText, setInputText] = useState('');
  const [showChanges, setShowChanges] = useState(false);

  // Responsive title size
  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );

  // Check if context is empty
  const isContextEmpty =
    !context.parsed.professional.role &&
    context.parsed.skills.length === 0 &&
    context.parsed.interests.length === 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleUpdate = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some context about yourself');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const response = await contextApi.updateContext(
        context.parsed,
        inputText.trim()
      );
      setPendingUpdate(response);
      setShowChanges(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update context';
      setError(message);
    } finally {
      setUpdating(false);
    }
  }, [inputText, context.parsed, setUpdating, setError, setPendingUpdate]);

  const handleApplyChanges = useCallback(async () => {
    if (!pendingUpdate) return;

    try {
      // Add to history
      const changeDescriptions = pendingUpdate.changes.map((c) => c.description);
      addInputToHistory(inputText.trim(), changeDescriptions);

      // Apply the update locally
      applyPendingUpdate();

      // Save to backend
      const updatedContext = useContextStore.getState().context;
      await contextApi.applyContext(updatedContext);

      // Clear input and close changes view
      setInputText('');
      setShowChanges(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save context';
      setError(message);
    }
  }, [pendingUpdate, inputText, addInputToHistory, applyPendingUpdate, setError]);

  const handleCancelChanges = useCallback(() => {
    setPendingUpdate(null);
    setShowChanges(false);
  }, [setPendingUpdate]);

  // ---------------------------------------------------------------------------
  // Empty State
  // ---------------------------------------------------------------------------

  if (isContextEmpty && !showChanges) {
    return (
      <Container>
        <ScrollView showsVerticalScrollIndicator={false}>
          <EmptyContextState
            inputText={inputText}
            onInputChange={setInputText}
            onSubmit={handleUpdate}
            isLoading={updating}
            error={error}
          />

          {showChanges && pendingUpdate && (
            <ChangesList
              changes={pendingUpdate.changes}
              onApply={handleApplyChanges}
              onCancel={handleCancelChanges}
            />
          )}
        </ScrollView>
      </Container>
    );
  }

  // ---------------------------------------------------------------------------
  // Populated State
  // ---------------------------------------------------------------------------

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text
            style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}
          >
            My Context
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            This helps personalize your learning experience
          </Text>
        </View>

        {/* Add Context Input Card */}
        <AddContextCard
          inputText={inputText}
          onInputChange={setInputText}
          onSubmit={handleUpdate}
          isLoading={updating}
          error={error}
          colors={colors}
        />

        {/* What I Know About You Section */}
        <View style={styles.section}>
          <SectionHeader icon="🧠" title="What I Know About You" colors={colors} />

          <ProfileSection
            professional={context.parsed.professional}
            location={context.parsed.location}
            personality={context.parsed.personality}
          />

          {/* Skills */}
          {context.parsed.skills.length > 0 && (
            <ContextSubsection icon="⚡" title="Skills" colors={colors}>
              <View
                style={[styles.skillsContainer, { backgroundColor: colors.card.default }]}
              >
                {context.parsed.skills.map((skill, index) => (
                  <SkillItem key={`${skill.name}-${index}`} skill={skill} />
                ))}
              </View>
            </ContextSubsection>
          )}

          {/* Goals */}
          {context.parsed.goals.length > 0 && (
            <ContextSubsection icon="🎯" title="Goals" colors={colors}>
              <TagList
                items={context.parsed.goals}
                color={colors.success}
                keyPrefix="goal"
              />
            </ContextSubsection>
          )}

          {/* Interests */}
          {context.parsed.interests.length > 0 && (
            <ContextSubsection icon="💡" title="Interests" colors={colors}>
              <TagList
                items={context.parsed.interests}
                color={colors.primary}
                keyPrefix="interest"
              />
            </ContextSubsection>
          )}

          {/* Learning Preferences */}
          <LearningPreferences
            preferences={context.parsed.preferences}
            colors={colors}
          />
        </View>

        {/* Stats Grid */}
        <StatsGrid derived={context.derived} />

        {/* Last Updated */}
        {context.updatedAt > 0 && (
          <Text style={[styles.lastUpdated, { color: colors.text.tertiary }]}>
            Last updated: {new Date(context.updatedAt).toLocaleDateString()}
          </Text>
        )}

        {/* Changes Section */}
        {showChanges && pendingUpdate && (
          <ChangesList
            changes={pendingUpdate.changes}
            onApply={handleApplyChanges}
            onCancel={handleCancelChanges}
          />
        )}
      </ScrollView>
    </Container>
  );
};

// =============================================================================
// Sub-Components
// =============================================================================

interface SectionHeaderProps {
  icon: string;
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
  </View>
);

interface ContextSubsectionProps {
  icon: string;
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}

const ContextSubsection: React.FC<ContextSubsectionProps> = ({
  icon,
  title,
  colors,
  children,
}) => (
  <View style={styles.contextSection}>
    <View style={styles.contextSectionHeader}>
      <Text style={styles.contextSectionIcon}>{icon}</Text>
      <Text style={[styles.contextSectionTitle, { color: colors.text.primary }]}>
        {title}
      </Text>
    </View>
    {children}
  </View>
);

interface TagListProps {
  items: string[];
  color: string;
  keyPrefix: string;
}

const TagList: React.FC<TagListProps> = ({ items, color, keyPrefix }) => (
  <View style={styles.tagsContainer}>
    {items.map((item, index) => (
      <View
        key={`${keyPrefix}-${index}`}
        style={[styles.tag, { backgroundColor: color + '15' }]}
      >
        <Text style={[styles.tagText, { color }]}>{item}</Text>
      </View>
    ))}
  </View>
);

interface AddContextCardProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  colors: ReturnType<typeof useTheme>['colors'];
}

const AddContextCard: React.FC<AddContextCardProps> = ({
  inputText,
  onInputChange,
  onSubmit,
  isLoading,
  error,
  colors,
}) => (
  <View
    style={[
      styles.addContextCard,
      { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' },
    ]}
  >
    <View style={styles.addContextHeader}>
      <Text style={styles.addContextIcon}>✨</Text>
      <Text style={[styles.addContextTitle, { color: colors.text.primary }]}>
        Add more about yourself
      </Text>
    </View>
    <TextInput
      style={[
        styles.addContextInput,
        {
          backgroundColor: colors.card.default,
          color: colors.text.primary,
          borderColor: colors.border,
        },
      ]}
      placeholder="I recently started learning React Native..."
      placeholderTextColor={colors.text.tertiary}
      multiline
      value={inputText}
      onChangeText={onInputChange}
      textAlignVertical="top"
    />
    <View style={styles.addContextActions}>
      <Button
        title="Update Context"
        onPress={onSubmit}
        loading={isLoading}
        disabled={isLoading || !inputText.trim()}
        size="medium"
      />
    </View>
    {error && (
      <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
    )}
  </View>
);

interface LearningPreferencesProps {
  preferences: {
    learningStyle?: string;
    studyTime?: string;
    sessionLength?: string;
  };
  colors: ReturnType<typeof useTheme>['colors'];
}

const LearningPreferences: React.FC<LearningPreferencesProps> = ({
  preferences,
  colors,
}) => {
  const hasPreferences =
    preferences.learningStyle ||
    preferences.studyTime ||
    preferences.sessionLength;

  if (!hasPreferences) return null;

  return (
    <ContextSubsection icon="📚" title="Learning Preferences" colors={colors}>
      <View style={[styles.preferencesCard, { backgroundColor: colors.card.default }]}>
        {preferences.learningStyle && (
          <PreferenceItem
            label="Style"
            value={preferences.learningStyle}
            colors={colors}
          />
        )}
        {preferences.studyTime && (
          <PreferenceItem
            label="Best Time"
            value={preferences.studyTime}
            colors={colors}
          />
        )}
        {preferences.sessionLength && (
          <PreferenceItem
            label="Session Length"
            value={preferences.sessionLength}
            colors={colors}
          />
        )}
      </View>
    </ContextSubsection>
  );
};

interface PreferenceItemProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

const PreferenceItem: React.FC<PreferenceItemProps> = ({ label, value, colors }) => (
  <View style={styles.preferenceItem}>
    <Text style={[styles.preferenceLabel, { color: colors.text.secondary }]}>
      {label}
    </Text>
    <Text style={[styles.preferenceValue, { color: colors.text.primary }]}>
      {value}
    </Text>
  </View>
);

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    marginBottom: Spacing.lg,
  },
  headerSmall: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.display.medium,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body.medium,
  },

  // Sections
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

  // Context Sections
  contextSection: {
    marginTop: Spacing.lg,
  },
  contextSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  contextSectionIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  contextSectionTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
  },

  // Skills Container
  skillsContainer: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.full,
  },
  tagText: {
    ...Typography.body.small,
    fontWeight: '500',
  },

  // Add Context Card
  addContextCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  addContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addContextIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  addContextTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  addContextInput: {
    minHeight: 80,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  addContextActions: {
    alignItems: 'flex-start',
  },

  // Preferences
  preferencesCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  preferenceLabel: {
    ...Typography.body.small,
  },
  preferenceValue: {
    ...Typography.body.medium,
    fontWeight: '500',
  },

  // Error & Last Updated
  errorText: {
    ...Typography.body.small,
    marginTop: Spacing.sm,
  },
  lastUpdated: {
    ...Typography.body.small,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
