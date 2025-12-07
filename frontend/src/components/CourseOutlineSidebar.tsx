import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { CourseOutline, OutlineModule, OutlineTopic, OutlinePosition } from '../types/app';

const SIDEBAR_WIDTH = 320;

interface CourseOutlineSidebarProps {
  outline: CourseOutline | null;
  currentPosition?: OutlinePosition | null;
  onTopicPress?: (moduleIndex: number, topicIndex: number, topic: OutlineTopic) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Tool ID to icon mapping
const getToolIcon = (toolId: string): string => {
  const icons: Record<string, string> = {
    lesson: '📖',
    quiz: '❓',
    practice: '💪',
    flashcard: '🎴',
    'inline-code-execution': '💻',
    pronunciation: '🎤',
    review: '🔄',
    summary: '📝',
  };
  return icons[toolId] || '📚';
};

// Status to style mapping
const getStatusStyle = (status: string, colors: ReturnType<typeof useTheme>['colors']) => {
  switch (status) {
    case 'completed':
      return { bg: colors.success + '20', text: colors.success, icon: '✓' };
    case 'in_progress':
      return { bg: colors.primary + '20', text: colors.primary, icon: '→' };
    case 'needs_review':
      return { bg: colors.warning + '20', text: colors.warning, icon: '!' };
    case 'skipped':
      return { bg: colors.ios.gray + '20', text: colors.ios.gray, icon: '–' };
    default:
      return { bg: 'transparent', text: colors.text.secondary, icon: '' };
  }
};

interface ModuleCardProps {
  module: OutlineModule;
  moduleIndex: number;
  isCurrentModule: boolean;
  currentTopicIndex: number | null;
  onTopicPress?: (topicIndex: number, topic: OutlineTopic) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  moduleIndex,
  isCurrentModule,
  currentTopicIndex,
  onTopicPress,
  colors,
}) => {
  const [expanded, setExpanded] = useState(isCurrentModule);
  const rotateAnim = useRef(new Animated.Value(isCurrentModule ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const completedTopics = module.topics.filter((t) => t.status === 'completed').length;
  const progress = module.topics.length > 0 ? (completedTopics / module.topics.length) * 100 : 0;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={[
      styles.moduleCard,
      { borderColor: colors.border },
      isCurrentModule && {
        borderColor: colors.primary + '4D', // 30% opacity
        backgroundColor: colors.primary + '08', // 3% opacity
      },
    ]}>
      <TouchableOpacity
        style={styles.moduleHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.moduleHeaderLeft}>
          <View
            style={[
              styles.moduleNumber,
              {
                backgroundColor:
                  module.status === 'completed'
                    ? colors.success
                    : isCurrentModule
                      ? colors.primary
                      : colors.ios.gray,
              },
            ]}
          >
            {module.status === 'completed' ? (
              <Text style={[styles.moduleNumberText, { color: colors.white }]}>✓</Text>
            ) : (
              <Text style={[styles.moduleNumberText, { color: colors.white }]}>{moduleIndex + 1}</Text>
            )}
          </View>
          <View style={styles.moduleInfo}>
            <Text
              style={[styles.moduleTitle, { color: colors.text.primary }]}
              numberOfLines={2}
            >
              {module.title}
            </Text>
            <View style={styles.moduleStats}>
              <Text style={[styles.moduleStatsText, { color: colors.text.secondary }]}>
                {completedTopics}/{module.topics.length} topics
              </Text>
              {module.estimatedMinutes > 0 && (
                <Text style={[styles.moduleStatsText, { color: colors.text.secondary }]}>
                  {' '}
                  • {module.estimatedMinutes} min
                </Text>
              )}
            </View>
            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: module.status === 'completed' ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <Animated.Text
          style={[
            styles.expandIcon,
            { color: colors.text.secondary, transform: [{ rotate: rotation }] },
          ]}
        >
          ▶
        </Animated.Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.topicsList, { borderTopColor: colors.divider }]}>
          {module.topics.map((topic, topicIndex) => {
            const isCurrentTopic =
              isCurrentModule && currentTopicIndex === topicIndex;
            const statusStyle = getStatusStyle(topic.status, colors);

            return (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicItem,
                  { borderBottomColor: colors.divider },
                  isCurrentTopic && {
                    backgroundColor: colors.primary + '10',
                    borderLeftColor: colors.primary,
                    borderLeftWidth: 3,
                  },
                ]}
                onPress={() => onTopicPress?.(topicIndex, topic)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.topicIcon,
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  {topic.status === 'completed' ? (
                    <Text style={[styles.topicIconText, { color: statusStyle.text }]}>
                      ✓
                    </Text>
                  ) : (
                    <Text style={styles.topicIconText}>{getToolIcon(topic.toolId)}</Text>
                  )}
                </View>
                <View style={styles.topicContent}>
                  <Text
                    style={[
                      styles.topicTitle,
                      {
                        color:
                          topic.status === 'completed'
                            ? colors.text.secondary
                            : colors.text.primary,
                      },
                      topic.status === 'completed' && styles.completedTopicTitle,
                    ]}
                    numberOfLines={2}
                  >
                    {topic.title}
                  </Text>
                  <View style={styles.topicMeta}>
                    <Text style={[styles.topicType, { color: colors.text.tertiary }]}>
                      {topic.toolId}
                    </Text>
                    {topic.estimatedMinutes > 0 && (
                      <Text style={[styles.topicDuration, { color: colors.text.tertiary }]}>
                        {topic.estimatedMinutes} min
                      </Text>
                    )}
                  </View>
                </View>
                {isCurrentTopic && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.currentBadgeText, { color: colors.white }]}>NOW</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export const CourseOutlineSidebar: React.FC<CourseOutlineSidebarProps> = ({
  outline,
  currentPosition,
  onTopicPress,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { colors } = useTheme();

  if (!outline) return null;

  const totalTopics = outline.modules.reduce((sum, m) => sum + m.topics.length, 0);
  const completedTopics = outline.modules.reduce(
    (sum, m) => sum + m.topics.filter((t) => t.status === 'completed').length,
    0
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Collapsed view - just show a thin bar with toggle
  if (collapsed) {
    return (
      <View style={[styles.collapsedSidebar, { backgroundColor: colors.background.secondary, borderRightColor: colors.border }]}>
        <TouchableOpacity
          style={styles.collapseToggle}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
        >
          <Text style={[styles.collapseIcon, { color: colors.primary }]}>»</Text>
        </TouchableOpacity>
        <View style={styles.collapsedProgress}>
          <Text style={[styles.collapsedProgressText, { color: colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.background.secondary, borderRightColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Course Outline
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            {completedTopics} of {totalTopics} topics completed
          </Text>
        </View>
        {onToggleCollapse && (
          <TouchableOpacity
            style={styles.collapseButton}
            onPress={onToggleCollapse}
            activeOpacity={0.7}
          >
            <Text style={[styles.collapseIcon, { color: colors.primary }]}>«</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Overall progress */}
      <View style={[styles.overallProgress, { backgroundColor: colors.background.primary }]}>
        <View style={styles.overallProgressHeader}>
          <Text style={[styles.overallProgressTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {outline.title}
          </Text>
          <Text style={[styles.overallProgressPercent, { color: colors.primary }]}>
            {progressPercent}%
          </Text>
        </View>
        <View style={[styles.overallProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.overallProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.overallStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {outline.modules.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Modules
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {totalTopics}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Topics
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>
              {Math.round(outline.estimatedMinutes / 60)}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
              Total
            </Text>
          </View>
        </View>
      </View>

      {/* Modules list */}
      <ScrollView style={styles.modulesList} showsVerticalScrollIndicator={false}>
        {outline.modules.map((module, moduleIndex) => (
          <ModuleCard
            key={module.id}
            module={module}
            moduleIndex={moduleIndex}
            isCurrentModule={currentPosition?.moduleIndex === moduleIndex}
            currentTopicIndex={
              currentPosition?.moduleIndex === moduleIndex
                ? currentPosition.topicIndex
                : null
            }
            onTopicPress={(topicIndex, topic) =>
              onTopicPress?.(moduleIndex, topicIndex, topic)
            }
            colors={colors}
          />
        ))}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    height: '100%',
  },
  collapsedSidebar: {
    width: 48,
    borderRightWidth: 1,
    height: '100%',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  collapseToggle: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  collapsedProgress: {
    transform: [{ rotate: '-90deg' }],
    marginTop: Spacing.xl,
  },
  collapsedProgressText: {
    ...Typography.label.medium,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.heading.h4,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.body.small,
  },
  collapseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  collapseIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  overallProgress: {
    padding: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  overallProgressTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  overallProgressPercent: {
    ...Typography.heading.h4,
    fontWeight: '700',
  },
  overallProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.body.medium,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label.small,
  },
  modulesList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
  moduleCard: {
    marginBottom: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    overflow: 'hidden',
  },
  currentModuleCard: {
    // Colors applied inline with theme
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  moduleHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moduleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  moduleNumberText: {
    fontWeight: '700',
    fontSize: 11,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    ...Typography.body.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  moduleStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  moduleStatsText: {
    ...Typography.label.small,
    fontSize: 11,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  expandIcon: {
    fontSize: 10,
    marginLeft: Spacing.xs,
  },
  topicsList: {
    borderTopWidth: 1,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  topicIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  topicIconText: {
    fontSize: 14,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    ...Typography.label.medium,
    fontWeight: '500',
    marginBottom: 1,
  },
  completedTopicTitle: {
    textDecorationLine: 'line-through',
  },
  topicMeta: {
    flexDirection: 'row',
  },
  topicType: {
    ...Typography.label.small,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  topicDuration: {
    ...Typography.label.small,
    fontSize: 10,
    marginLeft: Spacing.xs,
  },
  currentBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});

export default CourseOutlineSidebar;
