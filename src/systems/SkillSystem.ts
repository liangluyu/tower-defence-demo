import { skillConfig } from "../config/skillConfig";
import type { SerializedSkillState, SkillType } from "../types/game";
import type { Enemy } from "../entities/Enemy";
import type { PathRuntime } from "../utils/path";

export class SkillSystem {
  private readonly cooldowns: Record<SkillType, number> = {
    freeze: 0,
    bomb: 0,
  };

  constructor(initialState?: SerializedSkillState) {
    if (initialState?.cooldowns) {
      for (const key of Object.keys(this.cooldowns) as SkillType[]) {
        this.cooldowns[key] = initialState.cooldowns[key] ?? 0;
      }
    }
  }

  update(delta: number) {
    for (const key of Object.keys(this.cooldowns) as SkillType[]) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - delta);
    }
  }

  cast(type: SkillType, enemies: Enemy[], path: PathRuntime, onEnemyKilled: (enemy: Enemy) => void) {
    if (this.cooldowns[type] > 0) {
      return { ok: false, reason: "技能冷却中。" };
    }

    const skill = skillConfig[type];
    this.cooldowns[type] = skill.cooldown;

    if (type === "freeze" && skill.slowMultiplier && skill.duration) {
      for (const enemy of enemies) {
        if (enemy.alive) {
          enemy.applySlow(skill.slowMultiplier, skill.duration);
        }
      }
      return { ok: true, message: "全域冰缓已释放。" };
    }

    if (type === "bomb" && skill.radius && skill.damage) {
      const center = path.getMidPoint();
      for (const enemy of enemies) {
        if (!enemy.alive) {
          continue;
        }
        if (enemy.position.distanceTo(center) <= skill.radius) {
          const result = enemy.takeDamage(skill.damage, "magic");
          if (result.killed) {
            onEnemyKilled(enemy);
          }
        }
      }
      return { ok: true, message: "轨道炸弹已投放。" };
    }

    return { ok: false, reason: "技能未实现。" };
  }

  getSnapshot() {
    return (Object.keys(skillConfig) as SkillType[]).map((type) => ({
      type,
      label: skillConfig[type].label,
      description: skillConfig[type].description,
      cooldownRemaining: this.cooldowns[type],
    }));
  }

  serialize(): SerializedSkillState {
    return {
      cooldowns: { ...this.cooldowns },
    };
  }
}
