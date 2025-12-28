import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Container } from '../components/Container';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CourseCard } from '../components/CourseCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { SegmentedControl, SegmentOption } from '../components/SegmentedControl';

import { useCoursesStore } from '../state/coursesStore';
import { useCoursesSubscription } from '../hooks/useCoursesSubscription';
import { coursesApi } from '../services/api';

import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

import { RootStackParamList } from '../types/navigation';
import { Course } from '../types/app';
import { useScreenTracking } from '../services/analytics';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

type TabValue = 'active' | 'completed' | 'archived';

interface EmptyStateConfig {
  emoji: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionTarget?: 'create' | 'active';
}

const EMPTY_STATES: Record<TabValue, EmptyStateConfig> = {
  active: {
    emoji: '📚',
    title: 'Start Your Learning Journey',
    subtitle: 'Create your first course and begin mastering new skills!',
    actionLabel: 'Create Course',
    actionTarget: 'create',
  },
  completed: {
    emoji: '🎓',
    title: 'No Completed Courses Yet',
    subtitle: 'Complete your first course to see it here. Keep learning!',
    actionLabel: 'Continue Learning',
    actionTarget: 'active',
  },
  archived: {
    emoji: '🗃️',
    title: 'No Archived Courses',
    subtitle: 'Archived courses will appear here. Archive courses you want to revisit later.',
  },
};

export const HomeScreen: React.FC = () => {
  useScreenTracking('Home', 'HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {
    courses,
    setActiveCourse,
    deleteCourse,
    archiveCourse,
    restoreCourse,
  } = useCoursesStore();
  const { colors } = useTheme();

  // Subscribe to courses via Firebase - this is the only data source
  const { isLoading } = useCoursesSubscription({
    onError: (err) => {
      console.error('Firebase courses subscription error:', err.message);
      if (Platform.OS === 'web') {
        window.alert('Failed to sync courses. Please try again.');
      } else {
        Alert.alert('Sync Error', 'Failed to sync courses. Please try again.');
      }
    },
  });

  // Tab state
  const [selectedTab, setSelectedTab] = useState<TabValue>('active');

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Archive dialog state
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [pathToArchive, setPathToArchive] = useState<Course | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Filter courses by status
  const filteredPaths = useMemo(() => {
    return courses.filter((path) => {
      const status = path.status || (path.progress >= 100 ? 'completed' : 'active');
      return status === selectedTab;
    });
  }, [courses, selectedTab]);

  // Count courses by status for tab badges
  const pathCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, archived: 0 };
    courses.forEach((path) => {
      const status = path.status || (path.progress >= 100 ? 'completed' : 'active');
      if (status in counts) {
        counts[status as TabValue]++;
      }
    });
    return counts;
  }, [courses]);

  // Tab options with counts
  const tabOptions: SegmentOption<TabValue>[] = [
    { value: 'active', label: 'Active', count: pathCounts.active },
    { value: 'completed', label: 'Completed', count: pathCounts.completed },
    { value: 'archived', label: 'Archived', count: pathCounts.archived },
  ];

  const handleCreatePath = () => {
    navigation.navigate('GoalSelection', { isCreatingNewCourse: true });
  };

  const handlePathPress = (path: Course) => {
    setActiveCourse(path);
    navigation.navigate('CourseView', { courseId: path.id });
  };

  const handleDeletePath = (path: Course) => {
    setPathToDelete(path);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!pathToDelete) return;

    setDeleteLoading(true);
    try {
      await coursesApi.deleteCourse(pathToDelete.id);
      deleteCourse(pathToDelete.id);
      setShowDeleteDialog(false);
      setPathToDelete(null);
    } catch (error) {
      console.error('Error deleting path:', error);
      // Show error using platform-appropriate method
      if (Platform.OS === 'web') {
        window.alert('Failed to delete track. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete track. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setPathToDelete(null);
  };

  const handleArchivePath = (path: Course) => {
    setPathToArchive(path);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    if (!pathToArchive) return;

    setArchiveLoading(true);
    try {
      await coursesApi.archiveCourse(pathToArchive.id);
      archiveCourse(pathToArchive.id);
      setShowArchiveDialog(false);
      setPathToArchive(null);
    } catch (error) {
      console.error('Error archiving path:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to archive track. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to archive track. Please try again.');
      }
    } finally {
      setArchiveLoading(false);
    }
  };

  const cancelArchive = () => {
    setShowArchiveDialog(false);
    setPathToArchive(null);
  };

  const handleRestorePath = async (path: Course) => {
    try {
      await coursesApi.restoreCourse(path.id);
      restoreCourse(path.id);
    } catch (error) {
      console.error('Error restoring path:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to restore track. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to restore track. Please try again.');
      }
    }
  };

  const handleEmptyStateAction = (config: EmptyStateConfig) => {
    if (config.actionTarget === 'create') {
      handleCreatePath();
    } else if (config.actionTarget === 'active') {
      setSelectedTab('active');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const emptyState = EMPTY_STATES[selectedTab];

  return (
    <View style={styles.container}>
      <Container scrollable padding="medium">
        {/* Tab Filter */}
        <View style={styles.tabContainer}>
          <SegmentedControl
            options={tabOptions}
            selectedValue={selectedTab}
            onValueChange={setSelectedTab}
          />
        </View>

        {/* Learning Paths Section */}
        {filteredPaths.length > 0 ? (
          <View style={styles.coursesSection}>
            {selectedTab === 'archived' && (
              <Text style={[styles.archiveHint, { color: colors.text.secondary }]}>
                Archived courses are hidden from your main view but can be restored anytime.
              </Text>
            )}
            {filteredPaths.map((path) => (
              <CourseCard
                key={path.id}
                path={path}
                onPress={handlePathPress}
                onDelete={handleDeletePath}
                onArchive={selectedTab !== 'archived' ? handleArchivePath : undefined}
                onRestore={selectedTab === 'archived' ? handleRestorePath : undefined}
                showStatusActions
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{emptyState.emoji}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {emptyState.title}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {emptyState.subtitle}
            </Text>
            {emptyState.actionLabel && (
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: colors.primary }]}
                onPress={() => handleEmptyStateAction(emptyState)}
              >
                <Text style={[styles.emptyActionText, { color: colors.white }]}>
                  {emptyState.actionLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Container>

      {/* Floating Action Button - only show on active tab */}
      {selectedTab === 'active' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleCreatePath}
          activeOpacity={0.8}
          accessibilityLabel="Create new course"
          accessibilityRole="button"
        >
          <Text style={[styles.fabIcon, { color: colors.white }]}>+</Text>
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Course"
        message={pathToDelete ? `Are you sure you want to delete "${pathToDelete.title}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        destructive
        loading={deleteLoading}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        visible={showArchiveDialog}
        title="Archive Course"
        message={pathToArchive ? `Archive "${pathToArchive.title}"? You can restore it anytime from the Archived tab.` : ''}
        confirmText="Archive"
        cancelText="Cancel"
        onConfirm={confirmArchive}
        onCancel={cancelArchive}
        loading={archiveLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    marginBottom: Spacing.lg,
  },
  coursesSection: {
    flex: 1,
  },
  archiveHint: {
    ...Typography.body.small,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.heading.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
  },
  emptyActionText: {
    ...Typography.button.medium,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default HomeScreen;
