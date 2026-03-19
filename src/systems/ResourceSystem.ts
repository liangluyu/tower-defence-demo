import type { TowerType } from "../types/game";

export class ResourceSystem {
  gold: number;
  life: number;
  wave = 1;
  totalWaves = 1;
  selectedTower: TowerType | null = "cannon";
  statusText = "点击地面放置防御塔，阻止敌人到达终点。";

  constructor(initialGold = 180, initialLife = 20) {
    this.gold = initialGold;
    this.life = initialLife;
  }

  setWave(wave: number, totalWaves: number) {
    this.wave = wave;
    this.totalWaves = totalWaves;
  }

  setSelectedTower(tower: TowerType | null) {
    this.selectedTower = tower;
  }

  addGold(amount: number) {
    this.gold += amount;
  }

  spendGold(amount: number) {
    if (this.gold < amount) {
      return false;
    }
    this.gold -= amount;
    return true;
  }

  loseLife(amount: number) {
    this.life = Math.max(0, this.life - amount);
  }

  setStatus(text: string) {
    this.statusText = text;
  }
}
