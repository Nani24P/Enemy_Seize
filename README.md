# Siege Forge PWA

A mobile-first 5-map tower defense game prototype designed for GitHub Pages and iPhone/iPad PWA install.

## What is included

- 5 handcrafted maps: Grass Path, Desert Split, Ice Loop, Lava Cross, Temple Maze
- 5 towers: Arrow, Cannon, Frost, Flame, Storm
- 5 enemy types: Goblin, Runner, Brute, Shield, Boss
- Gold, lives, waves, upgrades, selling, score saving
- Offline-capable service worker
- Installable PWA manifest
- No build tools required

## Run locally

Open `index.html` in a browser, or use a small local server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy to GitHub Pages from iPad/iPhone

1. Create a new GitHub repository, for example `siege-forge-pwa`.
2. Upload all files from this folder to the repository root.
3. Go to repository Settings → Pages.
4. Set Source to `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Open the GitHub Pages URL on iPhone/iPad.
7. Tap Share → Add to Home Screen.

## Edit maps

Open `data/maps.js`. Each map has:

- `path`: enemy path points
- `secondPath`: optional second path
- `pads`: tower build positions
- `wavesToWin`: campaign clear wave
- `theme`: map colors

## Edit tower balance

Open `data/towers.js` and adjust cost, damage, range, fire rate, splash, slow, burn, or chain values.

## Edit enemies

Open `data/enemies.js` and adjust HP, speed, reward, color, and armor.
