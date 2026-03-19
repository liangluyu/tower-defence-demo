# 3D Tower Defense Demo

基于 `Three.js + TypeScript + Vite` 的可玩 3D 塔防 Demo。

## 项目目录

```text
.
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ src
│  ├─ main.ts
│  ├─ style.css
│  ├─ config
│  │  ├─ enemyConfig.ts
│  │  ├─ mapConfig.ts
│  │  ├─ towerConfig.ts
│  │  └─ waveConfig.ts
│  ├─ core
│  │  ├─ camera.ts
│  │  ├─ gameLoop.ts
│  │  ├─ renderer.ts
│  │  └─ scene.ts
│  ├─ entities
│  │  ├─ Enemy.ts
│  │  ├─ Projectile.ts
│  │  └─ Tower.ts
│  ├─ game
│  │  └─ Game.ts
│  ├─ systems
│  │  ├─ CombatSystem.ts
│  │  ├─ ResourceSystem.ts
│  │  └─ WaveSystem.ts
│  ├─ types
│  │  └─ game.ts
│  ├─ ui
│  │  └─ GameUI.ts
│  └─ utils
│     └─ path.ts
└─ README.md
```

## 玩法说明

- 点击底部塔卡片选择塔。
- 移动鼠标到地面可看到放置预览和攻击范围。
- 点击合法区域放塔，敌人会按固定路径前进。
- 塔会自动索敌并发射投射物。
- 敌人死亡获得金币，漏怪会扣生命。
- 清完全部波次获胜，生命归零失败。

## 核心实现

- `config/*`：所有敌人、塔和波次数值都由配置驱动。
- `utils/path.ts`：基于 waypoints 计算路径位置和放塔禁区距离。
- `entities/*`：封装敌人、塔、投射物及它们的视觉反馈。
- `systems/WaveSystem.ts`：控制波次、间隔、生成节奏和奖励。
- `systems/CombatSystem.ts`：处理索敌、射击、AOE、减速和击杀回调。
- `game/Game.ts`：整合场景、交互、资源、胜负和 UI。

## 运行方式

```bash
npm install
npm run dev
```

打开本地 Vite 地址后即可游玩。

## 生产构建

```bash
npm run build
npm run preview
```
