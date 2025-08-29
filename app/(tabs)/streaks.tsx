import {
  client,
  DATABASE_ID,
  databases,
  HABIT_COMPLETIONS_COLLECTION_ID,
  HABITS_COLLECTIO_ID,
  RealtimeResponse,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitCompletion } from "@/types/database.type";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Card, Text } from "react-native-paper";

export default function StreaksScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitCompletion[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // old-type-channel via collections
      const habitsChannel = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTIO_ID}.documents`;
      const completionsChannel = `databases.${DATABASE_ID}.collections.${HABIT_COMPLETIONS_COLLECTION_ID}.documents`;

      // FIXME: слушать изменения для всего приложения централизовано
      const habitsSubscription = client.subscribe(
        habitsChannel,
        (response: RealtimeResponse) => {
          console.log("habitsSubscription: was completed");
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.update"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.delete"
            )
          ) {
            fetchHabits();
          }
        }
      );
      const completionsSubscriptions = client.subscribe(
        completionsChannel,
        (response: RealtimeResponse) => {
          console.log("completionsSubscriptions: was completed");
          if (response.events.includes("databases.*.tables.*.rows.*.create")) {
            fetchCompletions();
          }
        }
      );

      fetchHabits();
      fetchCompletions();

      return () => {
        // call function for unsubscribe of them
        habitsSubscription();
        completionsSubscriptions();
      };
    }
  }, [user]);

  const fetchHabits = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABITS_COLLECTIO_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      setHabits(response.documents as unknown as Habit[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCompletions = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABIT_COMPLETIONS_COLLECTION_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );
      const completions = response.documents as unknown as HabitCompletion[];
      setCompletedHabits(completions);
    } catch (error) {
      console.error(error);
    }
  };

  interface StreakData {
    streak: number;
    bestStreak: number;
    total: number;
  }

  const getStreakData = (habitId: string): StreakData => {
    const habitCompletions = completedHabits
      ?.filter((c) => {
        return c.habit_id === habitId;
      })
      .map((c) => ({
        ...c,
        completed_at: new Date(c.completed_at).setHours(0, 0, 0, 0),
      }))
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      );
    if (habitCompletions.length === 0) {
      return {
        streak: 0,
        bestStreak: 0,
        total: 0,
      };
    }

    let bestStreak = 0;
    let total = habitCompletions.length;

    let lastDate: Date | null = null;
    let currentStreak = 0;

    // TODO: добавить обработку варианта, когда последний выполненный раз был не сегодня и не вчера
    //  - страйк становится 0 текущий
    habitCompletions?.forEach((c) => {
      const date = new Date(c.completed_at);

      if (lastDate) {
        const diff =
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= 1.5) {
          currentStreak += 1;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
        bestStreak = 1;
      }

      lastDate = date;
    });

    return {
      streak: currentStreak,
      bestStreak,
      total,
    };
  };

  const habitStreaks = habits.map((habit) => {
    const { streak, bestStreak, total } = getStreakData(habit.$id);
    return {
      habit,
      streak,
      bestStreak,
      total,
    };
  });

  const rankedHabits = habitStreaks.sort((a, b) => b.bestStreak - a.bestStreak);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Habit Streaks
      </Text>
      {!rankedHabits?.length ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No habits yet. Add your first habit!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
        >
          {rankedHabits.map((habit, i) => (
            //TODO: почитать про ключи в списках для реакта - что там лучше использовать и должно ли это быть строго уникальным
            //TODO: почитать про refs - когда и зачем их стоит закрывать

            <Card
              style={[styles.card, i === 0 && styles.firstCard]}
              key={habit.habit.$id}
            >
              <Card.Content>
                <Text variant="titleMedium" style={styles.habitTitle}>
                  {habit.habit.title}
                </Text>
                <Text style={styles.habitDescription}>
                  {habit.habit.description}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>🔥 {habit.streak}</Text>
                    <Text style={styles.statBadgeLabel}>Current</Text>
                  </View>
                  <View style={styles.statBadgeGold}>
                    <Text style={styles.statBadgeText}>🏆 {habit.streak}</Text>
                    <Text style={styles.statBadgeLabel}>Best</Text>
                  </View>
                  <View style={styles.statBadgeGreen}>
                    <Text style={styles.statBadgeText}>✅ {habit.streak}</Text>
                    <Text style={styles.statBadgeLabel}>Total</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },

  cardsContainer: {},

  title: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  firstCard: {
    borderWidth: 2,
    borderColor: "#7c4dff",
  },
  habitTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
  },
  habitDescription: {
    color: "#6c6c80",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  statBadge: {
    backgroundColor: "#fff3e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statBadgeGold: {
    backgroundColor: "#fffde7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statBadgeGreen: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statBadgeText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#22223b",
  },
  statBadgeLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#666666",
  },
});
