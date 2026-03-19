import type { Vector3Tuple } from "three";

export type EnemyType = "normal" | "fast" | "tank";
export type TowerType = "cannon" | "mortar" | "frost";
export type DamageType = "physical" | "magic";
export type SkillType = "freeze" | "bomb";

export interface ResistanceProfile {
  physical?: number;
  magic?: number;
}

export interface EnemyStats {
  type: EnemyType;
  label: string;
  color: number;
  hp: number;
  speed: number;
  reward: number;
  size: number;
  resistances?: ResistanceProfile;
}

export interface TowerLevelStats {
  level: number;
  upgradeCost?: number;
  attackRange: number;
  attackSpeed: number;
  damage: number;
  projectileSpeed: number;
  splashRadius?: number;
  slowMultiplier?: number;
  slowDuration?: number;
}

export interface TowerStats {
  type: TowerType;
  label: string;
  description: string;
  color: number;
  cost: number;
  attackType: DamageType;
  levels: [TowerLevelStats, TowerLevelStats, TowerLevelStats];
}

export interface SkillStats {
  type: SkillType;
  label: string;
  description: string;
  cooldown: number;
  duration?: number;
  radius?: number;
  slowMultiplier?: number;
  damage?: number;
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

export interface PathDefinition {
  points: Vector3Tuple[];
  laneWidth: number;
}

export interface BuildableBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  description: string;
  path: PathDefinition;
  bounds: BuildableBounds;
  totalWaves: number;
  initialGold: number;
  initialLife: number;
}

export interface GameStatsSnapshot {
  gold: number;
  life: number;
  wave: number;
  totalWaves: number;
  selectedTower: TowerType | null;
  statusText: string;
  selectedBuiltTower?: {
    id: string;
    label: string;
    level: number;
    attackType: DamageType;
    upgradeCost: number | null;
    damage: number;
    range: number;
    attackSpeed: number;
  } | null;
  selectedMapName: string;
  skillStates: Array<{
    type: SkillType;
    label: string;
    description: string;
    cooldownRemaining: number;
  }>;
}

export interface PlacementResult {
  ok: boolean;
  reason?: string;
}

export interface SerializedTowerState {
  type: TowerType;
  level: number;
  position: Vector3Tuple;
}

export interface SerializedEnemyState {
  type: EnemyType;
  hp: number;
  progress: number;
  slowMultiplier: number;
  slowTimer: number;
}

export interface SerializedWaveState {
  currentWaveIndex: number;
  spawnQueue: WaveSpawnEntry[];
  spawnTimer: number;
  wavePauseTimer: number;
  awaitingNextWave: boolean;
  finished: boolean;
}

export interface SerializedSkillState {
  cooldowns: Partial<Record<SkillType, number>>;
}

export interface SaveGameState {
  version: 2;
  levelId: string;
  customLevel?: LevelDefinition | null;
  gold: number;
  life: number;
  selectedTower: TowerType | null;
  wave: number;
  towers: SerializedTowerState[];
  enemies: SerializedEnemyState[];
  waveState: SerializedWaveState;
  skillState: SerializedSkillState;
}
