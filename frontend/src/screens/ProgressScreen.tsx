import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Container } from '../components/Container';
import { useUserStore } from '../state/userStore';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../hooks/useTheme';
import { useScreenTracking } from '../services/analytics';

export const ProgressScreen: React.FC = () => {
  useScreenTracking('Progress', 'ProgressScreen');
  const { userDocument } = useUserStore();
  const { responsive, isSmallPhone, isTablet } = useResponsive();
  const { colors } = useTheme();

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
          <Text style={[styles.emptyText, { color: colors.ios.gray }]}>No progress data yet</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, isSmallPhone && styles.headerSmall]}>
          <Text style={[styles.title, { fontSize: titleSize, color: colors.text.primary }]}>Your Progress</Text>
          <Text style={[styles.subtitle, { color: colors.ios.gray }]}>Keep up the great work!</Text>
        </View>

        <View style={[styles.goalCard, { padding: cardPadding, backgroundColor: colors.card.default }]}>
          <Text style={[styles.goalLabel, { color: colors.ios.gray }]}>Learning Goal</Text>
          <Text style={[styles.goalText, { color: colors.text.primary }]}>{userDocument.goal}</Text>
        </View>

        <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
          <View style={[styles.statCard, { backgroundColor: colors.card.stats.blue, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.lessonsCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Lessons Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.orange, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.quizzesCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Quizzes Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.purple, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.practiceCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Practice Tasks</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card.stats.green, padding: cardPadding }]}>
            <Text style={[styles.statValue, { fontSize: statValueSize, color: colors.text.primary }]}>{stats.topicsMastered}</Text>
            <Text style={[styles.statLabel, { color: colors.text.primary }]}>Topics Explored</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { padding: cardPadding, backgroundColor: colors.card.default }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.primary }]}>Total Activities</Text>
            <Text style={[styles.summaryValue, { color: colors.ios.blue }]}>{stats.totalActivities}</Text>
          </View>
          {stats.quizzesCompleted > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text.primary }]}>Average Quiz Score</Text>
              <Text style={[styles.summaryValue, { color: colors.ios.blue }]}>{stats.averageQuizScore}%</Text>
            </View>
          )}
        </View>

        {(userDocument.history?.length ?? 0) > 0 && (
          <View style={styles.recentActivity}>
            <Text style={[styles.recentTitle, { color: colors.text.primary }]}>Recent Activity</Text>
            {(userDocument.history || []).slice(-5).reverse().map((item, index) => (
              <View key={index} style={[styles.activityItem, { backgroundColor: colors.card.default }]}>
                <View style={[styles.activityIcon, { backgroundColor: colors.white }]}>
                  <Text style={styles.activityEmoji}>
                    {item.type === 'lesson' ? '📖' : item.type === 'quiz' ? '❓' : '💪'}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityTopic, { color: colors.text.primary }]}>{item.topic}</Text>
                  <Text style={[styles.activityType, { color: colors.ios.gray }]}>
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
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body.medium,
  },
  goalCard: {
    borderRadius: Spacing.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  goalLabel: {
    ...Typography.label.medium,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  goalText: {
    ...Typography.heading.h2,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.borderRadius.md,
    alignSelf: 'flex-start',
  },
  levelText: {
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
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.body.small,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryCard: {
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
  },
  summaryValue: {
    ...Typography.heading.h3,
    fontWeight: '600',
  },
  recentActivity: {
    marginBottom: Spacing.lg,
  },
  recentTitle: {
    ...Typography.heading.h3,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  activityIcon: {
    width: Spacing.icon.xl,
    height: Spacing.icon.xl,
    borderRadius: Spacing.borderRadius.full,
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
    marginBottom: 2,
  },
  activityType: {
    ...Typography.body.small,
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
  },
});
