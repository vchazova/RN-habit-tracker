import { DATABASE_ID, databases, HABITS_COLLECTIO_ID } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit } from "@/types/database.type";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Button, Surface, Text } from "react-native-paper";

export default function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isHabitsLoading, setIsHabitsLoading] = useState<boolean>(false);
  const { signOut, user } = useAuth();

  useEffect(() => {
    fetchHabits();
  }, [user]);

  const fetchHabits = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        HABITS_COLLECTIO_ID,
        [Query.equal("user_id", user?.$id ?? "")]
      );

      console.log(response.documents);
      setHabits(response.documents as unknown as Habit[]);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text variant="headlineSmall">Today's Habits</Text>
        <Button mode="text" onPress={signOut} icon={"logout"}>
          SignOut
        </Button>
      </View>
      {!habits?.length ? (
        // FIXME: вынести в переменную для no-habits-view
        <View>
          <Text>No habits yet. Add your first habit!</Text>
        </View>
      ) : (
        <View>
          {habits.map((habit, i) => (
            //TODO: почитать про ключи в списках для реакта - что там лучше использовать и должно ли это быть строго уникальным

            <Surface key={habit.$id} elevation={0}>
              <View>
                <Text>{habit.title}</Text>
                <Text>{habit.description}</Text>
                <View>
                  <View>
                    <MaterialCommunityIcons
                      name="fire"
                      size={18}
                      color="#ff9800"
                    />
                    <Text>{habit.streak_count} day streak</Text>
                  </View>
                  <View>
                    {/* TODO: Сделать функцию для capitalaze first букву */}
                    <Text>
                      {habit.frequency.charAt(0).toUpperCase() +
                        habit.frequency.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </Surface>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {},
  title: {},
  emptyState: {},
  emptyStateText: {},
  cardsContainer: {},
  card: {},
  cardContent: {},
  cardTitle: {},
  cardDescription: {},
  cardFooter: {},
  streakBadge: {},
  streakText: {},
  frequencyBadge: {},
  frequencyText: {},
});
