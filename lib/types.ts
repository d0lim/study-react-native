export type PlantStage = 'seed' | 'sprout' | 'growing' | 'flowering' | 'fruit';

export type FruitGrade = 'common' | 'rare' | 'legendary';

export type ItemType = 'pot_skin' | 'background_skin';

export interface User {
  id: string;
  balance: number;
  invite_code: string;
  created_at: string;
}

export interface Plant {
  id: string;
  user_id: string;
  planted_at: string;
  boost_seconds: number;
  harvested: boolean;
  created_at: string;
}

export interface PlantStatus {
  plant: Plant | null;
  stage: PlantStage;
  progress_percent: number;
  can_harvest: boolean;
  elapsed_seconds: number;
  total_required_seconds: number;
}

export interface Harvest {
  id: string;
  fruit_type: string;
  grade: FruitGrade;
  reward_amount: number;
  created_at: string;
}

export interface ShopItem {
  id: string;
  item_type: ItemType;
  name: string;
  price: number;
  image_url: string | null;
}

export interface OwnedItem {
  id: string;
  item_type: ItemType;
  item_key: string;
  equipped: boolean;
  created_at: string;
}
