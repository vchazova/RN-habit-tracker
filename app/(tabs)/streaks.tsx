import {
  DATABASE_ID,
  databases,
  HABIT_COMPLETIONS_COLLECTION_ID,
  HABITS_COLLECTIO_ID,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitCompletion } from "@/types/database.type";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Surface, Text } from "react-native-paper";

export default function StreaksScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitCompletion[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchHabits();
      fetchCompletions();
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

  // TODO: протестировать насколько ок работает с разными данными по высчитыванию страйков
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

  const rankedHabits = habitStreaks.sort((a, b) => a.bestStreak - b.bestStreak);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} variant="headlineSmall">
          Habit Streaks
        </Text>
        {!habits?.length ? (
          // FIXME: вынести в переменную для no-habits-view
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No habits yet. Add your first habit!
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {rankedHabits.map((habit, i) => (
              //TODO: почитать про ключи в списках для реакта - что там лучше использовать и должно ли это быть строго уникальным
              //TODO: почитать про refs - когда и зачем их стоит закрывать

              <Surface key={habit.habit.$id} elevation={0}>
                <Text>{habit.habit.title}</Text>
                <Text>{habit.streak}</Text>
                <Text>{habit.bestStreak}</Text>
                <Text>{habit.total}</Text>
              </Surface>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "bold",
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
