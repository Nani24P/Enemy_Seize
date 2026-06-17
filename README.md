# Siege Forge PWA — Phase 2.0

Mobile-first tower defense PWA with glossy veggie enemies, floating tower forge menu, campaign map progression, tower unlocks, and boss-wave polish.

## Run locally
Open `index.html` from a simple static server, or upload the folder to GitHub Pages.

## Deploy to GitHub Pages
1. Upload all files to a GitHub repository.
2. Go to Settings → Pages.
3. Source: `main` branch, root folder.
4. Open the Pages URL with `?v=2-0` to avoid old service-worker cache.

## Phase 2 features
- Map progression: later maps are locked until previous maps are cleared.
- Tower unlocks: Arrow/Cannon start unlocked; Frost, Flame, and Storm unlock as you clear maps.
- Floating Tower Forge menu appears only when a tower is selected.
- Upgrade button fixed with stable click handling and lower upgrade costs.
- Glossy veggie enemy rendering with highlight/shadow layer.
- Boss veggie wave banner every 5 waves.

## Edit points
- `data/maps.js` — map paths, pads, themes, veggie sets.
- `data/towers.js` — tower cost, damage, range, role, strategy.
- `data/enemies.js` — enemy HP, speed, reward.
- `src/main.js` — game systems and rendering.
- `src/styles.css` — UI polish.
