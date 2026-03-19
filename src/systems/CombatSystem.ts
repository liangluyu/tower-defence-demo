import { Vector3 } from "three";
import type { Scene } from "three";
import { towerConfig } from "../config/towerConfig";
import type { TowerType } from "../types/game";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Tower } from "../entities/Tower";

interface CombatHandlers {
  onEnemyKilled: (enemy: Enemy) => void;
}

export class CombatSystem {
  readonly towers: Tower[] = [];
  readonly projectiles: Projectile[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly handlers: CombatHandlers,
  ) {}

  addTower(type: TowerType, position: Vector3, initialLevel = 1) {
    const tower = new Tower(type, position, initialLevel);
    this.towers.push(tower);
    this.scene.add(tower.mesh);
    return tower;
  }

  getTowerById(id: string) {
    return this.towers.find((tower) => tower.id === id) ?? null;
  }

  update(delta: number, enemies: Enemy[]) {
    for (const tower of this.towers) {
      tower.update(delta);
      const target = tower.findTarget(enemies);
      if (!target) {
        continue;
      }

      tower.aimAt(target);
      if (!tower.canFire()) {
        continue;
      }

      tower.setFired();
      const projectile = new Projectile(
        tower.position,
        tower.type,
        tower.currentStats,
        target,
        tower.config.color,
      );
      this.projectiles.push(projectile);
      this.scene.add(projectile.mesh);
    }

    for (const projectile of this.projectiles) {
      const impact = projectile.update(delta);
      if (!impact) {
        continue;
      }

      this.resolveImpact(projectile, enemies);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (!this.projectiles[i].alive) {
        this.scene.remove(this.projectiles[i].mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveImpact(projectile: Projectile, enemies: Enemy[]) {
    const directTarget = projectile.target;
    const towerType = projectile.towerType;
    const towerDef = towerConfig[towerType];
    const { damage, splashRadius, slowDuration, slowMultiplier } = projectile.stats;

    const applyHit = (enemy: Enemy, amount: number) => {
      if (!enemy.alive) {
        return;
      }

      const result = enemy.takeDamage(amount, towerDef.attackType);
      if (slowMultiplier && slowDuration) {
        enemy.applySlow(slowMultiplier, slowDuration);
      }

      if (result.killed) {
        this.handlers.onEnemyKilled(enemy);
      }
    };

    if (splashRadius) {
      for (const enemy of enemies) {
        if (!enemy.alive) {
          continue;
        }

        if (enemy.position.distanceTo(directTarget.position) <= splashRadius) {
          applyHit(enemy, damage);
        }
      }
      return;
    }

    applyHit(directTarget, damage);
  }

  hasTowerNear(position: Vector3, minDistance?: number) {
    return this.towers.some((tower) => tower.isNear(position, minDistance));
  }

  dispose() {
    for (const tower of this.towers) {
      this.scene.remove(tower.mesh);
    }
    for (const projectile of this.projectiles) {
      this.scene.remove(projectile.mesh);
    }
    this.towers.length = 0;
    this.projectiles.length = 0;
  }
}
