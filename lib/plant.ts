import { PlantStage, PlantStatus, Plant } from './types';
import { STAGE_THRESHOLDS, STAGE_ORDER } from './constants';

export function calculatePlantStage(elapsedSeconds: number): PlantStage {
  let currentStage: PlantStage = 'seed';
  for (const stage of STAGE_ORDER) {
    if (elapsedSeconds >= STAGE_THRESHOLDS[stage]) {
      currentStage = stage;
    }
  }
  return currentStage;
}

export function calculateProgress(elapsedSeconds: number): number {
  const totalRequired = STAGE_THRESHOLDS.fruit;
  return Math.min(elapsedSeconds / totalRequired, 1);
}

export function getElapsedSeconds(plant: Plant): number {
  const plantedAt = new Date(plant.planted_at).getTime();
  const now = Date.now();
  const realElapsed = (now - plantedAt) / 1000;
  return realElapsed + plant.boost_seconds;
}

export function getPlantStatusLocal(plant: Plant | null): PlantStatus {
  if (!plant || plant.harvested) {
    return {
      plant,
      stage: 'seed',
      progress_percent: 0,
      can_harvest: false,
      elapsed_seconds: 0,
      total_required_seconds: STAGE_THRESHOLDS.fruit,
    };
  }

  const elapsed = getElapsedSeconds(plant);
  const stage = calculatePlantStage(elapsed);
  const progress = calculateProgress(elapsed);

  return {
    plant,
    stage,
    progress_percent: Math.round(progress * 100),
    can_harvest: stage === 'fruit',
    elapsed_seconds: elapsed,
    total_required_seconds: STAGE_THRESHOLDS.fruit,
  };
}
