import { createWaveDefinitions, getScaledEnemyStats } from "../config/waveConfig";
import type { EnemyStats, WaveDefinition } from "../types/game";

export class WaveSystem {
  private readonly waves: WaveDefinition[];
  private currentWaveIndex = -1;
  private spawnQueue: WaveDefinition["enemies"] = [];
  private spawnTimer = 0;
  private wavePauseTimer = 1.5;
  private awaitingNextWave = true;
  private finished = false;

  constructor(totalWaves = 8) {
    this.waves = createWaveDefinitions(totalWaves);
  }

  get totalWaves() {
    return this.waves.length;
  }

  get currentWaveNumber() {
    return Math.max(1, this.currentWaveIndex + 1);
  }

  get isFinished() {
    return this.finished;
  }

  getProgressText(activeEnemyCount: number) {
    if (this.finished) {
      return "所有波次已完成，清掉剩余敌人即可获胜。";
    }

    if (this.awaitingNextWave) {
      return `下一波倒计时 ${this.wavePauseTimer.toFixed(1)}s`;
    }

    return `第 ${this.currentWaveNumber} 波进行中，场上敌人 ${activeEnemyCount}`;
  }

  update(delta: number, activeEnemyCount: number, spawnEnemy: (stats: EnemyStats) => void) {
    if (this.finished) {
      return null;
    }

    if (this.awaitingNextWave) {
      if (activeEnemyCount > 0) {
        return null;
      }

      this.wavePauseTimer -= delta;
      if (this.wavePauseTimer > 0) {
        return null;
      }

      this.currentWaveIndex += 1;
      if (this.currentWaveIndex >= this.waves.length) {
        this.finished = true;
        return { waveStarted: false, waveClearedBonus: 0 };
      }

      this.spawnQueue = [...this.waves[this.currentWaveIndex].enemies];
      this.spawnTimer = 0;
      this.awaitingNextWave = false;
      return { waveStarted: true, waveClearedBonus: 0 };
    }

    this.spawnTimer -= delta;
    if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
      const next = this.spawnQueue.shift();
      if (next) {
        spawnEnemy(getScaledEnemyStats(next.type, this.currentWaveIndex));
        this.spawnTimer = next.delay;
      }
    }

    if (this.spawnQueue.length === 0 && activeEnemyCount === 0) {
      this.awaitingNextWave = true;
      this.wavePauseTimer = 5;
      return {
        waveStarted: false,
        waveClearedBonus: this.waves[this.currentWaveIndex].rewardBonus,
      };
    }

    return null;
  }
}
