import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Container } from '../components/Container';
import { useUserStore } from '../state/userStore';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';

export const ProgressScreen: React.FC = () => {
  const { userDocument } = useUserStore();
  const { responsive, isSmallPhone, isTablet } = useResponsive();

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

    const history = userDocument.history || [];
    const memory = userDocument.memory || { topics: {} };

    const lessons = history.filter((h) => h.type === 'lesson').length;
    const quizzes = history.filter((h) => h.type === 'quiz').length;
    const practice = history.filter((h) => h.type === 'practice').length;
    const topics = Object.keys(memory.topics).length;

    const quizScores = history
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

  // Responsive values
  const titleSize = responsive(
    Typography.display.small.fontSize,
    Typography.display.medium.fontSize,
    Typography.display.large.fontSize
  );
  const statValueSize = responsive(32, 40, 44, 48);
  const cardPadding = responsive(Spacing.md, Spacing.lg, Spacing.lg, Spacing.xl);
  const emptyEmojiSize = responsive(56, 64, 72, 80);

  if (!userDocument) {
    return (
      <Container>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyEmoji, { fontSize: emptyEmojiSize }]}>📊</Text>
          <Text style={styles.emptyText}>No progress data yet</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Your Progress</Text>
          <Text style={styles.subtitle}>Keep up the great work!</Text>
        </View>

        <View style={[styles.goalCard, { padding: cardPadding }]}>
          <Text style={styles.goalLabel}>Learning Goal</Text>
          <Text style={styles.goalText}>{userDocument.goal}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{userDocument.level}</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          <View style={[styles.statCard, { backgroundColor: Colors.card.stats.blue, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize }]}>{stats.lessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: Colors.card.stats.orange, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize }]}>{stats.quizzesCompleted}</Text>
            <Text style={styles.statLabel}>Quizzes Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: Colors.card.stats.purple, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize }]}>{stats.practiceCompleted}</Text>
            <Text style={styles.statLabel}>Practice Tasks</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: Colors.card.stats.green, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize }]}>{stats.topicsMastered}</Text>
            <Text style={styles.statLabel}>Topics Explored</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { padding: cardPadding }]}>
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

        {(userDocument.history?.length ?? 0) > 0 && (
          <View style={styles.recentActivity}>
            <Text style={styles.recentTitle}>Recent Activity</Text>
            {(userDocument.history || []).slice(-5).reverse().map((item, index) => (
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
    marginBottom: Spacing.lg,
  },
  headerSmall: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.display.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.medium,
    color: Colors.ios.gray,
  },
  goalCard: {
    backgroundColor: Colors.card.default,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  goalLabel: {
    ...Typography.label.medium,
    fontWeight: '600',
    color: Colors.ios.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  goalText: {
    ...Typography.heading.h2,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: Colors.badge.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.borderRadius.md,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: Colors.white,
    ...Typography.label.medium,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statsGridTablet: {
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: Spacing.borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.body.small,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.card.default,
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.body.medium,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  summaryValue: {
    ...Typography.heading.h3,
    fontWeight: '600',
    color: Colors.ios.blue,
  },
  recentActivity: {
    marginBottom: Spacing.lg,
  },
  recentTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card.default,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  activityIcon: {
    width: Spacing.icon.xl,
    height: Spacing.icon.xl,
    borderRadius: Spacing.borderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  activityEmoji: {
    fontSize: Spacing.icon.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityTopic: {
    ...Typography.body.medium,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  activityType: {
    ...Typography.body.small,
    color: Colors.ios.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body.medium,
    color: Colors.ios.gray,
  },
});
