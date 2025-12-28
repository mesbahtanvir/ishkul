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
import { useCourseSubscription } from '../hooks/useCourseSubscription';

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
  const { updateCourse, activeCourse } = useCoursesStore();

  // Detect if outline is still generating
  const isOutlineGenerating =
    path?.outlineStatus !== OutlineStatuses.READY &&
    path?.outlineStatus !== OutlineStatuses.FAILED;

  // Use Firebase subscription for real-time updates (replaces polling when active)
  const { isSubscribed } = useCourseSubscription(courseId, {
    enabled: isOutlineGenerating,
    onError: (err) => {
      console.warn('Firebase subscription error in CourseGeneratingScreen:', err.message);
      // Polling will automatically take over as fallback
    },
  });

  // Sync activeCourse from store to local state (when subscription updates the store)
  useEffect(() => {
    if (activeCourse?.id === courseId && activeCourse !== path) {
      setPath(activeCourse);
    }
  }, [activeCourse, courseId, path]);

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
      // Initial fetch (always do this to get initial state)
      const shouldStop = await pollPath();
      if (shouldStop || !mounted) return;

      // Only poll if Firebase subscription is NOT active
      // When subscription is active, updates come through the store automatically
      if (isSubscribed) {
        return;
      }

      // Poll every 2 seconds as fallback
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
  }, [pollPath, isSubscribed]);

  // Auto-navigate to first lesson when course is ready (frictionless flow)
  useEffect(() => {
    if (path?.outlineStatus === OutlineStatuses.READY) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        if (path?.outline?.sections && path.outline.sections.length > 0) {
          const firstSection = path.outline.sections[0];
          if (firstSection.lessons && firstSection.lessons.length > 0) {
            const firstLesson = firstSection.lessons[0];
            navigation.replace('CourseView', {
              courseId,
              lessonId: firstLesson.id,
              sectionId: firstSection.id,
            });
            return;
          }
        }
        // Fallback to overview if no lessons found
        navigation.replace('CourseView', { courseId });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [path?.outlineStatus, path?.outline?.sections, courseId, navigation]);

  // Fallback handlers in case auto-navigation doesn't trigger
  const handleViewOutline = () => {
    navigation.replace('CourseView', { courseId });
  };

  const handleStartFirstLesson = () => {
    if (path?.outline?.sections && path.outline.sections.length > 0) {
      const firstSection = path.outline.sections[0];
      if (firstSection.lessons && firstSection.lessons.length > 0) {
        const firstLesson = firstSection.lessons[0];
        navigation.replace('CourseView', {
          courseId,
          lessonId: firstLesson.id,
          sectionId: firstSection.id,
        });
        return;
      }
    }
    navigation.replace('CourseView', { courseId });
  };

  const handleRetry = async () => {
    setError(null);
    // Navigate back to create a new path
    navigation.goBack();
  };

  // Calculate total lessons and estimated time
  const getTotals = () => {
    if (!path?.outline?.sections) return { lessons: 0, minutes: 0 };
    let lessons = 0;
    let minutes = 0;
    path.outline.sections.forEach((section) => {
      lessons += section.lessons.length;
      minutes += section.estimatedMinutes;
    });
    return { lessons, minutes };
  };

  const { lessons: totalLessons, minutes: totalMinutes } = getTotals();

  // Render outline preview
  const renderOutlinePreview = () => {
    if (!path?.outline) return null;

    return (
      <View style={styles.outlineContainer}>
        <Text style={styles.outlineTitle}>{path.outline.title}</Text>
        <Text style={styles.outlineDescription}>{path.outline.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{path.outline.sections?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalLessons}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(totalMinutes / 60)}h</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
        </View>

        <ScrollView style={styles.sectionsList} showsVerticalScrollIndicator={false}>
          {path.outline.sections?.map((section, index) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionNumber}>
                  <Text style={styles.sectionNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionLessonCount}>
                    {section.lessons.length} lessons
                  </Text>
                </View>
              </View>
              <View style={styles.lessonsList}>
                {section.lessons.slice(0, 3).map((lesson) => (
                  <View key={lesson.id} style={styles.lessonItem}>
                    <View style={styles.lessonBullet} />
                    <Text style={styles.lessonTitle} numberOfLines={1}>
                      {lesson.title}
                    </Text>
                  </View>
                ))}
                {section.lessons.length > 3 && (
                  <Text style={styles.moreLessons}>
                    +{section.lessons.length - 3} more lessons
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.startButton} onPress={handleStartFirstLesson}>
          <Text style={styles.startButtonText}>Start Learning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={handleViewOutline}>
          <Text style={styles.outlineButtonText}>View Full Outline</Text>
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

      <Text style={styles.goalText}>{path?.title}</Text>
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
  sectionsList: {
    flex: 1,
    marginBottom: 16,
  },
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionNumberText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionLessonCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  lessonsList: {
    paddingLeft: 44,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C5C5C7',
    marginRight: 10,
  },
  lessonTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  moreLessons: {
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
  outlineButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  outlineButtonText: {
    color: '#007AFF',
    fontSize: 16,
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
