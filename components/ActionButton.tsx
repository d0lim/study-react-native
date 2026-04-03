import { Pressable, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ActionButton({ label, description, onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  disabled: { backgroundColor: '#ccc' },
  label: { fontSize: 16, fontWeight: '700', color: '#fff' },
  description: { fontSize: 12, color: '#ffffffcc', marginTop: 2 },
});
