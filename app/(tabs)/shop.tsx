import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ShopItem as ShopItemType } from '../../lib/types';
import ShopItem from '../../components/ShopItem';

export default function ShopScreen() {
  const { user, refreshUser } = useAuth();
  const [shopItems, setShopItems] = useState<ShopItemType[]>([]);
  const [ownedKeys, setOwnedKeys] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    const [shopRes, ownedRes] = await Promise.all([
      supabase.from('shop_items').select('*').order('price'),
      supabase.from('items').select('item_key'),
    ]);
    if (shopRes.data) setShopItems(shopRes.data);
    if (ownedRes.data) setOwnedKeys(new Set(ownedRes.data.map((i) => i.item_key)));
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handlePurchase = async (itemId: string) => {
    const { data, error } = await supabase.functions.invoke('purchase', {
      body: { item_id: itemId },
    });
    if (error) {
      Alert.alert('구매 실패', error.message);
    } else {
      Alert.alert('구매 완료!');
      await refreshUser();
      await fetchData();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.balance}>{user?.balance ?? 0} 코인</Text>
      <FlatList
        data={shopItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShopItem
            item={item}
            owned={ownedKeys.has(item.id)}
            canAfford={(user?.balance ?? 0) >= item.price}
            onPurchase={() => handlePurchase(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  balance: { fontSize: 18, fontWeight: '700', color: '#FF9800', textAlign: 'right', padding: 16 },
  list: { padding: 16 },
});
