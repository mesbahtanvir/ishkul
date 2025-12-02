import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Container } from '../components/Container';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LearningPathCard } from '../components/LearningPathCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { SegmentedControl, SegmentOption } from '../components/SegmentedControl';

import { useLearningPathsStore } from '../state/learningPathsStore';
import { learningPathsApi } from '../services/api';

import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

import { RootStackParamList } from '../types/navigation';
import { LearningPath, PathStatus } from '../types/app';
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
    subtitle: 'Create your first learning path and begin mastering new skills!',
    actionLabel: 'Create Path',
    actionTarget: 'create',
  },
  completed: {
    emoji: '🎓',
    title: 'No Completed Paths Yet',
    subtitle: 'Complete your first learning path to see it here. Keep learning!',
    actionLabel: 'Continue Learning',
    actionTarget: 'active',
  },
  archived: {
    emoji: '🗃️',
    title: 'No Archived Paths',
    subtitle: 'Archived paths will appear here. Archive paths you want to revisit later.',
  },
};

export const HomeScreen: React.FC = () => {
  useScreenTracking('Home', 'HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {
    paths,
    setPaths,
    setActivePath,
    deletePath,
    archivePath,
    restorePath,
    loading,
  } = useLearningPathsStore();
  const { colors } = useTheme();

  // Tab state
  const [selectedTab, setSelectedTab] = useState<TabValue>('active');

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<LearningPath | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Archive dialog state
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [pathToArchive, setPathToArchive] = useState<LearningPath | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Filter paths by status
  const filteredPaths = useMemo(() => {
    return paths.filter((path) => {
      const status = path.status || (path.progress >= 100 ? 'completed' : 'active');
      return status === selectedTab;
    });
  }, [paths, selectedTab]);

  // Count paths by status for tab badges
  const pathCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, archived: 0 };
    paths.forEach((path) => {
      const status = path.status || (path.progress >= 100 ? 'completed' : 'active');
      if (status in counts) {
        counts[status as TabValue]++;
      }
    });
    return counts;
  }, [paths]);

  // Tab options with counts
  const tabOptions: SegmentOption<TabValue>[] = [
    { value: 'active', label: 'Active', count: pathCounts.active },
    { value: 'completed', label: 'Completed', count: pathCounts.completed },
    { value: 'archived', label: 'Archived', count: pathCounts.archived },
  ];

  // Refresh learning paths when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshPaths = async () => {
        try {
          // Check if cache is still valid before fetching
          const { listCache, isCacheValid } = useLearningPathsStore.getState();
          if (isCacheValid(listCache)) {
            // Cache is still valid, skip API call
            return;
          }
          // Cache expired or doesn't exist, fetch from API
          const fetchedPaths = await learningPathsApi.getPaths();
          setPaths(fetchedPaths);
        } catch (error) {
          // Log detailed error and notify user
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Error refreshing learning paths:', { message: errorMessage, error });
          // Show alert to user about sync failure
          if (Platform.OS === 'web') {
            window.alert('Failed to sync learning paths. Please try again.');
          } else {
            Alert.alert('Sync Error', 'Failed to sync learning paths. Please try again.');
          }
        }
      };
      refreshPaths();
    }, [setPaths])
  );

  const handleCreatePath = () => {
    navigation.navigate('GoalSelection', { isCreatingNewPath: true });
  };

  const handlePathPress = (path: LearningPath) => {
    setActivePath(path);
    navigation.navigate('LearningPath', { pathId: path.id });
  };

  const handleDeletePath = (path: LearningPath) => {
    setPathToDelete(path);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!pathToDelete) return;

    setDeleteLoading(true);
    try {
      await learningPathsApi.deletePath(pathToDelete.id);
      deletePath(pathToDelete.id);
      setShowDeleteDialog(false);
      setPathToDelete(null);
    } catch (error) {
      console.error('Error deleting path:', error);
      // Show error using platform-appropriate method
      if (Platform.OS === 'web') {
        window.alert('Failed to delete learning path. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete learning path. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setPathToDelete(null);
  };

  const handleArchivePath = (path: LearningPath) => {
    setPathToArchive(path);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    if (!pathToArchive) return;

    setArchiveLoading(true);
    try {
      await learningPathsApi.archivePath(pathToArchive.id);
      archivePath(pathToArchive.id);
      setShowArchiveDialog(false);
      setPathToArchive(null);
    } catch (error) {
      console.error('Error archiving path:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to archive learning path. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to archive learning path. Please try again.');
      }
    } finally {
      setArchiveLoading(false);
    }
  };

  const cancelArchive = () => {
    setShowArchiveDialog(false);
    setPathToArchive(null);
  };

  const handleRestorePath = async (path: LearningPath) => {
    try {
      await learningPathsApi.restorePath(path.id);
      restorePath(path.id);
    } catch (error) {
      console.error('Error restoring path:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to restore learning path. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to restore learning path. Please try again.');
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

  if (loading) {
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
          <View style={styles.pathsSection}>
            {selectedTab === 'archived' && (
              <Text style={[styles.archiveHint, { color: colors.text.secondary }]}>
                Archived paths are hidden from your main view but can be restored anytime.
              </Text>
            )}
            {filteredPaths.map((path) => (
              <LearningPathCard
                key={path.id}
                path={path}
                onPress={handlePathPress}
                onDelete={handleDeletePath}
                onArchive={selectedTab !== 'archived' ? handleArchivePath : undefined}
                onRestore={selectedTab === 'archived' ? handleRestorePath : undefined}
                showStatusActions={selectedTab === 'archived' || selectedTab === 'completed'}
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
        >
          <Text style={styles.fabIcon}>✨</Text>
          <Text style={[styles.fabText, { color: colors.white }]}>New Path</Text>
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Learning Path"
        message={pathToDelete ? `Are you sure you want to delete "${pathToDelete.goal}"? This action cannot be undone.` : ''}
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
        title="Archive Learning Path"
        message={pathToArchive ? `Archive "${pathToArchive.goal}"? You can restore it anytime from the Archived tab.` : ''}
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
  pathsSection: {
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
    width: 120,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 20,
  },
  fabText: {
    ...Typography.button.medium,
    fontWeight: '600',
  },
});

export default HomeScreen;
