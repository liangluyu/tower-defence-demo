import { towerConfig } from "../config/towerConfig";
import type { GameStatsSnapshot, TowerType } from "../types/game";

type RestartHandler = () => void;
type SelectTowerHandler = (type: TowerType) => void;
type Tone = "default" | "error" | "success";

export class GameUI {
  private readonly root: HTMLDivElement;
  private readonly goldValue: HTMLDivElement;
  private readonly lifeValue: HTMLDivElement;
  private readonly waveValue: HTMLDivElement;
  private readonly waveCard: HTMLDivElement;
  private readonly towerCards = new Map<TowerType, HTMLButtonElement>();
  private readonly toastContainer: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly overlayTitle: HTMLHeadingElement;
  private readonly overlayText: HTMLParagraphElement;
  private toastSeed = 0;

  constructor(
    mount: HTMLElement,
    onSelectTower: SelectTowerHandler,
    onRestart: RestartHandler,
  ) {
    this.root = document.createElement("div");
    this.root.className = "hud";

    const topBar = document.createElement("div");
    topBar.className = "top-bar";
    this.goldValue = this.createStatCard(topBar, "金币");
    this.lifeValue = this.createStatCard(topBar, "生命");
    this.waveValue = this.createStatCard(topBar, "波次");

    const bottomBar = document.createElement("div");
    bottomBar.className = "bottom-bar";

    const towerPanel = document.createElement("div");
    towerPanel.className = "tower-panel";

    (Object.keys(towerConfig) as TowerType[]).forEach((type) => {
      const stats = towerConfig[type];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tower-card";
      button.innerHTML = `
        <h3>${stats.label}</h3>
        <p>${stats.description}</p>
        <p><strong>花费</strong> ${stats.cost}</p>
        <p><strong>范围</strong> ${stats.attackRange.toFixed(1)} / <strong>攻速</strong> ${stats.attackSpeed.toFixed(1)}</p>
      `;
      button.addEventListener("click", () => onSelectTower(type));
      towerPanel.appendChild(button);
      this.towerCards.set(type, button);
    });

    this.waveCard = document.createElement("div");
    this.waveCard.className = "wave-card";

    bottomBar.append(towerPanel, this.waveCard);

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
    restartBtn.addEventListener("click", onRestart);
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

  render(snapshot: GameStatsSnapshot) {
    this.goldValue.textContent = `${snapshot.gold}`;
    this.lifeValue.textContent = `${snapshot.life}`;
    this.waveValue.textContent = `${snapshot.wave} / ${snapshot.totalWaves}`;
    this.waveCard.innerHTML = `
      <h3>战况</h3>
      <p>${snapshot.statusText}</p>
      <p><strong>当前选择</strong> ${snapshot.selectedTower ? towerConfig[snapshot.selectedTower].label : "无"}</p>
    `;

    this.towerCards.forEach((button, type) => {
      button.classList.toggle("active", snapshot.selectedTower === type);
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
