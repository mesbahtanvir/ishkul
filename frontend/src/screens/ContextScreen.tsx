import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '../components/Container';
import { Button } from '../components/Button';
import { useContextStore } from '../state/contextStore';
import { contextApi } from '../services/api';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { useScreenTracking } from '../services/analytics';
import { ContextChange, UserSkill } from '../types/app';

// Skill level display
const skillLevelDisplay: Record<string, { label: string; dots: number }> = {
  beginner: { label: 'Beginner', dots: 1 },
  intermediate: { label: 'Intermediate', dots: 2 },
  proficient: { label: 'Proficient', dots: 3 },
  expert: { label: 'Expert', dots: 4 },
};

// Skill intent icons
const skillIntentIcons: Record<string, string> = {
  know: '✓',
  improving: '📈',
  want_to_learn: '🎯',
};

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

  // Responsive values
  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );
  const cardPadding = responsive(Spacing.md, Spacing.lg, Spacing.lg, Spacing.xl);

  // Handle update button press
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
      const message = err instanceof Error ? err.message : 'Failed to update context';
      setError(message);
    } finally {
      setUpdating(false);
    }
  }, [inputText, context.parsed, setUpdating, setError, setPendingUpdate]);

  // Handle apply changes
  const handleApplyChanges = useCallback(async () => {
    if (!pendingUpdate) return;

    try {
      // Add to history
      const changeDescriptions = pendingUpdate.changes.map((c: ContextChange) => c.description);
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
      const message = err instanceof Error ? err.message : 'Failed to save context';
      setError(message);
    }
  }, [pendingUpdate, inputText, addInputToHistory, applyPendingUpdate, setError]);

  // Handle cancel changes
  const handleCancelChanges = useCallback(() => {
    setPendingUpdate(null);
    setShowChanges(false);
  }, [setPendingUpdate]);

  // Check if context is empty
  const isContextEmpty =
    !context.parsed.professional.role &&
    context.parsed.skills.length === 0 &&
    context.parsed.interests.length === 0;

  // Render skill dots
  const renderSkillDots = (level: string) => {
    const { dots } = skillLevelDisplay[level] || { dots: 0 };
    return (
      <View style={styles.dotsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= dots ? colors.primary : colors.gray300,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Get skill intent color
  const getSkillIntentColor = (intent: string) => {
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

  // Render compact skill item
  const renderSkill = (skill: UserSkill, index: number) => {
    const intentColor = getSkillIntentColor(skill.intent);
    const { dots } = skillLevelDisplay[skill.level] || { dots: 0 };

    return (
      <View
        key={`${skill.name}-${index}`}
        style={styles.skillItem}
      >
        <View style={styles.skillItemHeader}>
          <View style={styles.skillNameRow}>
            <Text style={[styles.skillItemName, { color: colors.text.primary }]}>
              {skill.name}
            </Text>
            <Text style={[styles.skillIntentBadge, { color: intentColor }]}>
              {skillIntentIcons[skill.intent] || ''}
            </Text>
          </View>
          <Text style={[styles.skillLevelLabel, { color: colors.text.secondary }]}>
            {skillLevelDisplay[skill.level]?.label || skill.level}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.skillProgressBar, { backgroundColor: colors.gray200 }]}>
          <View
            style={[
              styles.skillProgressFill,
              {
                backgroundColor: intentColor,
                width: `${(dots / 4) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Target level if improving */}
        {skill.intent !== 'know' && skill.targetLevel && (
          <Text style={[styles.skillTargetText, { color: colors.text.tertiary }]}>
            Goal: {skillLevelDisplay[skill.targetLevel]?.label || skill.targetLevel}
          </Text>
        )}

        {/* Context note */}
        {skill.context && (
          <Text style={[styles.skillContextText, { color: colors.text.tertiary }]} numberOfLines={2}>
            {skill.context}
          </Text>
        )}
      </View>
    );
  };

  // Render change item
  const renderChange = (change: ContextChange, index: number) => {
    const iconMap = {
      added: { icon: 'add-circle', color: colors.success },
      updated: { icon: 'create', color: colors.primary },
      removed: { icon: 'remove-circle', color: colors.danger },
    };
    const { icon, color } = iconMap[change.type];

    return (
      <View
        key={`change-${index}`}
        style={[styles.changeItem, { backgroundColor: colors.background.tertiary }]}
      >
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
        <View style={styles.changeContent}>
          <Text style={[styles.changeType, { color }]}>
            {change.type.toUpperCase()}
          </Text>
          <Text style={[styles.changeDescription, { color: colors.text.primary }]}>
            {change.description}
          </Text>
        </View>
      </View>
    );
  };

  // Render changes section
  const renderChangesSection = () => {
    if (!showChanges || !pendingUpdate) return null;

    return (
      <View style={[styles.changesSection, { backgroundColor: colors.card.default }]}>
        <Text style={[styles.changesTitle, { color: colors.text.primary }]}>
          Changes Detected
        </Text>
        <View style={styles.changesList}>
          {pendingUpdate.changes.length > 0 ? (
            pendingUpdate.changes.map(renderChange)
          ) : (
            <Text style={[styles.noChanges, { color: colors.text.secondary }]}>
              No changes detected from your input.
            </Text>
          )}
        </View>
        <View style={styles.changesActions}>
          <View style={styles.actionButton}>
            <Button
              title="Cancel"
              onPress={handleCancelChanges}
              variant="outline"
              size="medium"
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              title="Apply Changes"
              onPress={handleApplyChanges}
              disabled={pendingUpdate.changes.length === 0}
              size="medium"
            />
          </View>
        </View>
      </View>
    );
  };

  // Empty state
  if (isContextEmpty && !showChanges) {
    return (
      <Container>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.emptyStateContainer}>
            {/* Hero illustration area */}
            <View style={[styles.emptyHero, { backgroundColor: colors.primary + '10' }]}>
              <Text style={styles.emptyHeroEmoji}>🧠</Text>
              <Text style={[styles.emptyHeroTitle, { color: colors.text.primary }]}>
                Help me personalize your learning
              </Text>
              <Text style={[styles.emptyHeroSubtitle, { color: colors.text.secondary }]}>
                Tell me about yourself and I'll tailor courses just for you
              </Text>
            </View>

            {/* Main input card */}
            <View style={[styles.emptyInputCard, { backgroundColor: colors.card.default }]}>
              <Text style={[styles.emptyInputLabel, { color: colors.text.primary }]}>
                ✨ Tell me about yourself
              </Text>
              <TextInput
                style={[
                  styles.emptyTextInput,
                  {
                    backgroundColor: colors.background.secondary,
                    color: colors.text.primary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="I'm a software engineer with 5 years of experience..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                value={inputText}
                onChangeText={setInputText}
                textAlignVertical="top"
              />

              <View style={styles.emptyExamplesSection}>
                <Text style={[styles.emptyExamplesLabel, { color: colors.text.secondary }]}>
                  Things you can mention:
                </Text>
                <View style={styles.emptyExampleChips}>
                  <View style={[styles.exampleChip, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.exampleChipText, { color: colors.primary }]}>💼 Your role & experience</Text>
                  </View>
                  <View style={[styles.exampleChip, { backgroundColor: colors.success + '15' }]}>
                    <Text style={[styles.exampleChipText, { color: colors.success }]}>🎯 What you want to learn</Text>
                  </View>
                  <View style={[styles.exampleChip, { backgroundColor: colors.warning + '15' }]}>
                    <Text style={[styles.exampleChipText, { color: colors.warning }]}>⚡ Skills you have</Text>
                  </View>
                  <View style={[styles.exampleChip, { backgroundColor: colors.info + '15' }]}>
                    <Text style={[styles.exampleChipText, { color: colors.info }]}>📚 How you prefer to learn</Text>
                  </View>
                </View>
              </View>

              <Button
                title="Save My Context"
                onPress={handleUpdate}
                loading={updating}
                disabled={updating || !inputText.trim()}
                size="large"
              />

              {error && (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              )}
            </View>
          </View>

          {renderChangesSection()}
        </ScrollView>
      </Container>
    );
  }

  // Populated state
  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            My Context
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            This helps personalize your learning experience
          </Text>
        </View>

        {/* Add More Context Card */}
        <View style={[styles.addContextCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
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
            onChangeText={setInputText}
            textAlignVertical="top"
          />
          <View style={styles.addContextActions}>
            <Button
              title="Update Context"
              onPress={handleUpdate}
              loading={updating}
              disabled={updating || !inputText.trim()}
              size="medium"
            />
          </View>
          {error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          )}
        </View>

        {/* What I Know About You Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🧠</Text>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              What I Know About You
            </Text>
          </View>

          {/* Profile Summary Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card.default }]}>
            {/* Professional Info */}
            {(context.parsed.professional.role || context.parsed.professional.company) && (
              <View style={styles.profileSection}>
                <View style={styles.profileRow}>
                  <Text style={styles.profileIcon}>💼</Text>
                  <View style={styles.profileContent}>
                    <Text style={[styles.profilePrimary, { color: colors.text.primary }]}>
                      {context.parsed.professional.role || 'Professional'}
                      {context.parsed.professional.company &&
                        ` at ${context.parsed.professional.company}`}
                    </Text>
                    {context.parsed.professional.yearsExperience && (
                      <Text style={[styles.profileSecondary, { color: colors.text.secondary }]}>
                        {context.parsed.professional.yearsExperience} years experience
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Location */}
            {(context.parsed.location.current || context.parsed.location.journey?.length) && (
              <View style={styles.profileSection}>
                <View style={styles.profileRow}>
                  <Text style={styles.profileIcon}>📍</Text>
                  <Text style={[styles.profilePrimary, { color: colors.text.primary }]}>
                    {context.parsed.location.journey?.length
                      ? context.parsed.location.journey.join(' → ')
                      : context.parsed.location.current}
                  </Text>
                </View>
              </View>
            )}

            {/* Personality */}
            {context.parsed.personality && (
              <View style={styles.profileSection}>
                <View style={styles.profileRow}>
                  <Text style={styles.profileIcon}>🎭</Text>
                  <Text style={[styles.profilePrimary, { color: colors.text.primary }]}>
                    {context.parsed.personality}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Skills Section */}
          {context.parsed.skills.length > 0 && (
            <View style={styles.contextSection}>
              <View style={styles.contextSectionHeader}>
                <Text style={styles.contextSectionIcon}>⚡</Text>
                <Text style={[styles.contextSectionTitle, { color: colors.text.primary }]}>
                  Skills
                </Text>
              </View>
              <View style={[styles.skillsContainer, { backgroundColor: colors.card.default }]}>
                {context.parsed.skills.map(renderSkill)}
              </View>
            </View>
          )}

          {/* Goals Section */}
          {context.parsed.goals.length > 0 && (
            <View style={styles.contextSection}>
              <View style={styles.contextSectionHeader}>
                <Text style={styles.contextSectionIcon}>🎯</Text>
                <Text style={[styles.contextSectionTitle, { color: colors.text.primary }]}>
                  Goals
                </Text>
              </View>
              <View style={styles.tagsContainer}>
                {context.parsed.goals.map((goal, index) => (
                  <View
                    key={`goal-${index}`}
                    style={[styles.goalTag, { backgroundColor: colors.success + '15' }]}
                  >
                    <Text style={[styles.goalTagText, { color: colors.success }]}>
                      {goal}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Interests Section */}
          {context.parsed.interests.length > 0 && (
            <View style={styles.contextSection}>
              <View style={styles.contextSectionHeader}>
                <Text style={styles.contextSectionIcon}>💡</Text>
                <Text style={[styles.contextSectionTitle, { color: colors.text.primary }]}>
                  Interests
                </Text>
              </View>
              <View style={styles.tagsContainer}>
                {context.parsed.interests.map((interest, index) => (
                  <View
                    key={`interest-${index}`}
                    style={[styles.interestTag, { backgroundColor: colors.primary + '15' }]}
                  >
                    <Text style={[styles.interestTagText, { color: colors.primary }]}>
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Learning Preferences Section */}
          {(context.parsed.preferences.learningStyle ||
            context.parsed.preferences.studyTime ||
            context.parsed.preferences.sessionLength) && (
            <View style={styles.contextSection}>
              <View style={styles.contextSectionHeader}>
                <Text style={styles.contextSectionIcon}>📚</Text>
                <Text style={[styles.contextSectionTitle, { color: colors.text.primary }]}>
                  Learning Preferences
                </Text>
              </View>
              <View style={[styles.preferencesCard, { backgroundColor: colors.card.default }]}>
                {context.parsed.preferences.learningStyle && (
                  <View style={styles.preferenceItem}>
                    <Text style={[styles.preferenceLabel, { color: colors.text.secondary }]}>Style</Text>
                    <Text style={[styles.preferenceValue, { color: colors.text.primary }]}>
                      {context.parsed.preferences.learningStyle}
                    </Text>
                  </View>
                )}
                {context.parsed.preferences.studyTime && (
                  <View style={styles.preferenceItem}>
                    <Text style={[styles.preferenceLabel, { color: colors.text.secondary }]}>Best Time</Text>
                    <Text style={[styles.preferenceValue, { color: colors.text.primary }]}>
                      {context.parsed.preferences.studyTime}
                    </Text>
                  </View>
                )}
                {context.parsed.preferences.sessionLength && (
                  <View style={styles.preferenceItem}>
                    <Text style={[styles.preferenceLabel, { color: colors.text.secondary }]}>Session Length</Text>
                    <Text style={[styles.preferenceValue, { color: colors.text.primary }]}>
                      {context.parsed.preferences.sessionLength}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Auto-derived Stats */}
        {(context.derived.completedCourses > 0 || context.derived.currentStreak > 0 || context.derived.avgQuizScore > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📊</Text>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Your Learning Stats
              </Text>
            </View>
            <View style={styles.statsGrid}>
              {context.derived.currentStreak > 0 && (
                <View style={[styles.statItem, { backgroundColor: colors.warning + '15' }]}>
                  <Text style={styles.statEmoji}>🔥</Text>
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {context.derived.currentStreak}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Day Streak</Text>
                </View>
              )}
              {context.derived.avgQuizScore > 0 && (
                <View style={[styles.statItem, { backgroundColor: colors.success + '15' }]}>
                  <Text style={styles.statEmoji}>⚡</Text>
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {context.derived.avgQuizScore}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Avg Score</Text>
                </View>
              )}
              {context.derived.completedCourses > 0 && (
                <View style={[styles.statItem, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={styles.statEmoji}>📚</Text>
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {context.derived.completedCourses}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Courses</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Last updated */}
        {context.updatedAt > 0 && (
          <Text style={[styles.lastUpdated, { color: colors.text.tertiary }]}>
            Last updated: {new Date(context.updatedAt).toLocaleDateString()}
          </Text>
        )}

        {renderChangesSection()}
      </ScrollView>
    </Container>
  );
};

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

  // Empty State - New Design
  emptyStateContainer: {
    flex: 1,
  },
  emptyHero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.xl,
    marginBottom: Spacing.lg,
  },
  emptyHeroEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyHeroTitle: {
    ...Typography.heading.h2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyHeroSubtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
  },
  emptyInputCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  emptyInputLabel: {
    ...Typography.heading.h4,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  emptyTextInput: {
    minHeight: 120,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  emptyExamplesSection: {
    marginBottom: Spacing.lg,
  },
  emptyExamplesLabel: {
    ...Typography.label.small,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  emptyExampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exampleChip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Spacing.borderRadius.md,
  },
  exampleChipText: {
    ...Typography.body.small,
    fontWeight: '500',
  },

  // Add Context Card (Populated State)
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

  // Profile Card
  profileCard: {
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

  // Context Sections (Skills, Goals, etc.)
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
  skillItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  skillItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  skillNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  skillItemName: {
    ...Typography.body.medium,
    fontWeight: '500',
  },
  skillIntentBadge: {
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  skillLevelLabel: {
    ...Typography.body.small,
  },
  skillProgressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  skillProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  skillTargetText: {
    ...Typography.body.small,
    marginTop: 2,
  },
  skillContextText: {
    ...Typography.body.small,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalTag: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.full,
  },
  goalTagText: {
    ...Typography.body.small,
    fontWeight: '600',
  },
  interestTag: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.full,
  },
  interestTagText: {
    ...Typography.body.small,
    fontWeight: '500',
  },

  // Preferences Card
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

  // Stats Grid
  statsGrid: {
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

  // Error text
  errorText: {
    ...Typography.body.small,
    marginTop: Spacing.sm,
  },

  // Changes section
  changesSection: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  changesTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  changesList: {
    marginBottom: Spacing.md,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  changeContent: {
    flex: 1,
  },
  changeType: {
    ...Typography.label.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeDescription: {
    ...Typography.body.medium,
  },
  noChanges: {
    ...Typography.body.medium,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  changesActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },

  // Last updated
  lastUpdated: {
    ...Typography.body.small,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  // Legacy styles (kept for compatibility)
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
