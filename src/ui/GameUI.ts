import { skillConfig } from "../config/skillConfig";
import { towerConfig } from "../config/towerConfig";
import type { GameStatsSnapshot, SkillType, TowerType } from "../types/game";

type Tone = "default" | "error" | "success";

interface GameUIHandlers {
  onSelectTower: (type: TowerType) => void;
  onRestart: () => void;
  onUpgradeTower: () => void;
  onUseSkill: (type: SkillType) => void;
  onApplyMapJson: (raw: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onClearSave: () => void;
}

export class GameUI {
  private readonly handlers: GameUIHandlers;
  private readonly root: HTMLDivElement;
  private readonly goldValue: HTMLDivElement;
  private readonly lifeValue: HTMLDivElement;
  private readonly waveValue: HTMLDivElement;
  private readonly waveCard: HTMLDivElement;
  private readonly towerCards = new Map<TowerType, HTMLButtonElement>();
  private readonly skillButtons = new Map<SkillType, HTMLButtonElement>();
  private readonly towerDetailCard: HTMLDivElement;
  private readonly toastContainer: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly overlayTitle: HTMLHeadingElement;
  private readonly overlayText: HTMLParagraphElement;
  private readonly mapTextarea: HTMLTextAreaElement;
  private toastSeed = 0;

  constructor(mount: HTMLElement, handlers: GameUIHandlers) {
    this.handlers = handlers;
    this.root = document.createElement("div");
    this.root.className = "hud";

    const topBar = document.createElement("div");
    topBar.className = "top-bar";
    this.goldValue = this.createStatCard(topBar, "金币");
    this.lifeValue = this.createStatCard(topBar, "生命");
    this.waveValue = this.createStatCard(topBar, "波次");

    const bottomBar = document.createElement("div");
    bottomBar.className = "bottom-bar";

    const leftPanel = document.createElement("div");
    leftPanel.className = "left-stack";

    const towerPanel = document.createElement("div");
    towerPanel.className = "tower-panel";

    (Object.keys(towerConfig) as TowerType[]).forEach((type) => {
      const stats = towerConfig[type];
      const baseLevel = stats.levels[0];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tower-card";
      button.innerHTML = `
        <h3>${stats.label}</h3>
        <p>${stats.description}</p>
        <p><strong>花费</strong> ${stats.cost}</p>
        <p><strong>攻击</strong> ${stats.attackType === "physical" ? "物理" : "魔法"}</p>
        <p><strong>范围</strong> ${baseLevel.attackRange.toFixed(1)} / <strong>攻速</strong> ${baseLevel.attackSpeed.toFixed(1)}</p>
      `;
      button.addEventListener("click", () => handlers.onSelectTower(type));
      towerPanel.appendChild(button);
      this.towerCards.set(type, button);
    });

    this.towerDetailCard = document.createElement("div");
    this.towerDetailCard.className = "wave-card";

    const skillPanel = document.createElement("div");
    skillPanel.className = "skill-panel wave-card";
    skillPanel.innerHTML = "<h3>全局技能</h3>";
    const skillButtonWrap = document.createElement("div");
    skillButtonWrap.className = "skill-buttons";
    (Object.keys(skillConfig) as SkillType[]).forEach((type) => {
      const skill = skillConfig[type];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "skill-button";
      button.textContent = skill.label;
      button.addEventListener("click", () => handlers.onUseSkill(type));
      skillButtonWrap.appendChild(button);
      this.skillButtons.set(type, button);
    });
    skillPanel.appendChild(skillButtonWrap);

    leftPanel.append(towerPanel, this.towerDetailCard, skillPanel);

    const rightPanel = document.createElement("div");
    rightPanel.className = "right-stack";

    this.waveCard = document.createElement("div");
    this.waveCard.className = "wave-card";

    const editorCard = document.createElement("div");
    editorCard.className = "wave-card editor-card";
    editorCard.innerHTML = `
      <h3>关卡 JSON</h3>
      <p>可编辑路径、边界、初始资源并重新载入。</p>
    `;
    this.mapTextarea = document.createElement("textarea");
    this.mapTextarea.className = "map-editor";
    const editorActions = document.createElement("div");
    editorActions.className = "editor-actions";
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "应用地图";
    applyButton.addEventListener("click", () => handlers.onApplyMapJson(this.mapTextarea.value));
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "手动存档";
    saveButton.addEventListener("click", handlers.onSave);
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = "读取存档";
    loadButton.addEventListener("click", handlers.onLoad);
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "清空存档";
    clearButton.addEventListener("click", handlers.onClearSave);
    editorActions.append(applyButton, saveButton, loadButton, clearButton);
    editorCard.append(this.mapTextarea, editorActions);

    rightPanel.append(this.waveCard, editorCard);

    bottomBar.append(leftPanel, rightPanel);

    this.toastContainer = document.createElement("div");
    this.toastContainer.className = "toast";

    this.overlay = document.createElement("div");
    this.overlay.className = "overlay";
    this.overlay.style.display = "none";
    const messageCard = document.createElement("div");
    messageCard.className = "message-card";
    this.overlayTitle = document.createElement("h2");
    this.overlayText = document.createElement("p");
    const restartBtn = document.createElement("button");
    restartBtn.textContent = "重新开始";
    restartBtn.addEventListener("click", handlers.onRestart);
    messageCard.append(this.overlayTitle, this.overlayText, restartBtn);
    this.overlay.appendChild(messageCard);

    this.root.append(topBar, bottomBar, this.toastContainer, this.overlay);
    mount.appendChild(this.root);
  }

