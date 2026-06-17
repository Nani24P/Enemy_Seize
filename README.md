# Siege Forge PWA — Phase 1.9 Ultra Veggie UI

A mobile-first tower-defense PWA that runs on GitHub Pages with no build step.

## New in this build

- Permanent **Tower Forge / Selection** side block removed.
- Tower details are now a **floating hover-style menu** shown only when a tower is selected.
- Incoming enemies are now map-themed vegetable enemies.
- Larger maze/path visuals across maps.
- More background decorations: animals, plants, ruins, ice, lava, temple details.
- Simpler icon-first home page.
- Cleaner map cards with veggie previews.
- Updated PWA cache name so old builds are less likely to stay stuck.

## Run locally

Open `index.html` directly, or use a simple local server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Upload the full folder contents to a GitHub repository.
2. Go to **Settings → Pages**.
3. Choose **Deploy from branch**.
4. Select `main` and `/root`.
5. Open the Pages URL.

## iPhone/iPad cache tip

If an old UI appears, remove the previous Home Screen app and open the site with:

```text
?v=1-9
```

Then add it to Home Screen again.

## Main files

- `index.html` — app structure
- `src/styles.css` — UI theme and mobile layout
- `src/main.js` — game logic and drawing
- `data/maps.js` — map paths, pads, veggie previews
- `data/towers.js` — tower stats and icons
- `data/enemies.js` — enemy stats
