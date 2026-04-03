import { View, Text, StyleSheet } from 'react-native';
import { OwnedItem } from '../lib/types';

interface Props {
  item: OwnedItem;
}

const TYPE_LABELS = {
  pot_skin: '화분',
  background_skin: '배경',
};

export default function InventoryItem({ item }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.item_key}</Text>
      <Text style={styles.type}>{TYPE_LABELS[item.item_type]}</Text>
      {item.equipped && <Text style={styles.equipped}>장착 중</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  type: { fontSize: 12, color: '#999', marginRight: 12 },
  equipped: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
});
