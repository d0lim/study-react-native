import { View, Text, StyleSheet } from 'react-native';
import { PlantStage } from '../lib/types';

interface Props {
  stage: PlantStage;
  progressPercent: number;
}

const STAGE_LABELS: Record<PlantStage, string> = {
  seed: '씨앗',
  sprout: '새싹',
  growing: '성장',
  flowering: '개화',
  fruit: '열매',
};

export default function GrowthProgress({ stage, progressPercent }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.percentText}>{progressPercent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  stageLabel: { fontSize: 18, fontWeight: '600' },
  barBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 6 },
  percentText: { fontSize: 14, color: '#666' },
});
