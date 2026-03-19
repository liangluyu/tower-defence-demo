import type { SkillStats } from "../types/game";

export const skillConfig: Record<SkillStats["type"], SkillStats> = {
  freeze: {
    type: "freeze",
    label: "全域冰缓",
    description: "让场上所有敌人短时间内大幅减速。",
    cooldown: 18,
    duration: 3.5,
    slowMultiplier: 0.35,
  },
  bomb: {
    type: "bomb",
    label: "轨道炸弹",
    description: "对路径中心区域造成一次高额魔法伤害。",
    cooldown: 14,
    radius: 3.2,
    damage: 90,
  },
};
