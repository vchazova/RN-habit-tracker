import { DATABASE_ID, databases, HABITS_COLLECTIO_ID } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ID } from "react-native-appwrite";
import {
  Button,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

const FREQUENCES = ["daily", "weekly", "monthly"];
type Frequency = (typeof FREQUENCES)[number];

export default function AddHabitScreen() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [error, setError] = useState<string>("");
  const { user } = useAuth();

  const theme = useTheme();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!user) return;

    try {
      await databases.createDocument(
        DATABASE_ID,
        HABITS_COLLECTIO_ID,
        ID.unique(),
        {
          user_id: user.$id,
          title,
          description,
          frequency,
          streak_count: 0,
          // FIXME: last completed should be actually null
          last_completed: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      );

      // FIXME: reset to sero condition our fields

      // setTitle("");
      // setDescription("");
      // setFrequency(FREQUENCES[0]);

      router.back();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }

      setError("There was error creating the habit");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        onChangeText={setTitle}
        style={styles.input}
        label="Title"
        mode="outlined"
      />
      <TextInput
        onChangeText={setDescription}
        style={styles.input}
        label="Description"
        mode="outlined"
      />
      <View style={styles.frequencyContainer}>
        <SegmentedButtons
          value={frequency}
          onValueChange={(value) => setFrequency(value as Frequency)}
          buttons={FREQUENCES.map((frequency) => ({
            value: frequency,
            label: frequency.charAt(0).toUpperCase() + frequency.slice(1),
          }))}
        />
      </View>
      <Button
        mode="contained"
        disabled={!title || !description}
        onPress={handleSubmit}
      >
        Add Habit
      </Button>
      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  input: {
    marginBottom: 16,
  },
  frequencyContainer: {
    marginBottom: 24,
  },
});
