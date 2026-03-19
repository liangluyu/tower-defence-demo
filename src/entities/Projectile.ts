import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { TowerLevelStats, TowerType } from "../types/game";
import type { Enemy } from "./Enemy";

export class Projectile {
  readonly mesh: Mesh;
  readonly position: Vector3;
  alive = true;

  constructor(
    readonly sourcePosition: Vector3,
    readonly towerType: TowerType,
    readonly stats: TowerLevelStats,
    readonly target: Enemy,
    readonly color: number,
  ) {
    this.position = sourcePosition.clone().add(new Vector3(0, 0.7, 0));
    this.mesh = new Mesh(
      new SphereGeometry(towerType === "mortar" ? 0.18 : 0.13, 12, 12),
      new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
      }),
    );
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
  }

  update(delta: number) {
    if (!this.alive) {
      return false;
    }

    if (!this.target.alive) {
      this.alive = false;
      return false;
    }

    const desired = this.target.position.clone().add(new Vector3(0, 0.4, 0));
    const direction = desired.clone().sub(this.position);
    const distance = direction.length();
    const step = this.stats.projectileSpeed * delta;

    if (distance <= step) {
      this.position.copy(desired);
      this.mesh.position.copy(this.position);
      this.alive = false;
      return true;
    }

    direction.normalize();
    this.position.add(direction.multiplyScalar(step));
    this.mesh.position.copy(this.position);
    return false;
  }
}
