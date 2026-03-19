import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import type { TowerStats } from "../types/game";
import type { Enemy } from "./Enemy";

export class Tower {
  readonly mesh: Group;
  readonly position: Vector3;
  readonly range: number;
  readonly cost: number;
  readonly type: TowerStats["type"];
  private readonly head: Mesh;
  private cooldown = 0;
  private attackPulse = 0;

  constructor(readonly stats: TowerStats, position: Vector3) {
    this.type = stats.type;
    this.position = position.clone();
    this.range = stats.attackRange;
    this.cost = stats.cost;

    const base = new Mesh(
      new CylinderGeometry(0.55, 0.8, 0.65, 6),
      new MeshStandardMaterial({
        color: 0x324b55,
        roughness: 0.9,
      }),
    );
    base.castShadow = true;
    base.receiveShadow = true;

    this.head = new Mesh(
      new CylinderGeometry(0.42, 0.5, 0.75, 12),
      new MeshStandardMaterial({
        color: stats.color,
        roughness: 0.28,
        metalness: 0.22,
      }),
    );
    this.head.position.y = 0.62;
    this.head.castShadow = true;

    const ring = new Mesh(
      new TorusGeometry(0.38, 0.09, 10, 20),
      new MeshStandardMaterial({
        color: stats.color,
        emissive: stats.color,
        emissiveIntensity: 0.25,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;

    this.mesh = new Group();
    this.mesh.position.copy(this.position);
    this.mesh.add(base, this.head, ring);
  }

  update(delta: number) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.attackPulse = Math.max(0, this.attackPulse - delta * 3.5);
    const pulseScale = 1 + this.attackPulse * 0.2;
    this.head.scale.setScalar(pulseScale);
  }

  canFire() {
    return this.cooldown <= 0;
  }

  setFired() {
    this.cooldown = 1 / this.stats.attackSpeed;
    this.attackPulse = 1;
  }

  aimAt(target: Enemy) {
    const direction = target.position.clone().sub(this.position);
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }

  findTarget(enemies: Enemy[]) {
    let bestEnemy: Enemy | null = null;
    let bestProgress = -1;

    for (const enemy of enemies) {
      if (!enemy.alive) {
        continue;
      }

      const distance = enemy.position.distanceTo(this.position);
      if (distance > this.range) {
        continue;
      }

      if (enemy.progress > bestProgress) {
        bestEnemy = enemy;
        bestProgress = enemy.progress;
      }
    }

    return bestEnemy;
  }

  isNear(position: Vector3, minDistance = 1.45) {
    return this.position.distanceTo(position) < minDistance;
  }
}
