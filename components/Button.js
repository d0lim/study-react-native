import { View, Pressable, StyleSheet, Text } from "react-native";

export default function Button({ label }) {
  return (
    <View style={styles.buttonContanier}>
      <Pressable
        style={styles.button}
        onPress={() => alert("You pressed a button.")}
      >
        <Text style={styles.buttonLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContanier: {
    width: 320,
    height: 68,
    marginHorizontal: 20,
    alighItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  button: {
    bordorRadius: 10,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonIcon: {
    paddingRight: 8,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
  },
});
