import type { SaveGameState } from "../types/game";

const SAVE_KEY = "tower-defense-demo-save-v2";

export class SaveSystem {
  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SaveGameState;
    } catch {
      return null;
    }
  }

  save(state: SaveGameState) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
