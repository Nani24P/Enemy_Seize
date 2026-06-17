# Siege Forge PWA — Phase 2.2 Three Realms

A mobile-first tower-defense PWA with 3 unlocked maps, matte veggie enemies, star ratings, procedural sound/music, codex, profile save slots, boss intros, and offline support.

## Maps

- Jungle Trail
- Dune Split
- Molten Cross

All maps are unlocked from the start.

## Phase 2.2 features

- Only 3 maps in the PWA
- Longer enemy trails/path routes
- Better home page map art cards
- Detailed matte canvas veggie sprites instead of emoji enemies
- Map-specific veggie variants
- Procedural sound effects and simple music loop
- Star ratings per map
- Boss intro screen every 5 waves
- Better map-clear victory screen
- Enemy and tower codex
- Three profile/save slots
- Settings for sound, music, reduced motion, damage numbers, and reset current slot
- Offline service worker cache

## Run locally

Use a local static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Upload all files to a GitHub repo and enable Pages from the root of the main branch.

When testing a new build, use:

```text
?v=2-2
```

If iPhone/iPad keeps the old UI, remove the old Home Screen icon and add it again.
