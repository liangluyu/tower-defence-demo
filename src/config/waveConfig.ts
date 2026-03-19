import { enemyConfig } from "./enemyConfig";
import type { EnemyType, WaveDefinition, WaveSpawnEntry } from "../types/game";

const pickType = (slot: number, waveIndex: number): EnemyType => {
  if (waveIndex >= 4 && slot % 5 === 0) {
    return "tank";
  }

  if (waveIndex >= 2 && slot % 3 === 0) {
    return "fast";
  }

  if (waveIndex >= 6 && slot % 4 === 0) {
    return "tank";
  }

  return "normal";
};

export const createWaveDefinitions = (totalWaves = 8): WaveDefinition[] => {
  const waves: WaveDefinition[] = [];

  for (let i = 0; i < totalWaves; i += 1) {
    const count = 5 + i * 2;
    const enemies: WaveSpawnEntry[] = [];

    for (let slot = 0; slot < count; slot += 1) {
      const type = pickType(slot, i);
      const baseDelay = type === "fast" ? 0.72 : type === "tank" ? 1.25 : 0.92;
      enemies.push({
        type,
        delay: Math.max(0.42, baseDelay - i * 0.03),
      });
    }

    waves.push({
      index: i + 1,
      enemies,
      rewardBonus: 25 + i * 15,
    });
  }

  return waves;
};

export const getScaledEnemyStats = (type: EnemyType, waveIndex: number) => {
  const base = enemyConfig[type];
  const hpMultiplier = 1 + waveIndex * 0.2;
  const speedMultiplier = 1 + Math.min(0.22, waveIndex * 0.025);

  return {
    ...base,
    hp: Math.round(base.hp * hpMultiplier),
    speed: Number((base.speed * speedMultiplier).toFixed(2)),
    reward: Math.round(base.reward * (1 + waveIndex * 0.08)),
  };
};
