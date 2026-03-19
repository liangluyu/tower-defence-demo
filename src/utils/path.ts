import { Vector3 } from "three";
import { mapConfig } from "../config/mapConfig";

export const pathPoints = mapConfig.points.map(([x, y, z]) => new Vector3(x, y, z));

export const getPathTotalLength = () => {
  let length = 0;
  for (let i = 1; i < pathPoints.length; i += 1) {
    length += pathPoints[i - 1].distanceTo(pathPoints[i]);
  }
  return length;
};

export const pathLength = getPathTotalLength();

export const getPointOnPath = (distance: number) => {
  if (distance <= 0) {
    return pathPoints[0].clone();
  }

  let traveled = 0;
  for (let i = 1; i < pathPoints.length; i += 1) {
    const start = pathPoints[i - 1];
    const end = pathPoints[i];
    const segmentLength = start.distanceTo(end);
    if (traveled + segmentLength >= distance) {
      const t = (distance - traveled) / segmentLength;
      return start.clone().lerp(end, t);
    }
    traveled += segmentLength;
  }

  return pathPoints[pathPoints.length - 1].clone();
};

export const getDistanceToPath = (position: Vector3) => {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 1; i < pathPoints.length; i += 1) {
    const a = pathPoints[i - 1];
    const b = pathPoints[i];
    const ab = b.clone().sub(a);
    const ap = position.clone().sub(a);
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()));
    const closest = a.clone().add(ab.multiplyScalar(t));
    minDistance = Math.min(minDistance, closest.distanceTo(position));
  }

  return minDistance;
};
