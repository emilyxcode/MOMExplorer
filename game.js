/**
 * game.js (root) — Virtual player movement and proximity unlocking
 *
 * Adds a player marker to the Leaflet map. Arrow keys / WASD move the player
 * ~50m per keypress. When the player gets within 500m of a historical site,
 * the location unlocks. Space/Enter opens the case file for the nearest site.
 *
 * Depends on: js/game.js (Game), js/map.js (MapView), js/ui.js (UI)
 * Initialized by js/ui.js after MapView.init() completes.
 */

const PlayerGame = (() => {
  const STEP_DEG      = 0.00045;  // ~50m per keypress
  const UNLOCK_DIST_M = 500;      // metres to unlock a site
  const START_POS     = [40.32, -74.17]; // Monmouth County centre

  let playerPos  = [...START_POS];
  let playerMarker = null;
  let leafletMap = null;

  // Haversine (duplicated here so root game.js is self-contained)
  function dist(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const r = d => d * Math.PI / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2
            + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function move(dlat, dlng) {
    playerPos[0] += dlat;
    playerPos[1] += dlng;
    playerMarker.setLatLng(playerPos);
    leafletMap.panTo(playerPos, { animate: true, duration: 0.2 });
    checkProximity();
  }

  function checkProximity() {
    const locations = MapView.getLocations();
    let nearestName = '—';
    let nearestDist = Infinity;
    let nearestLoc  = null;

    locations.forEach(loc => {
      const d = dist(playerPos[0], playerPos[1], loc.coords[0], loc.coords[1]);

      if (d < nearestDist) {
        nearestDist = d;
        nearestName = loc.name;
        nearestLoc  = loc;
      }

      if (d <= UNLOCK_DIST_M && !Game.isUnlocked(loc.id) && !Game.isSolved(loc.id)) {
        const wasNew = Game.unlock(loc.id);
        if (wasNew) {
          MapView.updateMarker(loc.id);
          UI.showUnlockNotification(loc.name);
        }
      }
    });

    // Update HUD
    document.getElementById('pos').textContent =
      `${playerPos[0].toFixed(4)}, ${playerPos[1].toFixed(4)}`;
    document.getElementById('landmark').textContent = nearestName;
    document.getElementById('distance').textContent =
      nearestDist < 10000 ? `${Math.round(nearestDist)}m` : '—';

    // Hint when between 500m and 1500m of a locked site
    if (nearestLoc && nearestDist > UNLOCK_DIST_M && nearestDist < 1500
        && !Game.isUnlocked(nearestLoc.id) && !Game.isSolved(nearestLoc.id)) {
      UI.showProximityHint(Math.round(nearestDist));
    }
  }

  function openNearest() {
    const locations = MapView.getLocations();
    let nearestLoc  = null;
    let nearestDist = Infinity;

    locations.forEach(loc => {
      if (!Game.isUnlocked(loc.id) && !Game.isSolved(loc.id)) return;
      const d = dist(playerPos[0], playerPos[1], loc.coords[0], loc.coords[1]);
      if (d < nearestDist) { nearestDist = d; nearestLoc = loc; }
    });

    if (nearestLoc) {
      UI.openCaseFile(nearestLoc);
    } else {
      UI.showToast('Walk toward a landmark to unlock it first.');
    }
  }

  function resetPosition() {
    playerPos = [...START_POS];
    playerMarker.setLatLng(playerPos);
    leafletMap.setView(playerPos, 11, { animate: true });
    checkProximity();
  }

  function init() {
    // Grab the internal Leaflet map instance via the map div
    leafletMap = MapView._leafletMap || document.getElementById('map')._leaflet_map;

    // Create player marker
    const icon = L.divIcon({
      className: '',
      html: '<div class="player-marker">🧭</div>',
      iconSize:   [32, 32],
      iconAnchor: [16, 28]
    });

    playerMarker = L.marker(playerPos, { icon, zIndexOffset: 1000 })
      .addTo(leafletMap);

    leafletMap.setView(playerPos, 11);
    checkProximity();

    // Keyboard movement
    document.addEventListener('keydown', e => {
      // Don't capture keys when case panel / input is open
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (!document.getElementById('case-panel').classList.contains('hidden')) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('case-close').click();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); move( STEP_DEG,  0);        break;
        case 'ArrowDown':  case 's': case 'S': e.preventDefault(); move(-STEP_DEG,  0);        break;
        case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); move(0, -STEP_DEG);         break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move(0,  STEP_DEG);         break;
        case ' ':
        case 'Enter': e.preventDefault(); openNearest(); break;
      }
    });

    // Button controls
    document.getElementById('panUp').addEventListener('click',    () => move( STEP_DEG * 3,  0));
    document.getElementById('panDown').addEventListener('click',  () => move(-STEP_DEG * 3,  0));
    document.getElementById('panLeft').addEventListener('click',  () => move(0, -STEP_DEG * 3));
    document.getElementById('panRight').addEventListener('click', () => move(0,  STEP_DEG * 3));
    document.getElementById('resetPan').addEventListener('click', resetPosition);

    document.getElementById('action').textContent = 'Arrow keys / WASD to move • Space to inspect';
  }

  return { init };
})();
