import { View } from "react-native";
import { Button, SegmentedButtons, TextInput } from "react-native-paper";

const FREQUENCES = ["daily", "weekly", "monthly"];

export default function AddHabitScreen() {
  return (
    <View>
      <TextInput label="Title" mode="outlined" />
      <TextInput label="Description" mode="outlined" />
      <View>
        <SegmentedButtons
          buttons={FREQUENCES.map((frequency) => ({
            value: frequency,
            label: frequency.charAt(0).toUpperCase() + frequency.slice(1),
          }))}
        />
      </View>
      <Button mode="contained">Add Habit</Button>
    </View>
  );
}
