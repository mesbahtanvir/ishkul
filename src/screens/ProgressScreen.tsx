import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Container } from '../components/Container';
import { useUserStore } from '../state/userStore';

export const ProgressScreen: React.FC = () => {
  const { userDocument } = useUserStore();

  const stats = useMemo(() => {
    if (!userDocument) {
      return {
        lessonsCompleted: 0,
        quizzesCompleted: 0,
        practiceCompleted: 0,
        topicsMastered: 0,
        totalActivities: 0,
        averageQuizScore: 0,
      };
    }

    const lessons = userDocument.history.filter((h) => h.type === 'lesson').length;
    const quizzes = userDocument.history.filter((h) => h.type === 'quiz').length;
    const practice = userDocument.history.filter((h) => h.type === 'practice').length;
    const topics = Object.keys(userDocument.memory.topics).length;

    const quizScores = userDocument.history
      .filter((h) => h.type === 'quiz' && h.score !== undefined)
      .map((h) => h.score || 0);
    const avgScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : 0;

    return {
      lessonsCompleted: lessons,
      quizzesCompleted: quizzes,
      practiceCompleted: practice,
      topicsMastered: topics,
      totalActivities: lessons + quizzes + practice,
      averageQuizScore: avgScore,
    };
  }, [userDocument]);

  if (!userDocument) {
    return (
      <Container>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>No progress data yet</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Keep up the great work!</Text>
        </View>

        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Learning Goal</Text>
          <Text style={styles.goalText}>{userDocument.goal}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{userDocument.level}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FF' }]}>
            <Text style={styles.statValue}>{stats.lessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFE8D6' }]}>
            <Text style={styles.statValue}>{stats.quizzesCompleted}</Text>
            <Text style={styles.statLabel}>Quizzes Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E8E3FF' }]}>
            <Text style={styles.statValue}>{stats.practiceCompleted}</Text>
            <Text style={styles.statLabel}>Practice Tasks</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#E7F7EF' }]}>
            <Text style={styles.statValue}>{stats.topicsMastered}</Text>
            <Text style={styles.statLabel}>Topics Explored</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Activities</Text>
            <Text style={styles.summaryValue}>{stats.totalActivities}</Text>
          </View>
          {stats.quizzesCompleted > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Average Quiz Score</Text>
              <Text style={styles.summaryValue}>{stats.averageQuizScore}%</Text>
            </View>
          )}
        </View>

        {userDocument.history.length > 0 && (
          <View style={styles.recentActivity}>
            <Text style={styles.recentTitle}>Recent Activity</Text>
            {userDocument.history.slice(-5).reverse().map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityEmoji}>
                    {item.type === 'lesson' ? '📖' : item.type === 'quiz' ? '❓' : '💪'}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTopic}>{item.topic}</Text>
                  <Text style={styles.activityType}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    {item.score !== undefined && ` • ${item.score}%`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
  },
  goalCard: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  recentActivity: {
    marginBottom: 20,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTopic: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 15,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
  },
});
