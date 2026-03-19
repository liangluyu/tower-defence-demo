import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";
import type { DamageType, EnemyStats, SerializedEnemyState } from "../types/game";
import { PathRuntime } from "../utils/path";

export class Enemy {
  readonly mesh: Group;
  readonly maxHp: number;
  readonly reward: number;
  readonly type: EnemyStats["type"];
  progress = 0;
  hp: number;
  alive = true;
  reachedGoal = false;
  private readonly material: MeshStandardMaterial;
  private readonly hpBarFill: Mesh;
  private readonly baseColor: Color;
  private hitFlash = 0;
  private deathFade = 0;
  private slowMultiplier = 1;
  private slowTimer = 0;

  constructor(
    private readonly stats: EnemyStats,
    private readonly path: PathRuntime,
    initialState?: SerializedEnemyState,
  ) {
    this.type = stats.type;
    this.hp = initialState?.hp ?? stats.hp;
    this.maxHp = stats.hp;
    this.reward = stats.reward;
    this.progress = initialState?.progress ?? 0;
    this.slowMultiplier = initialState?.slowMultiplier ?? 1;
    this.slowTimer = initialState?.slowTimer ?? 0;
    this.baseColor = new Color(stats.color);
    this.material = new MeshStandardMaterial({
      color: stats.color,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
    });

    const body = new Mesh(
      new BoxGeometry(stats.size, stats.size, stats.size),
      this.material,
    );
    body.position.y = stats.size / 2;
    body.castShadow = true;
    body.receiveShadow = true;

    const hpBarBg = new Mesh(
      new PlaneGeometry(stats.size * 1.15, 0.11),
      new MeshStandardMaterial({ color: 0x1f2f37 }),
    );
    hpBarBg.position.set(0, stats.size + 0.55, 0);

    this.hpBarFill = new Mesh(
      new PlaneGeometry(stats.size * 1.1, 0.07),
      new MeshStandardMaterial({ color: 0x7cf29c }),
    );
    this.hpBarFill.position.set(0, stats.size + 0.55, 0.01);

    this.mesh = new Group();
    this.mesh.add(body, hpBarBg, this.hpBarFill);
    this.mesh.position.copy(this.path.getPointOnPath(this.progress));
    this.syncHealthBar();
  }

  get position() {
    return this.mesh.position;
  }

  update(delta: number) {
    if (!this.alive) {
      this.updateDeathFade(delta);
      return;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1;
      }
    }

    this.progress += this.stats.speed * this.slowMultiplier * delta;
    if (this.progress >= this.path.pathLength) {
      this.reachedGoal = true;
      this.alive = false;
      this.mesh.visible = false;
      return;
    }

    this.mesh.position.copy(this.path.getPointOnPath(this.progress));

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - delta * 5);
      this.material.color.copy(this.baseColor).lerp(new Color(0xffffff), this.hitFlash);
    } else {
      this.material.color.copy(this.baseColor);
    }
  }

  private updateDeathFade(delta: number) {
    this.deathFade += delta * 2.6;
    this.mesh.scale.setScalar(Math.max(0.1, 1 - this.deathFade * 0.45));
    this.mesh.position.y += delta * 1.4;
    this.material.opacity = Math.max(0, 1 - this.deathFade);
  }

  takeDamage(amount: number, damageType: DamageType) {
    if (!this.alive) {
      return { killed: false, actualDamage: 0 };
    }

    const resistance = this.stats.resistances?.[damageType] ?? 0;
    const actualDamage = Math.max(1, Math.round(amount * (1 - resistance)));
    this.hp = Math.max(0, this.hp - actualDamage);
    this.hitFlash = 0.95;
    this.syncHealthBar();

    if (this.hp <= 0) {
      this.alive = false;
      return { killed: true, actualDamage };
    }

    return { killed: false, actualDamage };
  }

  private syncHealthBar() {
    const healthRatio = this.hp / this.maxHp;
    this.hpBarFill.scale.x = Math.max(0.01, healthRatio);
    this.hpBarFill.position.x = -(1 - healthRatio) * this.stats.size * 0.28;
  }

  applySlow(multiplier: number, duration: number) {
    this.slowMultiplier = Math.min(this.slowMultiplier, multiplier);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  serialize(): SerializedEnemyState {
    return {
      type: this.type,
      hp: this.hp,
      progress: this.progress,
      slowMultiplier: this.slowMultiplier,
      slowTimer: this.slowTimer,
    };
  }

  shouldRemove() {
    return !this.alive && (this.reachedGoal || this.deathFade >= 1);
  }
}
