import { View, Image, StyleSheet } from 'react-native';
import { PlantStage } from '../lib/types';

const STAGE_IMAGES: Record<PlantStage, any> = {
  seed: require('../assets/plants/seed.png'),
  sprout: require('../assets/plants/sprout.png'),
  growing: require('../assets/plants/growing.png'),
  flowering: require('../assets/plants/flowering.png'),
  fruit: require('../assets/plants/fruit.png'),
};

interface Props {
  stage: PlantStage;
}

export default function PlantView({ stage }: Props) {
  return (
    <View style={styles.container}>
      <Image source={STAGE_IMAGES[stage]} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 300 },
  image: { width: 200, height: 200 },
});
