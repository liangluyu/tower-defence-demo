import {
  BufferGeometry,
  CircleGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from "three";
import { defaultLevel } from "../config/levels";
import { towerConfig } from "../config/towerConfig";
import { getScaledEnemyStats } from "../config/waveConfig";
import { createCamera } from "../core/camera";
import { GameLoop } from "../core/gameLoop";
import { createRenderer } from "../core/renderer";
import { GameScene } from "../core/scene";
import { Enemy } from "../entities/Enemy";
import { Tower } from "../entities/Tower";
import { CombatSystem } from "../systems/CombatSystem";
import { ResourceSystem } from "../systems/ResourceSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { SkillSystem } from "../systems/SkillSystem";
import { WaveSystem } from "../systems/WaveSystem";
import type {
  GameStatsSnapshot,
  LevelDefinition,
  PlacementResult,
  SaveGameState,
  TowerType,
} from "../types/game";
import { parseLevelJson, PathRuntime } from "../utils/path";
import { GameUI } from "../ui/GameUI";

export class Game {
  private readonly mount: HTMLElement;
  private readonly shell: HTMLDivElement;
  private readonly renderer = createRenderer();
  private readonly camera = createCamera(window.innerWidth / window.innerHeight);
  private readonly raycaster = new Raycaster();
  private readonly mouse = new Vector2();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly previewGroup = new Group();
  private readonly previewDisc: Mesh;
  private readonly previewRange: LineLoop;
  private readonly saveSystem = new SaveSystem();
  private readonly loop = new GameLoop((delta, elapsed) => this.update(delta, elapsed));
  private gameScene: GameScene;
  private scene: Scene;
  private level: LevelDefinition;
  private pathRuntime: PathRuntime;
  private resources: ResourceSystem;
  private waveSystem: WaveSystem;
  private skillSystem: SkillSystem;
  private combatSystem: CombatSystem;
  private readonly ui: GameUI;
  private readonly enemies: Enemy[] = [];
  private selectedBuiltTower: Tower | null = null;
  private running = true;
  private saveTimer = 0;

  constructor(mount: HTMLElement) {
    this.mount = mount;
    const saved = this.saveSystem.load();
    this.level = saved?.customLevel ?? defaultLevel;
    if (saved?.levelId && saved.levelId !== this.level.id && saved.customLevel == null) {
      this.level = defaultLevel;
    }

    this.pathRuntime = new PathRuntime(this.level.path);
    this.gameScene = new GameScene(this.level);
    this.scene = this.gameScene.scene;
    this.resources = new ResourceSystem(this.level.initialGold, this.level.initialLife);
    this.waveSystem = new WaveSystem(this.level.totalWaves);
    this.skillSystem = new SkillSystem();
    this.combatSystem = new CombatSystem(this.scene, {
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
    });

    this.shell = document.createElement("div");
    this.shell.className = "game-shell";
    this.renderer.domElement.className = "game-canvas";
    this.shell.appendChild(this.renderer.domElement);
    this.mount.appendChild(this.shell);

    this.ui = new GameUI(this.shell, {
      onSelectTower: (type) => this.selectTower(type),
      onRestart: () => this.restart(),
      onUpgradeTower: () => this.upgradeSelectedTower(),
      onUseSkill: (type) => this.useSkill(type),
      onApplyMapJson: (raw) => this.applyMapJson(raw),
      onSave: () => this.saveGame(),
      onLoad: () => this.loadSavedGame(),
      onClearSave: () => this.clearSave(),
    });
    this.ui.setMapJson(JSON.stringify(this.level, null, 2));

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    [this.previewDisc, this.previewRange] = this.createPreview();
    this.scene.add(this.previewGroup);

    if (saved) {
      this.restoreSave(saved);
    } else {
      this.resources.setWave(1, this.waveSystem.totalWaves);
    }

    this.bindEvents();
    this.renderUi();
  }

  start() {
    this.loop.start();
  }

  private rebuildSystems(level: LevelDefinition, save?: SaveGameState) {
    this.level = level;
    this.pathRuntime = new PathRuntime(level.path);
    this.gameScene.setLevel(level);
    this.scene = this.gameScene.scene;
    this.resources = new ResourceSystem(level.initialGold, level.initialLife);
    this.waveSystem = new WaveSystem(level.totalWaves, save?.waveState);
    this.skillSystem = new SkillSystem(save?.skillState);
    this.combatSystem.dispose();
    this.combatSystem = new CombatSystem(this.scene, {
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
    });
    this.enemies.length = 0;
    this.selectedBuiltTower = null;
    this.scene.add(this.previewGroup);
  }

  private restoreSave(save: SaveGameState) {
    const level = save.customLevel ?? defaultLevel;
    this.rebuildSystems(level, save);
    this.resources.gold = save.gold;
    this.resources.life = save.life;
    this.resources.selectedTower = save.selectedTower;
    this.resources.setWave(save.wave, level.totalWaves);
    for (const towerState of save.towers) {
      const tower = this.combatSystem.addTower(
        towerState.type,
        new Vector3(...towerState.position),
        towerState.level,
      );
      tower.setSelected(false);
    }
    for (const enemyState of save.enemies) {
      const enemy = new Enemy(
        {
          ...getScaledEnemyStats(enemyState.type, Math.max(0, save.wave - 1)),
          hp: Math.max(enemyState.hp, 1),
        },
        this.pathRuntime,
        enemyState,
      );
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }
    this.resources.setStatus("已载入存档。");
    this.ui.setMapJson(JSON.stringify(level, null, 2));
  }

  private createPreview(): [Mesh, LineLoop] {
    const disc = new Mesh(
      new CircleGeometry(0.55, 24),
      new MeshBasicMaterial({ color: 0x8ce2ff, transparent: true, opacity: 0.28 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.04;

    const ringGeometry = new CircleGeometry(1, 48);
    const positions = ringGeometry.getAttribute("position");
    const linePoints: Vector3[] = [];
    for (let i = 1; i < positions.count; i += 1) {
      linePoints.push(new Vector3(positions.getX(i), 0.06, positions.getZ(i)));
    }

    const range = new LineLoop(
      new BufferGeometry().setFromPoints(linePoints),
      new LineBasicMaterial({ color: 0x8ce2ff, transparent: true, opacity: 0.85 }),
    );

    this.previewGroup.add(disc, range);
    this.previewGroup.visible = false;
    return [disc, range];
  }

  private bindEvents() {
    window.addEventListener("resize", this.handleResize);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);
  }

  private unbindEvents() {
    window.removeEventListener("resize", this.handleResize);
    this.renderer.domElement.removeEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.removeEventListener("pointerdown", this.handlePointerDown);
  }

  private readonly handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    const point = this.getGroundPoint(event);
    if (!point || !this.resources.selectedTower || !this.running) {
      this.previewGroup.visible = false;
      return;
    }

    const snapped = this.snapPlacement(point);
    this.previewGroup.position.copy(snapped);
    const tower = towerConfig[this.resources.selectedTower];
    this.previewRange.scale.setScalar(tower.levels[0].attackRange);
    const placement = this.validatePlacement(snapped);
    const color = placement.ok ? 0x8ce2ff : 0xff7a7a;
    (this.previewDisc.material as MeshBasicMaterial).color.setHex(color);
    (this.previewRange.material as LineBasicMaterial).color.setHex(color);
    this.previewGroup.visible = true;
  };

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!this.running) {
      return;
    }

    const tower = this.pickTower(event);
    if (tower) {
      this.setSelectedBuiltTower(tower);
      this.renderUi();
      return;
    }

    const point = this.getGroundPoint(event);
    const selected = this.resources.selectedTower;
    if (!point || !selected) {
      return;
    }

    const position = this.snapPlacement(point);
    const placement = this.validatePlacement(position);
    if (!placement.ok) {
      this.ui.showToast(placement.reason ?? "无法放置", "error");
      return;
    }

    const stats = towerConfig[selected];
    if (!this.resources.spendGold(stats.cost)) {
      this.ui.showToast("金币不足", "error");
      return;
    }

    const built = this.combatSystem.addTower(selected, position);
    this.setSelectedBuiltTower(built);
    this.resources.setStatus(`${stats.label} 已部署，准备迎敌。`);
    this.ui.showToast(`${stats.label} 部署成功`, "success");
    this.saveGame();
    this.renderUi();
  };

  private pickTower(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.combatSystem.towers.map((tower) => tower.mesh), true);
    if (hits.length === 0) {
      return null;
    }

    let object: Object3D | null = hits[0].object;
    while (object && !object.userData.towerId) {
      object = object.parent;
    }

    if (!object?.userData.towerId) {
      return null;
    }

    return this.combatSystem.getTowerById(String(object.userData.towerId));
  }

  private getGroundPoint(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.ray.intersectPlane(this.groundPlane, new Vector3());
  }

  private snapPlacement(point: Vector3) {
    return new Vector3(Math.round(point.x), 0, Math.round(point.z));
  }

  private validatePlacement(position: Vector3): PlacementResult {
    if (
      position.x < this.level.bounds.minX ||
      position.x > this.level.bounds.maxX ||
      position.z < this.level.bounds.minZ ||
      position.z > this.level.bounds.maxZ
    ) {
      return { ok: false, reason: "超出可建造区域" };
    }

    if (this.pathRuntime.getDistanceToPath(position) < this.level.path.laneWidth + 0.65) {
      return { ok: false, reason: "不能把塔建在道路上" };
    }

    if (this.combatSystem.hasTowerNear(position, 1.6)) {
      return { ok: false, reason: "与其他塔距离过近" };
    }

    return { ok: true };
  }

  private selectTower(type: TowerType) {
    this.resources.setSelectedTower(type);
    this.resources.setStatus(`已选择 ${towerConfig[type].label}。`);
    this.renderUi();
  }

  private setSelectedBuiltTower(tower: Tower | null) {
    if (this.selectedBuiltTower) {
      this.selectedBuiltTower.setSelected(false);
    }
    this.selectedBuiltTower = tower;
    if (tower) {
      tower.setSelected(true);
      this.resources.setStatus(`已选中 ${tower.config.label}，可升级。`);
    }
  }

  private upgradeSelectedTower() {
    const tower = this.selectedBuiltTower;
    if (!tower) {
      this.ui.showToast("先选择一个已建造的塔。", "error");
      return;
    }
    const cost = tower.upgradeCost;
    if (!cost) {
      this.ui.showToast("该塔已满级。", "error");
      return;
    }
    if (!this.resources.spendGold(cost)) {
      this.ui.showToast("金币不足，无法升级。", "error");
      return;
    }
    tower.upgrade();
    this.resources.setStatus(`${tower.config.label} 升级到 ${tower.level} 级。`);
    this.ui.showToast(`升级成功 Lv.${tower.level}`, "success");
    this.saveGame();
    this.renderUi();
  }

  private useSkill(type: "freeze" | "bomb") {
    const result = this.skillSystem.cast(type, this.enemies, this.pathRuntime, (enemy) => this.onEnemyKilled(enemy));
    if (!result.ok) {
      this.ui.showToast(result.reason ?? "技能释放失败。", "error");
      return;
    }
    this.resources.setStatus(result.message ?? "技能已释放。");
    this.ui.showToast(result.message ?? "技能已释放。", "success");
    this.saveGame();
    this.renderUi();
  }

  private spawnEnemy(stats: ConstructorParameters<typeof Enemy>[0]) {
    const enemy = new Enemy(stats, this.pathRuntime);
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
  }

  private onEnemyKilled(enemy: Enemy) {
    this.resources.addGold(enemy.reward);
  }

  private update(delta: number, elapsed: number) {
    void elapsed;
    if (!this.running) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const activeCount = this.enemies.filter((enemy) => enemy.alive).length;
    const waveEvent = this.waveSystem.update(delta, activeCount, (stats) => this.spawnEnemy(stats));

    if (waveEvent?.waveStarted) {
      this.resources.setWave(this.waveSystem.currentWaveNumber, this.waveSystem.totalWaves);
      this.ui.showToast(`第 ${this.waveSystem.currentWaveNumber} 波开始`, "success");
    } else if (waveEvent && waveEvent.waveClearedBonus > 0) {
      this.resources.addGold(waveEvent.waveClearedBonus);
      this.ui.showToast(`波次奖励 +${waveEvent.waveClearedBonus}`, "success");
      if (this.waveSystem.currentWaveNumber < this.waveSystem.totalWaves) {
        this.resources.setWave(this.waveSystem.currentWaveNumber + 1, this.waveSystem.totalWaves);
      }
      this.saveGame();
    }

    for (const enemy of this.enemies) {
      enemy.update(delta);
      if (enemy.reachedGoal) {
        enemy.reachedGoal = false;
        this.resources.loseLife(1);
        this.ui.showToast("敌人突破防线", "error");
      }
    }

    this.skillSystem.update(delta);
    this.combatSystem.update(delta, this.enemies);

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      if (this.enemies[i].shouldRemove()) {
        this.scene.remove(this.enemies[i].mesh);
        this.enemies.splice(i, 1);
      }
    }

    const remaining = this.enemies.filter((enemy) => enemy.alive).length;

    if (this.resources.life <= 0) {
      this.endGame(false);
    } else if (this.waveSystem.isFinished && this.enemies.length === 0) {
      this.endGame(true);
    } else {
      this.resources.setStatus(this.waveSystem.getProgressText(remaining));
    }

    this.saveTimer += delta;
    if (this.saveTimer >= 1) {
      this.saveGame(false);
      this.saveTimer = 0;
    }

    this.renderUi();
    this.renderer.render(this.scene, this.camera);
  }

  private buildSnapshot(): GameStatsSnapshot {
    return {
      gold: this.resources.gold,
      life: this.resources.life,
      wave: this.resources.wave,
      totalWaves: this.resources.totalWaves,
      selectedTower: this.resources.selectedTower,
      statusText: this.resources.statusText,
      selectedMapName: this.level.name,
      skillStates: this.skillSystem.getSnapshot(),
      selectedBuiltTower: this.selectedBuiltTower
        ? {
            id: this.selectedBuiltTower.id,
            label: this.selectedBuiltTower.config.label,
            level: this.selectedBuiltTower.level,
            attackType: this.selectedBuiltTower.attackType,
            upgradeCost: this.selectedBuiltTower.upgradeCost,
            damage: this.selectedBuiltTower.currentStats.damage,
            range: this.selectedBuiltTower.currentStats.attackRange,
            attackSpeed: this.selectedBuiltTower.currentStats.attackSpeed,
          }
        : null,
    };
  }

  private renderUi() {
    this.ui.render(this.buildSnapshot());
  }

  private endGame(victory: boolean) {
    this.running = false;
    this.previewGroup.visible = false;
    if (victory) {
      this.saveSystem.clear();
    }
    this.ui.setEndState(
      victory ? "防线稳住了" : "基地失守",
      victory
        ? "所有波次已清空，你成功守住了终点。"
        : "生命值归零，重新部署塔位再试一次。",
      true,
    );
  }

  private saveGame(showToast = true) {
    const state: SaveGameState = {
      version: 2,
      levelId: this.level.id,
      customLevel: this.level.id === defaultLevel.id ? null : this.level,
      gold: this.resources.gold,
      life: this.resources.life,
      selectedTower: this.resources.selectedTower,
      wave: this.resources.wave,
      towers: this.combatSystem.towers.map((tower) => tower.serialize()),
      enemies: this.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.serialize()),
      waveState: this.waveSystem.serialize(),
      skillState: this.skillSystem.serialize(),
    };
    this.saveSystem.save(state);
    if (showToast) {
      this.ui.showToast("存档已保存", "success");
    }
  }

  private loadSavedGame() {
    const save = this.saveSystem.load();
    if (!save) {
      this.ui.showToast("没有可读取的存档。", "error");
      return;
    }
    this.resetSceneState();
    this.restoreSave(save);
    this.running = true;
    this.ui.setEndState("", "", false);
    this.renderUi();
    this.ui.showToast("存档已读取", "success");
  }

  private clearSave() {
    this.saveSystem.clear();
    this.ui.showToast("存档已清空", "success");
  }

  private applyMapJson(raw: string) {
    try {
      const parsed = parseLevelJson(raw) as LevelDefinition;
      this.resetSceneState();
      this.rebuildSystems(parsed);
      this.resources.setWave(1, parsed.totalWaves);
      this.resources.setStatus("已载入自定义关卡。");
      this.running = true;
      this.ui.setEndState("", "", false);
      this.renderUi();
      this.saveGame(false);
      this.ui.showToast("地图已应用", "success");
    } catch (error) {
      this.ui.showToast(error instanceof Error ? error.message : "地图 JSON 非法。", "error");
    }
  }

  private resetSceneState() {
    this.combatSystem.dispose();
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
    }
    this.enemies.length = 0;
    this.setSelectedBuiltTower(null);
  }

  private restart() {
    this.unbindEvents();
    this.loop.stop();
    this.mount.innerHTML = "";
    new Game(this.mount).start();
  }
}
