import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ShopItem as ShopItemType } from '../lib/types';

interface Props {
  item: ShopItemType;
  owned: boolean;
  canAfford: boolean;
  onPurchase: () => void;
}

export default function ShopItem({ item, owned, canAfford, onPurchase }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.type}>{item.item_type === 'pot_skin' ? '화분' : '배경'}</Text>
      {owned ? (
        <Text style={styles.owned}>보유 중</Text>
      ) : (
        <Pressable
          style={[styles.buyButton, !canAfford && styles.disabled]}
          onPress={onPurchase}
          disabled={!canAfford}
        >
          <Text style={styles.buyText}>{item.price} 코인</Text>
        </Pressable>
      )}
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
    justifyContent: 'space-between',
  },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  type: { fontSize: 12, color: '#999', marginRight: 12 },
  owned: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  buyButton: { backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  buyText: { color: '#fff', fontWeight: '600' },
});
