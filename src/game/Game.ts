import {
  BufferGeometry,
  CircleGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
} from "three";
import { createCamera } from "../core/camera";
import { GameLoop } from "../core/gameLoop";
import { createRenderer } from "../core/renderer";
import { GameScene } from "../core/scene";
import { buildableBounds, mapConfig } from "../config/mapConfig";
import { towerConfig } from "../config/towerConfig";
import { Enemy } from "../entities/Enemy";
import { CombatSystem } from "../systems/CombatSystem";
import { ResourceSystem } from "../systems/ResourceSystem";
import { WaveSystem } from "../systems/WaveSystem";
import { GameUI } from "../ui/GameUI";
import type { PlacementResult, TowerType } from "../types/game";
import { getDistanceToPath } from "../utils/path";

export class Game {
  private readonly shell: HTMLDivElement;
  private readonly renderer = createRenderer();
  private readonly gameScene = new GameScene();
  private readonly scene: Scene = this.gameScene.scene;
  private readonly camera = createCamera(window.innerWidth / window.innerHeight);
  private readonly loop = new GameLoop((delta) => this.update(delta));
  private readonly resources = new ResourceSystem();
  private readonly waveSystem = new WaveSystem(8);
  private readonly combatSystem = new CombatSystem(this.scene, {
    onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
  });
  private readonly ui: GameUI;
  private readonly enemies: Enemy[] = [];
  private readonly raycaster = new Raycaster();
  private readonly mouse = new Vector2();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly previewGroup = new Group();
  private readonly previewDisc: Mesh;
  private readonly previewRange: LineLoop;
  private running = true;

  constructor(private readonly mount: HTMLElement) {
    this.shell = document.createElement("div");
    this.shell.className = "game-shell";
    this.renderer.domElement.className = "game-canvas";
    this.shell.appendChild(this.renderer.domElement);
    this.mount.appendChild(this.shell);

    this.ui = new GameUI(
      this.shell,
      (type) => this.selectTower(type),
      () => this.restart(),
    );

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    [this.previewDisc, this.previewRange] = this.createPreview();
    this.scene.add(this.previewGroup);
    this.resources.setWave(1, this.waveSystem.totalWaves);
    this.bindEvents();
    this.renderUi();
  }

  start() {
    this.loop.start();
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
    this.previewRange.scale.setScalar(tower.attackRange);
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

    this.combatSystem.addTower(stats, position);
    this.resources.setStatus(`${stats.label} 已部署，准备迎敌。`);
    this.ui.showToast(`${stats.label} 部署成功`, "success");
    this.renderUi();
  };

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
      position.x < buildableBounds.minX ||
      position.x > buildableBounds.maxX ||
      position.z < buildableBounds.minZ ||
      position.z > buildableBounds.maxZ
    ) {
      return { ok: false, reason: "超出可建造区域" };
    }

    if (getDistanceToPath(position) < mapConfig.laneWidth + 0.65) {
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

  private spawnEnemy(stats: ConstructorParameters<typeof Enemy>[0]) {
    const enemy = new Enemy(stats);
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
  }

  private onEnemyKilled(enemy: Enemy) {
    this.resources.addGold(enemy.reward);
  }

  private update(delta: number) {
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
    }

    for (const enemy of this.enemies) {
      enemy.update(delta);
      if (enemy.reachedGoal) {
        enemy.reachedGoal = false;
        this.resources.loseLife(1);
        this.ui.showToast("敌人突破防线", "error");
      }
    }

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

    this.renderUi();
    this.renderer.render(this.scene, this.camera);
  }

  private endGame(victory: boolean) {
    this.running = false;
    this.previewGroup.visible = false;
    this.ui.setEndState(
      victory ? "防线稳住了" : "基地失守",
      victory
        ? "所有波次已清空，你成功守住了终点。"
        : "生命值归零，重新部署塔位再试一次。",
      true,
    );
  }

  private renderUi() {
    this.ui.render(this.resources.getSnapshot());
  }

  private restart() {
    this.unbindEvents();
    this.ui.setEndState("", "", false);
    this.combatSystem.dispose();
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
    }
    this.enemies.length = 0;
    this.mount.innerHTML = "";
    this.loop.stop();
    new Game(this.mount).start();
  }
}
