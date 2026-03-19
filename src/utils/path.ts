import { Vector3 } from "three";
import type { PathDefinition } from "../types/game";

export class PathRuntime {
  readonly pathPoints: Vector3[];
  readonly pathLength: number;
  readonly laneWidth: number;

  constructor(readonly definition: PathDefinition) {
    this.pathPoints = definition.points.map(([x, y, z]) => new Vector3(x, y, z));
    this.pathLength = this.getPathTotalLength();
    this.laneWidth = definition.laneWidth;
  }

  private getPathTotalLength() {
    let length = 0;
    for (let i = 1; i < this.pathPoints.length; i += 1) {
      length += this.pathPoints[i - 1].distanceTo(this.pathPoints[i]);
    }
    return length;
  }

  getPointOnPath(distance: number) {
    if (distance <= 0) {
      return this.pathPoints[0].clone();
    }

    let traveled = 0;
    for (let i = 1; i < this.pathPoints.length; i += 1) {
      const start = this.pathPoints[i - 1];
      const end = this.pathPoints[i];
      const segmentLength = start.distanceTo(end);
      if (traveled + segmentLength >= distance) {
        const t = (distance - traveled) / segmentLength;
        return start.clone().lerp(end, t);
      }
      traveled += segmentLength;
    }

    return this.pathPoints[this.pathPoints.length - 1].clone();
  }

  getDistanceToPath(position: Vector3) {
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 1; i < this.pathPoints.length; i += 1) {
      const a = this.pathPoints[i - 1];
      const b = this.pathPoints[i];
      const ab = b.clone().sub(a);
      const ap = position.clone().sub(a);
      const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()));
      const closest = a.clone().add(ab.multiplyScalar(t));
      minDistance = Math.min(minDistance, closest.distanceTo(position));
    }

    return minDistance;
  }

  getMidPoint() {
    return this.getPointOnPath(this.pathLength * 0.5);
  }
}

export const parseLevelJson = (raw: string) => {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    !parsed ||
    !("path" in parsed) ||
    !("bounds" in parsed)
  ) {
    throw new Error("地图 JSON 结构不完整。");
  }

  return parsed;
};
