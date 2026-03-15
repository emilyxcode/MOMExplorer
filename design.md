# MOMExplorer — Design Document

## Overview

MOMExplorer is a GPS-based historical exploration web app for Monmouth County, NJ. Players physically visit real historical sites; at each location they unlock a Sherlock Holmes–style mini-mystery grounded in actual local history.

---

## Architecture

**Type**: Fully static single-page web app. No backend, no build step.

**Storage**: `localStorage` only — all progress is client-side.

**Deployment**: GitHub Pages (`gh-pages` branch or `/docs` folder).

---

## Tech Choices

| Concern | Library / API | Why |
|---|---|---|
| Map rendering | [Leaflet.js](https://leafletjs.com) (CDN) | Free, open source, no API key required |
| Map tiles | OpenStreetMap via Leaflet default | Free, community-maintained |
| GPS | `navigator.geolocation.watchPosition` | Built into every modern browser |
| Proximity math | Haversine formula (custom, ~20 lines) | No dependency needed |
| Fonts | Google Fonts: Cinzel + Lora | Victorian serif aesthetic, free |
| State | `localStorage` | Simple, zero infrastructure |

---

## File Structure

```
MOMExplorer/
├── index.html          # App shell, layout, Leaflet CDN imports
├── css/
│   └── style.css       # Victorian detective theme
├── js/
│   ├── map.js          # Leaflet map init, marker management
│   ├── gps.js          # watchPosition, Haversine, unlock events
│   ├── game.js         # State machine, localStorage persistence
│   └── ui.js           # Panel/dossier rendering, user interactions
├── data/
│   └── locations.json  # All site data: coords, history, mystery, clues
├── design.md           # This file
└── AGENTS.md           # Development rules
```

---

## Game Loop

1. Map loads centered on Monmouth County with 8 locked markers.
2. User grants GPS permission → `watchPosition` begins.
3. Every GPS update: compute Haversine distance to each locked site.
4. **< 75m**: dispatch `location:unlocked` event → marker turns golden.
5. **75–300m**: show proximity hint toast ("A mystery is near…").
6. User taps an unlocked marker → Case File panel slides up.
7. Panel shows: historical evidence + a multiple-choice mini-mystery.
8. Correct answer → site marked Solved, clue logged to dossier.
9. Dossier button shows all collected clues and solved count.

---

## Data Model (`locations.json`)

```jsonc
{
  "id": "string",           // kebab-case unique ID
  "name": "string",         // Display name
  "coords": [lat, lng],     // WGS84 decimal degrees
  "witness": "string",      // Historical quote / field note (flavor)
  "evidence": "string",     // Historical fact presented as evidence
  "mystery": "string",      // The question to answer
  "choices": ["a", "b", "c"],
  "answer": 0,              // Index into choices[]
  "solved_text": "string"   // Shown on correct answer
}
```

---

## UI Theme

- **Palette**: aged parchment (`#f5e6c8`), dark sepia (`#3b2a1a`), gold accent (`#c9a84c`)
- **Headers**: Cinzel (Google Fonts)
- **Body**: Lora (Google Fonts)
- **Markers**: SVG magnifying glass — grey (locked), gold+pulse (unlocked), red seal (solved)
- **Case File panel**: slides up from bottom, manila folder aesthetic
- **Dossier**: full-screen overlay, list of collected clues

---

## Proximity Thresholds

| Distance | Behavior |
|---|---|
| > 300m | No feedback |
| 75–300m | Toast: "A mystery is near…" |
| < 75m | Location unlocks |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-15 | Vanilla JS, no build step | Matches lightweight constraint; easier for contributors to pick up |
| 2026-03-15 | 75m unlock radius | Accurate enough for on-foot GPS, forgiving of typical mobile GPS drift |
| 2026-03-15 | 8 initial sites | Scope-appropriate MVP; all sites have strong historical content |
| 2026-03-15 | localStorage only | Zero infrastructure; users play offline after first load |
| 2026-03-15 | Virtual keyboard navigation | Arrow keys / WASD move a player marker on the Leaflet map; 500m proximity unlocks sites. GPS remains optional. No physical visit required. |
