import type { Vector3Tuple } from "three";

export type EnemyType = "normal" | "fast" | "tank";
export type TowerType = "cannon" | "mortar" | "frost";

export interface EnemyStats {
  type: EnemyType;
  label: string;
  color: number;
  hp: number;
  speed: number;
  reward: number;
  size: number;
}

export interface TowerStats {
  type: TowerType;
  label: string;
  description: string;
  color: number;
  cost: number;
  attackRange: number;
  attackSpeed: number;
  damage: number;
  projectileSpeed: number;
  splashRadius?: number;
  slowMultiplier?: number;
  slowDuration?: number;
}

export interface WaveSpawnEntry {
  type: EnemyType;
  delay: number;
}

export interface WaveDefinition {
  index: number;
  enemies: WaveSpawnEntry[];
  rewardBonus: number;
}

export interface GameStatsSnapshot {
  gold: number;
  life: number;
  wave: number;
  totalWaves: number;
  selectedTower: TowerType | null;
  statusText: string;
}

export interface PlacementResult {
  ok: boolean;
  reason?: string;
}

export interface PathDefinition {
  points: Vector3Tuple[];
  laneWidth: number;
}
