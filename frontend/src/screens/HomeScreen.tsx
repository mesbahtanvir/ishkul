import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Container } from '../components/Container';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LearningPathCard } from '../components/LearningPathCard';
import { LoadingScreen } from '../components/LoadingScreen';

import { useLearningPathsStore } from '../state/learningPathsStore';
import { learningPathsApi } from '../services/api';

import { useTheme } from '../hooks/useTheme';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';

import { RootStackParamList } from '../types/navigation';
import { LearningPath } from '../types/app';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { paths, setPaths, setActivePath, deletePath, loading } = useLearningPathsStore();
  const { colors } = useTheme();

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pathToDelete, setPathToDelete] = useState<LearningPath | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Container scrollable padding="medium">
        {/* Learning Paths Section */}
        {paths.length > 0 ? (
          <View style={styles.pathsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>My Learning Paths</Text>
            {paths.map((path) => (
              <LearningPathCard
                key={path.id}
                path={path}
                onPress={handlePathPress}
                onDelete={handleDeletePath}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Start Your Learning Journey</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              Create your first learning path and begin mastering new skills!
            </Text>
          </View>
        )}
      </Container>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreatePath}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>✨</Text>
        <Text style={[styles.fabText, { color: colors.white }]}>New Path</Text>
      </TouchableOpacity>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pathsSection: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.heading.h4,
    marginBottom: Spacing.md,
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
