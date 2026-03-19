import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import { towerConfig } from "../config/towerConfig";
import type { SerializedTowerState, TowerLevelStats, TowerStats, TowerType } from "../types/game";
import type { Enemy } from "./Enemy";

let towerIdSeed = 0;

export class Tower {
  readonly id: string;
  readonly mesh: Group;
  readonly position: Vector3;
  readonly type: TowerType;
  private readonly head: Mesh;
  private readonly ring: Mesh;
  private cooldown = 0;
  private attackPulse = 0;
  private levelIndex = 0;

  constructor(type: TowerType, position: Vector3, initialLevel = 1) {
    this.id = `tower-${towerIdSeed += 1}`;
    this.type = type;
    this.position = position.clone();

    const stats = towerConfig[type];

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

    this.ring = new Mesh(
      new TorusGeometry(0.38, 0.09, 10, 20),
      new MeshStandardMaterial({
        color: stats.color,
        emissive: stats.color,
        emissiveIntensity: 0.25,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.28;

    this.mesh = new Group();
    this.mesh.position.copy(this.position);
    this.mesh.userData.towerId = this.id;
    this.mesh.add(base, this.head, this.ring);

    while (this.level < initialLevel) {
      this.upgrade();
    }
  }

  get config(): TowerStats {
    return towerConfig[this.type];
  }

  get level() {
    return this.levelIndex + 1;
  }

  get currentStats(): TowerLevelStats {
    return this.config.levels[this.levelIndex];
  }

  get range() {
    return this.currentStats.attackRange;
  }

  get attackType() {
    return this.config.attackType;
  }

  get upgradeCost() {
    return this.currentStats.upgradeCost ?? null;
  }

  canUpgrade() {
    return this.levelIndex < this.config.levels.length - 1;
  }

  upgrade() {
    if (!this.canUpgrade()) {
      return false;
    }

    this.levelIndex += 1;
    const scale = 1 + this.levelIndex * 0.12;
    this.head.scale.setScalar(scale);
    this.ring.scale.setScalar(scale);
    return true;
  }

  update(delta: number) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.attackPulse = Math.max(0, this.attackPulse - delta * 3.5);
    const pulseScale = 1 + this.attackPulse * 0.2 + this.levelIndex * 0.12;
    this.head.scale.setScalar(pulseScale);
  }

  canFire() {
    return this.cooldown <= 0;
  }

  setFired() {
    this.cooldown = 1 / this.currentStats.attackSpeed;
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

  setSelected(selected: boolean) {
    const material = this.ring.material as MeshStandardMaterial;
    material.emissiveIntensity = selected ? 0.7 : 0.25;
  }

  serialize(): SerializedTowerState {
    return {
      type: this.type,
      level: this.level,
      position: [this.position.x, this.position.y, this.position.z],
    };
  }
}
