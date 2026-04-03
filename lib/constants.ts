import { PlantStage, FruitGrade } from './types';

// 각 단계 전환에 필요한 누적 시간 (초)
export const STAGE_THRESHOLDS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 4 * 3600,       // 4시간
  growing: 10 * 3600,     // 10시간
  flowering: 18 * 3600,   // 18시간
  fruit: 24 * 3600,       // 24시간
};

export const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'growing', 'flowering', 'fruit'];

export const BOOST_AMOUNTS = {
  water: 1 * 3600,      // 1시간 (초)
  fertilize: 3 * 3600,  // 3시간 (초)
} as const;

export const FRUIT_REWARDS: Record<FruitGrade, number> = {
  common: 10,
  rare: 50,
  legendary: 200,
};

// 수확 시 등급 확률 (가중치)
export const FRUIT_GRADE_WEIGHTS: { grade: FruitGrade; weight: number }[] = [
  { grade: 'common', weight: 70 },
  { grade: 'rare', weight: 25 },
  { grade: 'legendary', weight: 5 },
];

export const INVITE_BONUS_AMOUNT = 50; // 초대 보너스 재화
