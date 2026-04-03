import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Harvest, FruitGrade } from '../lib/types';

interface Props {
  visible: boolean;
  harvest: Harvest | null;
  onClose: () => void;
}

const GRADE_COLORS: Record<FruitGrade, string> = {
  common: '#8BC34A',
  rare: '#2196F3',
  legendary: '#FF9800',
};

const GRADE_LABELS: Record<FruitGrade, string> = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

export default function HarvestModal({ visible, harvest, onClose }: Props) {
  if (!harvest) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>수확 완료!</Text>
          <Text style={[styles.grade, { color: GRADE_COLORS[harvest.grade] }]}>
            {GRADE_LABELS[harvest.grade]}
          </Text>
          <Text style={styles.fruit}>{harvest.fruit_type}</Text>
          <Text style={styles.reward}>+{harvest.reward_amount} 코인</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  grade: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  fruit: { fontSize: 32, marginBottom: 12 },
  reward: { fontSize: 20, fontWeight: '700', color: '#FF9800', marginBottom: 20 },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
