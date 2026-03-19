import type { PathDefinition } from "../types/game";

export const mapConfig: PathDefinition = {
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
};

export const buildableBounds = {
  minX: -9.5,
  maxX: 9.5,
  minZ: -8.5,
  maxZ: 8.5,
};
