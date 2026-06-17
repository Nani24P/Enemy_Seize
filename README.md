# Siege Forge PWA — Phase 1.5 Beautified UI

This build is a stronger visible UI upgrade of the Phase 1 tower-defense PWA.

## What changed in this version

- New glass/aurora app theme
- New menu hero and realm/map cards
- New game layout with board + side Tower Forge panel
- Clearer top HUD for realm, wave, gold, lives, and score
- Larger bottom tower picker designed for iPhone/iPad touch
- Real tower identities for all 5 towers:
  - Arrow 🏹
  - Cannon 💣
  - Frost ❄️
  - Flame 🔥
  - Storm ⚡
- Custom canvas tower drawings instead of plain circles only
- Tower range circle when a tower is selected
- Tower level dots
- Better enemy health bars and effects
- Better map decoration icons
- Updated service worker cache: `siege-forge-v1-6-beautified-ui`

## Run locally

Open `index.html` directly, or upload everything to GitHub Pages.

## GitHub Pages

1. Create a new GitHub repo.
2. Upload all files from this folder, not the ZIP itself.
3. Go to Settings → Pages.
4. Source: Deploy from branch.
5. Branch: `main`, folder: `/root`.
6. Open the Pages URL on iPhone/iPad.
7. Use Share → Add to Home Screen.

## Important cache note

If your phone still shows the old UI, the previous PWA/service worker is cached.

Try one of these:

- Open the GitHub Pages URL with `?v=1-6` added to the end.
- In Safari, clear website data for your GitHub Pages site.
- Delete the old Home Screen icon and add it again.
- On desktop Chrome, DevTools → Application → Service Workers → Unregister, then reload.

## Files to customize

- `data/towers.js` — tower icons, costs, damage, color, role, strategy text
- `data/maps.js` — map paths, build pads, themes
- `data/enemies.js` — enemy stats
- `src/main.js` — gameplay and canvas drawing
- `src/styles.css` — visual design and mobile UI