  private createStatCard(parent: HTMLElement, label: string) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<div class="stat-label">${label}</div>`;
    const value = document.createElement("div");
    value.className = "stat-value";
    value.textContent = "0";
    card.appendChild(value);
    parent.appendChild(card);
    return value;
  }

  setMapJson(raw: string) {
    this.mapTextarea.value = raw;
  }

  render(snapshot: GameStatsSnapshot) {
    this.goldValue.textContent = `${snapshot.gold}`;
    this.lifeValue.textContent = `${snapshot.life}`;
    this.waveValue.textContent = `${snapshot.wave} / ${snapshot.totalWaves}`;
    this.waveCard.innerHTML = `
      <h3>战况</h3>
      <p>${snapshot.statusText}</p>
      <p><strong>地图</strong> ${snapshot.selectedMapName}</p>
      <p><strong>当前建造</strong> ${snapshot.selectedTower ? towerConfig[snapshot.selectedTower].label : "无"}</p>
    `;

    if (snapshot.selectedBuiltTower) {
      this.towerDetailCard.innerHTML = `
        <h3>已选塔</h3>
        <p><strong>${snapshot.selectedBuiltTower.label}</strong> Lv.${snapshot.selectedBuiltTower.level}</p>
        <p><strong>伤害类型</strong> ${snapshot.selectedBuiltTower.attackType === "physical" ? "物理" : "魔法"}</p>
        <p><strong>伤害</strong> ${snapshot.selectedBuiltTower.damage} / <strong>范围</strong> ${snapshot.selectedBuiltTower.range.toFixed(1)}</p>
        <p><strong>攻速</strong> ${snapshot.selectedBuiltTower.attackSpeed.toFixed(2)}</p>
        <button type="button" class="action-button upgrade-button" ${snapshot.selectedBuiltTower.upgradeCost ? "" : "disabled"}>
          ${snapshot.selectedBuiltTower.upgradeCost ? `升级 (${snapshot.selectedBuiltTower.upgradeCost})` : "已满级"}
        </button>
      `;
      this.towerDetailCard.querySelector("button")?.addEventListener("click", () => this.handlers.onUpgradeTower());
    } else {
      this.towerDetailCard.innerHTML = `
        <h3>塔升级</h3>
        <p>点击场景中的已建造防御塔，可以查看属性并升级到 3 级。</p>
      `;
    }

    this.towerCards.forEach((button, type) => {
      button.classList.toggle("active", snapshot.selectedTower === type);
    });

    snapshot.skillStates.forEach((skillState) => {
      const button = this.skillButtons.get(skillState.type);
      if (!button) {
        return;
      }
      button.textContent = skillState.cooldownRemaining > 0
        ? `${skillState.label} ${skillState.cooldownRemaining.toFixed(1)}s`
        : skillState.label;
      button.disabled = skillState.cooldownRemaining > 0;
      button.title = skillState.description;
    });
  }

  showToast(text: string, tone: Tone = "default") {
    const toast = document.createElement("div");
    toast.className = `toast-item${tone === "default" ? "" : ` ${tone}`}`;
    toast.textContent = text;
    const id = ++this.toastSeed;
    toast.dataset.id = String(id);
    this.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      if (toast.dataset.id === String(id)) {
        toast.remove();
      }
    }, 1800);
  }

  setEndState(title: string, text: string, visible: boolean) {
    this.overlayTitle.textContent = title;
    this.overlayText.textContent = text;
    this.overlay.style.display = visible ? "flex" : "none";
  }
}
