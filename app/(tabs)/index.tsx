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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ID, Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Surface, Text } from "react-native-paper";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<string[]>([]);
  // const [isHabitsLoading, setIsHabitsLoading] = useState<boolean>(false);
  const { signOut, user } = useAuth();

  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

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
            fetchTodayCompletions();
          }
        }
      );

      fetchHabits();
      fetchTodayCompletions();

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

  const fetchTodayCompletions = async () => {
    try {
      // Задаем самое начало сегодняшнего дня для запроса с query всех выполненных,
      // которые были после сегодняшней полуночи, т.е. гарантированно сделаны сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await databases.listDocuments(
        DATABASE_ID,
        HABIT_COMPLETIONS_COLLECTION_ID,
        [
          Query.equal("user_id", user?.$id ?? ""),
          Query.greaterThanEqual("completed_at", today.toISOString()),
        ]
      );
      const completions = response.documents as unknown as HabitCompletion[];
      setCompletedHabits(completions.map((c) => c.habit_id));
    } catch (error) {
      console.error(error);
    }
  };

  const isHabitCompleted = (id: string) => completedHabits?.includes(id);

  const renderLeftActions = () => (
    <View style={styles.swipeActionLeft}>
      <MaterialCommunityIcons name="trash-can-outline" size={32} color="#fff" />
    </View>
  );

  const renderRightActions = (habitId: string) =>
    isHabitCompleted(habitId) ? (
      <Text style={[styles.swipeActionRight, styles.swipeActionRightCompleted]}>
        Already completed!
      </Text>
    ) : (
      <View style={styles.swipeActionRight}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={32}
          color="#fff"
        />
      </View>
    );

  const handleDeleteHabit = async (id: string) => {
    try {
      await databases.deleteDocument(DATABASE_ID, HABITS_COLLECTIO_ID, id);
    } catch (error) {
      console.error(error);
    }
  };
  const handleCompleteHabit = async (id: string) => {
    if (!user || isHabitCompleted(id)) return;

    try {
      const currentDate = new Date().toISOString();
      await databases.createDocument(
        DATABASE_ID,
        HABIT_COMPLETIONS_COLLECTION_ID,
        ID.unique(),
        {
          habit_id: id,
          user_id: user?.$id,
          completed_at: currentDate,
        }
      );

      const currentHabit = habits?.find((h) => h.$id === id);
      if (!currentHabit) return;

      // FIXME: более сложная логика для страйков с проверкой действительно
      // ли прошлый раз был вчера и чтобы в 1 день нельзя было 100 раз добавить страйк
      await databases.updateDocument(DATABASE_ID, HABITS_COLLECTIO_ID, id, {
        streak_count: currentHabit.streak_count + 1,
        last_completed: currentDate,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} variant="headlineSmall">
          Today's Habits
        </Text>
        <Button mode="text" onPress={signOut} icon={"logout"}>
          SignOut
        </Button>
      </View>
      {!habits?.length ? (
        // FIXME: вынести в переменную для no-habits-view
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
          {habits.map((habit, i) => (
            //TODO: почитать про ключи в списках для реакта - что там лучше использовать и должно ли это быть строго уникальным
            //TODO: почитать про refs - когда и зачем их стоит закрывать
            <Swipeable
              ref={(ref) => {
                swipeableRefs.current[habit.$id] = ref;
              }}
              key={habit.$id}
              overshootLeft={false}
              overshootRight={false}
              renderLeftActions={renderLeftActions}
              renderRightActions={() => renderRightActions(habit.$id)}
              onSwipeableOpen={(direction) => {
                if (direction === "left") {
                  handleDeleteHabit(habit.$id);
                } else if (direction === "right") {
                  handleCompleteHabit(habit.$id);
                }

                swipeableRefs.current[habit.$id]?.close();
              }}
            >
              <Surface
                style={[
                  styles.card,
                  isHabitCompleted(habit.$id) && styles.cardCompleted,
                ]}
                elevation={0}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{habit.title}</Text>
                  <Text style={styles.cardDescription}>
                    {habit.description}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.streakBadge}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={18}
                        color="#ff9800"
                      />
                      <Text style={styles.streakText}>
                        {habit.streak_count} day streak
                      </Text>
                    </View>
                    <View style={styles.frequencyBadge}>
                      {/* TODO: Сделать функцию для capitalaze first букву */}
                      <Text style={styles.frequencyText}>
                        {habit.frequency.charAt(0).toUpperCase() +
                          habit.frequency.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Surface>
            </Swipeable>
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
  cardsContainer: {},
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#f7f2fa",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#22223b",
  },
  cardDescription: {
    fontSize: 15,
    marginBottom: 16,
    color: "#6c6c80",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakText: {
    marginLeft: 6,
    color: "#ff9800",
    fontWeight: "bold",
    fontSize: 14,
  },
  frequencyBadge: {
    backgroundColor: "#ede7f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  frequencyText: {
    color: "#7c4dff",
    fontWeight: "bold",
    fontSize: 14,
  },
  swipeActionLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
    flex: 1,
    backgroundColor: "#ef3935",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingLeft: 16,
  },
  swipeActionRight: {
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "flex-end",
    flex: 1,
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingRight: 16,
  },
  swipeActionRightCompleted: {
    color: "#fff",
    textAlign: "right",
  },
});
