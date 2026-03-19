import type { EnemyStats } from "../types/game";

export const enemyConfig: Record<EnemyStats["type"], EnemyStats> = {
  normal: {
    type: "normal",
    label: "普通敌人",
    color: 0xf4d35e,
    hp: 55,
    speed: 2.5,
    reward: 12,
    size: 0.6,
  },
  fast: {
    type: "fast",
    label: "快速敌人",
    color: 0x6fffe9,
    hp: 32,
    speed: 4.4,
    reward: 10,
    size: 0.45,
  },
  tank: {
    type: "tank",
    label: "坦克敌人",
    color: 0xff6b6b,
    hp: 120,
    speed: 1.55,
    reward: 18,
    size: 0.78,
  },
};
