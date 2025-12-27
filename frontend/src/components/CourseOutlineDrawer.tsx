import React, { useRef, useEffect } from 'react';
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
import { CourseOutline, Lesson, LessonPosition } from '../types/app';
import { OutlineSectionCard } from './outline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 400);

interface CourseOutlineDrawerProps {
  visible: boolean;
  onClose: () => void;
  outline: CourseOutline | null;
  currentPosition?: LessonPosition | null;
  onLessonPress?: (sectionIndex: number, lessonIndex: number, lesson: Lesson) => void;
}

export const CourseOutlineDrawer: React.FC<CourseOutlineDrawerProps> = ({
  visible,
  onClose,
  outline,
  currentPosition,
  onLessonPress,
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

  if (!outline || !outline.sections) return null;

  const totalLessons = outline.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedLessons = outline.sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.status === 'completed').length,
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
                {completedLessons} of {totalLessons} lessons completed
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
                {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
              </Text>
            </View>
            <View style={[styles.overallProgressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.overallProgressFill,
                  {
                    width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.overallStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  {outline.sections.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                  Sections
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  {totalLessons}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                  Lessons
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

          {/* Sections list */}
          <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
            {outline.sections.map((section, sectionIndex) => (
              <OutlineSectionCard
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                isCurrentSection={currentPosition?.sectionIndex === sectionIndex}
                currentLessonIndex={
                  currentPosition?.sectionIndex === sectionIndex
                    ? currentPosition.lessonIndex
                    : null
                }
                onLessonPress={(lessonIndex, lesson) =>
                  onLessonPress?.(sectionIndex, lessonIndex, lesson)
                }
                variant="drawer"
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
  sectionsList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});

export default CourseOutlineDrawer;
