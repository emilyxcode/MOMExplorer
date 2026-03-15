/**
 * game.js (root) — Virtual player movement and proximity unlocking
 *
 * Arrow keys / WASD: move ~50m per keypress
 * Hold Shift: sprint (4× speed)
 * Space / Enter: open case file for nearest unlocked site
 * Reset button: return to start, clear saved position
 *
 * Player position is saved to localStorage and restored on reload.
 */

const PlayerGame = (() => {
  const STEP_DEG      = 0.00045;        // ~50m per keypress at 1×
  const SPRINT_MULT   = 2;              // Shift adds 2× on top of slider
  const UNLOCK_DIST_M = 500;            // metres to unlock a site
  const START_POS     = [40.32, -74.17]; // Monmouth County centre
  const POS_KEY       = 'momexplorer_pos';
  const SPEED_KEY     = 'momexplorer_speed';

  let playerPos    = [...START_POS];
  let playerMarker = null;
  let leafletMap   = null;
  let shiftHeld    = false;

  // Haversine (self-contained)
  function dist(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const r = d => d * Math.PI / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2
            + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function savePosition() {
    localStorage.setItem(POS_KEY, JSON.stringify(playerPos));
  }

  function loadPosition() {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) playerPos = JSON.parse(saved);
    } catch (e) { /* fall back to START_POS */ }
  }

  function getSliderSpeed() {
    const slider = document.getElementById('speed-slider');
    return slider ? parseInt(slider.value, 10) : 1;
  }

  function step() {
    return STEP_DEG * getSliderSpeed() * (shiftHeld ? SPRINT_MULT : 1);
  }

  function move(dlat, dlng) {
    playerPos[0] += dlat;
    playerPos[1] += dlng;
    playerMarker.setLatLng(playerPos);
    leafletMap.panTo(playerPos, { animate: true, duration: 0.2 });
    savePosition();
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
    document.getElementById('action').textContent =
      shiftHeld
        ? '⚡ Sprint — Arrow keys / WASD • Space to inspect'
        : 'Arrow keys / WASD to move • Space to inspect';

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
    localStorage.removeItem(POS_KEY);
    playerMarker.setLatLng(playerPos);
    leafletMap.setView(playerPos, 11, { animate: true });
    checkProximity();
  }

  function init() {
    // Restore saved position (or start at centre)
    loadPosition();

    leafletMap = MapView._leafletMap || document.getElementById('map')._leaflet_map;

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

    // Show saved name in HUD (title screen may still be fading)
    const savedName = localStorage.getItem('momexplorer_name');
    if (savedName && typeof Story !== 'undefined') Story.updateHudName(savedName);

    // Speed slider — restore saved value and wire up live updates
    const slider = document.getElementById('speed-slider');
    const label  = document.getElementById('speed-label');
    const savedSpeed = parseInt(localStorage.getItem(SPEED_KEY), 10);
    if (savedSpeed >= 1 && savedSpeed <= 20) slider.value = savedSpeed;
    label.textContent = `${slider.value}×`;
    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}×`;
      localStorage.setItem(SPEED_KEY, slider.value);
    });

    // Shift sprint tracking
    document.addEventListener('keydown', e => {
      if (e.key === 'Shift') { shiftHeld = true; checkProximity(); }
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Shift') { shiftHeld = false; checkProximity(); }
    });

    // Keyboard movement
    document.addEventListener('keydown', e => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (!document.getElementById('case-panel').classList.contains('hidden')) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('case-close').click();
        }
        return;
      }

      const s = step();
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); move( s,  0); break;
        case 'ArrowDown':  case 's': case 'S': e.preventDefault(); move(-s,  0); break;
        case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); move(0, -s);  break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move(0,  s);  break;
        case ' ':
        case 'Enter': e.preventDefault(); openNearest(); break;
      }
    });

    // Button controls (always normal speed)
    document.getElementById('panUp').addEventListener('click',    () => move( STEP_DEG * 3,  0));
    document.getElementById('panDown').addEventListener('click',  () => move(-STEP_DEG * 3,  0));
    document.getElementById('panLeft').addEventListener('click',  () => move(0, -STEP_DEG * 3));
    document.getElementById('panRight').addEventListener('click', () => move(0,  STEP_DEG * 3));
    document.getElementById('resetPan').addEventListener('click', resetPosition);
  }

  return { init };
})();
