import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Course, OutlineStatuses } from '../types/app';
import { coursesApi } from '../services/api';
import { useCoursesStore } from '../state/coursesStore';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseGenerating'>;

const { width } = Dimensions.get('window');

// Progress messages to show during generation
const PROGRESS_MESSAGES = [
  'Analyzing your learning goal...',
  'Designing personalized curriculum...',
  'Structuring course modules...',
  'Creating topic breakdowns...',
  'Optimizing learning sequence...',
  'Finalizing your course outline...',
];

export const CourseGeneratingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { courseId } = route.params;
  const [path, setPath] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const { updateCourse } = useCoursesStore();

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Start pulse animation for the icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: path?.outlineStatus === OutlineStatuses.READY ? 100 : messageIndex * 16 + 10,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [messageIndex, path?.outlineStatus, progressAnim]);

  // Cycle through progress messages
  useEffect(() => {
    if (path?.outlineStatus === OutlineStatuses.READY) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        // Fade out current message
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Fade in new message
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        });
        return (prev + 1) % PROGRESS_MESSAGES.length;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [path?.outlineStatus, fadeAnim]);

  // Poll for path status
  const pollPath = useCallback(async () => {
    try {
      const fetchedPath = await coursesApi.getCourse(courseId);
      if (fetchedPath) {
        setPath(fetchedPath);
        updateCourse(courseId, fetchedPath);

        // If outline is ready or failed, stop polling
        if (fetchedPath.outlineStatus === OutlineStatuses.READY ||
            fetchedPath.outlineStatus === OutlineStatuses.FAILED) {
          return true; // Stop polling
        }
      }
      return false; // Continue polling
    } catch (err) {
      console.error('Error polling path:', err);
      setError('Failed to load course. Please try again.');
      return true; // Stop polling on error
    }
  }, [courseId, updateCourse]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let mounted = true;

    const startPolling = async () => {
      // Initial fetch
      const shouldStop = await pollPath();
      if (shouldStop || !mounted) return;

      // Poll every 2 seconds
      intervalId = setInterval(async () => {
        if (!mounted) return;
        const shouldStop = await pollPath();
        if (shouldStop) {
          clearInterval(intervalId);
        }
      }, 2000);
    };

    startPolling();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollPath]);

  const handleStartLearning = () => {
    navigation.replace('Course', { courseId });
  };

  const handleRetry = async () => {
    setError(null);
    // Navigate back to create a new path
    navigation.goBack();
  };

  // Calculate total topics and estimated time
  const getTotals = () => {
    if (!path?.outline) return { topics: 0, minutes: 0 };
    let topics = 0;
    let minutes = 0;
    path.outline.modules.forEach((module) => {
      topics += module.topics.length;
      minutes += module.estimatedMinutes;
    });
    return { topics, minutes };
  };

  const { topics: totalTopics, minutes: totalMinutes } = getTotals();

  // Render outline preview
  const renderOutlinePreview = () => {
    if (!path?.outline) return null;

    return (
      <View style={styles.outlineContainer}>
        <Text style={styles.outlineTitle}>{path.outline.title}</Text>
        <Text style={styles.outlineDescription}>{path.outline.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{path.outline.modules.length}</Text>
            <Text style={styles.statLabel}>Modules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTopics}</Text>
            <Text style={styles.statLabel}>Topics</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(totalMinutes / 60)}h</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
        </View>

        <ScrollView style={styles.modulesList} showsVerticalScrollIndicator={false}>
          {path.outline.modules.map((module, index) => (
            <View key={module.id} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <View style={styles.moduleNumber}>
                  <Text style={styles.moduleNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleTopicCount}>
                    {module.topics.length} topics
                  </Text>
                </View>
              </View>
              <View style={styles.topicsList}>
                {module.topics.slice(0, 3).map((topic, topicIndex) => (
                  <View key={topic.id} style={styles.topicItem}>
                    <View style={styles.topicBullet} />
                    <Text style={styles.topicTitle} numberOfLines={1}>
                      {topic.title}
                    </Text>
                  </View>
                ))}
                {module.topics.length > 3 && (
                  <Text style={styles.moreTopics}>
                    +{module.topics.length - 3} more topics
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.startButton} onPress={handleStartLearning}>
          <Text style={styles.startButtonText}>Start Learning</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render generating state
  const renderGenerating = () => (
    <View style={styles.generatingContainer}>
      <Animated.Text
        style={[styles.generatingIcon, { transform: [{ scale: pulseAnim }] }]}
      >
        {path?.emoji || '📚'}
      </Animated.Text>

      <Text style={styles.generatingTitle}>Creating Your Course</Text>

      <Animated.Text style={[styles.progressMessage, { opacity: fadeAnim }]}>
        {PROGRESS_MESSAGES[messageIndex]}
      </Animated.Text>

      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <Text style={styles.goalText}>{path?.goal}</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>😕</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render failed state
  const renderFailed = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>😕</Text>
      <Text style={styles.errorTitle}>Course Generation Failed</Text>
      <Text style={styles.errorMessage}>
        We couldn't generate your course outline. Please try again.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        renderError()
      ) : path?.outlineStatus === OutlineStatuses.FAILED ? (
        renderFailed()
      ) : path?.outlineStatus === OutlineStatuses.READY ? (
        renderOutlinePreview()
      ) : (
        renderGenerating()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Generating state styles
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  generatingIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    minHeight: 24,
  },
  progressBarContainer: {
    width: width - 80,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Outline preview styles
  outlineContainer: {
    flex: 1,
    padding: 20,
  },
  outlineTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  outlineDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  modulesList: {
    flex: 1,
    marginBottom: 16,
  },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  moduleTopicCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  topicsList: {
    paddingLeft: 44,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C5C5C7',
    marginRight: 10,
  },
  topicTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  moreTopics: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
