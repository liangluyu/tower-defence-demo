import type { LevelDefinition } from "../types/game";

export const defaultLevel: LevelDefinition = {
  id: "default-valley",
  name: "裂谷防线",
  description: "基础演示关卡，适合测试塔组合和技能节奏。",
  totalWaves: 8,
  initialGold: 180,
  initialLife: 20,
  bounds: {
    minX: -9.5,
    maxX: 9.5,
    minZ: -8.5,
    maxZ: 8.5,
  },
  path: {
    laneWidth: 1.35,
    points: [
      [-8, 0, -7],
      [-8, 0, -1.5],
      [-2.5, 0, -1.5],
      [-2.5, 0, 3.5],
      [3.2, 0, 3.5],
      [3.2, 0, -3.5],
      [8, 0, -3.5],
    ],
  },
};
