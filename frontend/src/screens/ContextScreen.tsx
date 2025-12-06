import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '../components/Container';
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
    setContext,
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
                  i <= dots ? colors.ios.blue : colors.ios.lightGray,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Render skill card
  const renderSkill = (skill: UserSkill, index: number) => (
    <View
      key={`${skill.name}-${index}`}
      style={[styles.skillCard, { backgroundColor: colors.card.default }]}
    >
      <View style={styles.skillHeader}>
        <Text style={[styles.skillName, { color: colors.text.primary }]}>
          {skill.name}
        </Text>
        <Text style={styles.skillIntent}>
          {skillIntentIcons[skill.intent] || ''}
        </Text>
      </View>
      <View style={styles.skillLevel}>
        {renderSkillDots(skill.level)}
        <Text style={[styles.skillLevelText, { color: colors.ios.gray }]}>
          {skillLevelDisplay[skill.level]?.label || skill.level}
        </Text>
      </View>
      {skill.intent !== 'know' && skill.targetLevel && (
        <View style={styles.targetLevel}>
          <Text style={[styles.targetLabel, { color: colors.ios.gray }]}>
            Goal:{' '}
          </Text>
          <Text style={[styles.targetValue, { color: colors.ios.blue }]}>
            {skillLevelDisplay[skill.targetLevel]?.label || skill.targetLevel}
          </Text>
        </View>
      )}
      {skill.context && (
        <Text style={[styles.skillContext, { color: colors.ios.gray }]}>
          {skill.context}
        </Text>
      )}
    </View>
  );

  // Render change item
  const renderChange = (change: ContextChange, index: number) => {
    const iconMap = {
      added: { icon: 'add-circle', color: colors.success },
      updated: { icon: 'create', color: colors.ios.blue },
      removed: { icon: 'remove-circle', color: colors.danger },
    };
    const { icon, color } = iconMap[change.type];

    return (
      <View
        key={`change-${index}`}
        style={[styles.changeItem, { backgroundColor: colors.card.default }]}
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

  // Render changes modal/section
  const renderChangesSection = () => {
    if (!showChanges || !pendingUpdate) return null;

    return (
      <View style={[styles.changesSection, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.changesTitle, { color: colors.text.primary }]}>
          Changes Detected
        </Text>
        <ScrollView style={styles.changesList}>
          {pendingUpdate.changes.length > 0 ? (
            pendingUpdate.changes.map(renderChange)
          ) : (
            <Text style={[styles.noChanges, { color: colors.ios.gray }]}>
              No changes detected from your input.
            </Text>
          )}
        </ScrollView>
        <View style={styles.changesActions}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.ios.gray }]}
            onPress={handleCancelChanges}
          >
            <Text style={[styles.cancelButtonText, { color: colors.ios.gray }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: colors.ios.blue },
              pendingUpdate.changes.length === 0 && styles.disabledButton,
            ]}
            onPress={handleApplyChanges}
            disabled={pendingUpdate.changes.length === 0}
          >
            <Text style={styles.applyButtonText}>Apply Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Empty state
  if (isContextEmpty && !showChanges) {
    return (
      <Container>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
            <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
              My Context
            </Text>
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Tell us about yourself
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.ios.gray }]}>
              Write anything - your job, skills, goals, background.{'\n'}
              AI will understand and use it to personalize your courses.
            </Text>
          </View>

          <View style={[styles.inputSection, { padding: cardPadding }]}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.card.default,
                  color: colors.text.primary,
                  borderColor: colors.ios.lightGray,
                },
              ]}
              placeholder="Start typing..."
              placeholderTextColor={colors.ios.gray}
              multiline
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: colors.ios.blue },
                updating && styles.disabledButton,
              ]}
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.updateButtonText}>Update</Text>
                </>
              )}
            </TouchableOpacity>

            {error && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            )}
          </View>

          <View style={styles.examples}>
            <Text style={[styles.examplesTitle, { color: colors.ios.gray }]}>
              Examples:
            </Text>
            <Text style={[styles.exampleText, { color: colors.ios.gray }]}>
              • "Software engineer, 5 years experience"
            </Text>
            <Text style={[styles.exampleText, { color: colors.ios.gray }]}>
              • "Know Java well, want to learn Python"
            </Text>
            <Text style={[styles.exampleText, { color: colors.ios.gray }]}>
              • "Career goal: become a tech lead"
            </Text>
            <Text style={[styles.exampleText, { color: colors.ios.gray }]}>
              • "INFP, prefer hands-on learning"
            </Text>
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
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>
            My Context
          </Text>
        </View>

        {/* Input Section */}
        <View style={[styles.inputCard, { backgroundColor: colors.card.default, padding: cardPadding }]}>
          <Text style={[styles.inputLabel, { color: colors.ios.gray }]}>
            Tell me about yourself
          </Text>
          <TextInput
            style={[
              styles.textInputSmall,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
                borderColor: colors.ios.lightGray,
              },
            ]}
            placeholder="Add more context..."
            placeholderTextColor={colors.ios.gray}
            multiline
            value={inputText}
            onChangeText={setInputText}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.updateButtonSmall,
              { backgroundColor: colors.ios.blue },
              (updating || !inputText.trim()) && styles.disabledButton,
            ]}
            onPress={handleUpdate}
            disabled={updating || !inputText.trim()}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.updateButtonTextSmall}>Update</Text>
              </>
            )}
          </TouchableOpacity>
          {error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          )}
        </View>

        {/* Parsed Context Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Parsed Context
          </Text>

          {/* Professional Info */}
          {(context.parsed.professional.role || context.parsed.professional.company) && (
            <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
              {context.parsed.professional.role && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>💼</Text>
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>
                    {context.parsed.professional.role}
                    {context.parsed.professional.company &&
                      ` at ${context.parsed.professional.company}`}
                  </Text>
                </View>
              )}
              {context.parsed.professional.yearsExperience && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>⏱️</Text>
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>
                    {context.parsed.professional.yearsExperience} years experience
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Location */}
          {(context.parsed.location.current || context.parsed.location.journey?.length) && (
            <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={[styles.infoText, { color: colors.text.primary }]}>
                  {context.parsed.location.journey?.length
                    ? context.parsed.location.journey.join(' → ')
                    : context.parsed.location.current}
                </Text>
              </View>
            </View>
          )}

          {/* Personality */}
          {context.parsed.personality && (
            <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🧠</Text>
                <Text style={[styles.infoText, { color: colors.text.primary }]}>
                  {context.parsed.personality}
                </Text>
              </View>
            </View>
          )}

          {/* Skills */}
          {context.parsed.skills.length > 0 && (
            <View style={styles.subsection}>
              <Text style={[styles.subsectionTitle, { color: colors.text.secondary }]}>
                SKILLS
              </Text>
              <View style={styles.skillsGrid}>
                {context.parsed.skills.map(renderSkill)}
              </View>
            </View>
          )}

          {/* Interests */}
          {context.parsed.interests.length > 0 && (
            <View style={styles.subsection}>
              <Text style={[styles.subsectionTitle, { color: colors.text.secondary }]}>
                INTERESTS
              </Text>
              <View style={styles.tagsContainer}>
                {context.parsed.interests.map((interest, index) => (
                  <View
                    key={`interest-${index}`}
                    style={[styles.tag, { backgroundColor: colors.badge.primary }]}
                  >
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Goals */}
          {context.parsed.goals.length > 0 && (
            <View style={styles.subsection}>
              <Text style={[styles.subsectionTitle, { color: colors.text.secondary }]}>
                GOALS
              </Text>
              <View style={styles.tagsContainer}>
                {context.parsed.goals.map((goal, index) => (
                  <View
                    key={`goal-${index}`}
                    style={[styles.tag, { backgroundColor: colors.ios.green + '20' }]}
                  >
                    <Text style={[styles.tagText, { color: colors.ios.green }]}>
                      🎯 {goal}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Preferences */}
          {(context.parsed.preferences.learningStyle ||
            context.parsed.preferences.studyTime) && (
            <View style={styles.subsection}>
              <Text style={[styles.subsectionTitle, { color: colors.text.secondary }]}>
                PREFERENCES
              </Text>
              <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
                {context.parsed.preferences.learningStyle && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🛠️</Text>
                    <Text style={[styles.infoText, { color: colors.text.primary }]}>
                      {context.parsed.preferences.learningStyle} learning
                    </Text>
                  </View>
                )}
                {context.parsed.preferences.studyTime && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🕐</Text>
                    <Text style={[styles.infoText, { color: colors.text.primary }]}>
                      Studies in the {context.parsed.preferences.studyTime}
                    </Text>
                  </View>
                )}
                {context.parsed.preferences.sessionLength && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>⏱️</Text>
                    <Text style={[styles.infoText, { color: colors.text.primary }]}>
                      Prefers {context.parsed.preferences.sessionLength} sessions
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Auto-derived Section */}
        {context.derived.completedCourses > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Auto-detected
            </Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card.default }]}>
              {context.derived.currentStreak > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🔥</Text>
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>
                    {context.derived.currentStreak}-day learning streak
                  </Text>
                </View>
              )}
              {context.derived.avgQuizScore > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>⚡</Text>
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>
                    {context.derived.avgQuizScore}% avg quiz score
                  </Text>
                </View>
              )}
              {context.derived.completedCourses > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📚</Text>
                  <Text style={[styles.infoText, { color: colors.text.primary }]}>
                    {context.derived.completedCourses} courses completed
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Last updated */}
        {context.updatedAt > 0 && (
          <Text style={[styles.lastUpdated, { color: colors.ios.gray }]}>
            Last updated: {new Date(context.updatedAt).toLocaleDateString()}
          </Text>
        )}

        {renderChangesSection()}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  headerSmall: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.display.medium,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.heading.h2,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  // Input section
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputCard: {
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  textInput: {
    minHeight: 150,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  textInputSmall: {
    minHeight: 80,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Typography.body.medium,
    marginBottom: Spacing.md,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.sm,
  },
  updateButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.xs,
    alignSelf: 'flex-end',
  },
  updateButtonText: {
    color: '#FFFFFF',
    ...Typography.body.medium,
    fontWeight: '600',
  },
  updateButtonTextSmall: {
    color: '#FFFFFF',
    ...Typography.body.small,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    ...Typography.body.small,
    marginTop: Spacing.sm,
  },
  // Examples
  examples: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  examplesTitle: {
    ...Typography.label.medium,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  exampleText: {
    ...Typography.body.small,
    marginBottom: Spacing.xs,
  },
  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  subsection: {
    marginTop: Spacing.md,
  },
  subsectionTitle: {
    ...Typography.label.small,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  // Info cards
  infoCard: {
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  infoText: {
    ...Typography.body.medium,
    flex: 1,
  },
  // Skills
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skillCard: {
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    minWidth: 140,
    flex: 1,
    maxWidth: '48%',
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  skillName: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  skillIntent: {
    fontSize: 14,
  },
  skillLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillLevelText: {
    ...Typography.body.small,
  },
  targetLevel: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  targetLabel: {
    ...Typography.body.small,
  },
  targetValue: {
    ...Typography.body.small,
    fontWeight: '600',
  },
  skillContext: {
    ...Typography.body.small,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Spacing.borderRadius.full,
  },
  tagText: {
    ...Typography.body.small,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Changes section
  changesSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Spacing.borderRadius.lg,
    borderTopRightRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '60%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  changesTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  changesList: {
    maxHeight: 200,
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
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.body.medium,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    ...Typography.body.medium,
    fontWeight: '600',
  },
  lastUpdated: {
    ...Typography.body.small,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
