import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { OwnedItem } from '../../lib/types';
import InventoryItem from '../../components/InventoryItem';

export default function InventoryScreen() {
  const [items, setItems] = useState<OwnedItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetch = async () => {
        const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
        if (data) setItems(data);
      };
      fetch();
    }, [])
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>보유한 아이템이 없습니다</Text>
          <Text style={styles.emptyHint}>상점에서 아이템을 구매해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InventoryItem item={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  emptyHint: { fontSize: 14, color: '#999', marginTop: 8 },
});
