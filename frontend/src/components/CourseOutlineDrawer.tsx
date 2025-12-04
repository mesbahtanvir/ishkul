import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { CourseOutline, OutlineModule, OutlineTopic, OutlinePosition } from '../types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 400);

interface CourseOutlineDrawerProps {
  visible: boolean;
  onClose: () => void;
  outline: CourseOutline | null;
  currentPosition?: OutlinePosition | null;
  onTopicPress?: (moduleIndex: number, topicIndex: number, topic: OutlineTopic) => void;
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
    <View style={[styles.moduleCard, isCurrentModule && styles.currentModuleCard]}>
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
              <Text style={styles.moduleNumberText}>✓</Text>
            ) : (
              <Text style={styles.moduleNumberText}>{moduleIndex + 1}</Text>
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
        <View style={styles.topicsList}>
          {module.topics.map((topic, topicIndex) => {
            const isCurrentTopic =
              isCurrentModule && currentTopicIndex === topicIndex;
            const statusStyle = getStatusStyle(topic.status, colors);

            return (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicItem,
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
                    <Text style={styles.currentBadgeText}>NOW</Text>
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

export const CourseOutlineDrawer: React.FC<CourseOutlineDrawerProps> = ({
  visible,
  onClose,
  outline,
  currentPosition,
  onTopicPress,
}) => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!outline) return null;

  const totalTopics = outline.modules.reduce((sum, m) => sum + m.topics.length, 0);
  const completedTopics = outline.modules.reduce(
    (sum, m) => sum + m.topics.filter((t) => t.status === 'completed').length,
    0
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.background.primary,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                Course Outline
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
                {completedTopics} of {totalTopics} topics completed
              </Text>
            </View>
          </View>

          {/* Overall progress */}
          <View style={[styles.overallProgress, { backgroundColor: colors.background.secondary }]}>
            <View style={styles.overallProgressHeader}>
              <Text style={[styles.overallProgressTitle, { color: colors.text.primary }]}>
                {outline.title}
              </Text>
              <Text style={[styles.overallProgressPercent, { color: colors.primary }]}>
                {Math.round((completedTopics / totalTopics) * 100)}%
              </Text>
            </View>
            <View style={[styles.overallProgressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.overallProgressFill,
                  {
                    width: `${(completedTopics / totalTopics) * 100}%`,
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
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.heading.h3,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...Typography.body.small,
  },
  overallProgress: {
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  overallProgressTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  overallProgressPercent: {
    ...Typography.heading.h3,
    fontWeight: '700',
  },
  overallProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.md,
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
    ...Typography.heading.h4,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.label.small,
  },
  modulesList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  moduleCard: {
    marginBottom: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  currentModuleCard: {
    borderColor: 'rgba(0, 122, 255, 0.3)',
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  moduleHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moduleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  moduleNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    ...Typography.body.medium,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleStats: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  moduleStatsText: {
    ...Typography.label.small,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandIcon: {
    fontSize: 12,
    marginLeft: Spacing.sm,
  },
  topicsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.03)',
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  topicIconText: {
    fontSize: 16,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    ...Typography.body.small,
    fontWeight: '500',
    marginBottom: 2,
  },
  completedTopicTitle: {
    textDecorationLine: 'line-through',
  },
  topicMeta: {
    flexDirection: 'row',
  },
  topicType: {
    ...Typography.label.small,
    textTransform: 'capitalize',
  },
  topicDuration: {
    ...Typography.label.small,
    marginLeft: Spacing.xs,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

export default CourseOutlineDrawer;
