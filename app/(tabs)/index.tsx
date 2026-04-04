import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { PlantStatus, Harvest } from '../../lib/types';
import PlantView from '../../components/PlantView';
import GrowthProgress from '../../components/GrowthProgress';
import ActionButton from '../../components/ActionButton';
import HarvestModal from '../../components/HarvestModal';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<PlantStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [harvestResult, setHarvestResult] = useState<Harvest | null>(null);

  const fetchStatus = async () => {
    const { data, error } = await supabase.functions.invoke('get-plant-status');
    if (!error && data) setStatus(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  const handlePlantSeed = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('plant-seed');
    console.log('plant-seed response:', JSON.stringify({ data, error: error?.message }));
    if (error) Alert.alert('Error', typeof error === 'object' ? JSON.stringify(error) : error.message);
    await fetchStatus();
    setLoading(false);
  };

  const handleWater = async () => {
    setLoading(true);
    const ad = RewardedAd.createForAdRequest(TestIds.REWARDED);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      ad.show();
    });

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      const { error } = await supabase.functions.invoke('water');
      if (error) Alert.alert('Error', error.message);
      await fetchStatus();
      setLoading(false);
      unsubLoaded();
      unsubEarned();
    });

    ad.load();
  };

  const handleFertilize = async () => {
    setLoading(true);
    const ad = RewardedAd.createForAdRequest(TestIds.REWARDED);

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      ad.show();
    });

    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      const { error } = await supabase.functions.invoke('fertilize');
      if (error) Alert.alert('Error', error.message);
      await fetchStatus();
      setLoading(false);
      unsubLoaded();
      unsubEarned();
    });

    ad.load();
  };

  const handleHarvest = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('harvest');
    if (error) {
      Alert.alert('Error', error.message);
    } else if (data?.harvest) {
      setHarvestResult(data.harvest);
      await refreshUser();
    }
    await fetchStatus();
    setLoading(false);
  };

  const hasPlant = status?.plant && !status.plant.harvested;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.balance}>{user?.balance ?? 0} 코인</Text>
      </View>

      {hasPlant ? (
        <>
          <PlantView stage={status!.stage} />
          <GrowthProgress stage={status!.stage} progressPercent={status!.progress_percent} />

          {status!.can_harvest ? (
            <Pressable style={styles.harvestButton} onPress={handleHarvest} disabled={loading}>
              <Text style={styles.harvestText}>수확하기</Text>
            </Pressable>
          ) : (
            <View style={styles.actions}>
              <ActionButton
                label="물주기"
                description="광고 시청 (+1시간)"
                onPress={handleWater}
                disabled={loading}
              />
              <ActionButton
                label="비료"
                description="광고 시청 (+3시간)"
                onPress={handleFertilize}
                disabled={loading}
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>씨앗을 심어보세요!</Text>
          <Pressable style={styles.plantButton} onPress={handlePlantSeed} disabled={loading}>
            <Text style={styles.plantButtonText}>씨앗 심기</Text>
          </Pressable>
        </View>
      )}

      <HarvestModal
        visible={!!harvestResult}
        harvest={harvestResult}
        onClose={() => {
          setHarvestResult(null);
          fetchStatus();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, alignItems: 'flex-end' },
  balance: { fontSize: 18, fontWeight: '700', color: '#FF9800' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 24 },
  harvestButton: {
    backgroundColor: '#FF9800',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  harvestText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 20 },
  plantButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  plantButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
