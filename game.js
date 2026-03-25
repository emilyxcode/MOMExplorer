/**
 * game.js (root) — Virtual player movement and proximity unlocking
 *
 * Arrow keys / WASD: continuous movement while held
 * Shift: 2× speed boost
 * Space / Enter: open case file for nearest unlocked site
 * Reset button: return to start, clear saved position
 *
 * Player position is saved to localStorage and restored on reload.
 * Player icon scales with map zoom — same apparent real-world size at all levels.
 */

const PlayerGame = (() => {
  const STEP_PER_FRAME = 0.000018;   // degrees per animation frame at speed 1×  (3× faster than before)
  const SPRINT_MULT   = 2;           // Shift doubles speed on top of slider
  const UNLOCK_DIST_M = 450;         // metres to unlock a site
  const BTN_STEP      = 0.00020;     // per D-pad button click
  const START_POS     = [40.32, -74.17];
  const START_ZOOM    = 14;
  const POS_KEY       = 'momexplorer_pos';
  const SPEED_KEY     = 'momexplorer_speed';

  let playerPos    = [...START_POS];
  let playerMarker = null;
  let leafletMap   = null;
  let shiftHeld    = false;

  const keysHeld = new Set();

  let saveCounter      = 0;
  let proximityCounter = 0;

  // Haversine (self-contained)
  function dist(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const r = d => d * Math.PI / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2
            + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Player icon scales with map zoom so the marker keeps the same apparent real-world footprint.
  // Base size at zoom 14 = 28px emoji. Each zoom level scales by ×1.4.
  function makePlayerIcon(zoom) {
    const fontSize = Math.max(10, Math.min(64, Math.round(28 * Math.pow(1.4, zoom - START_ZOOM))));
    const size     = Math.round(fontSize * 1.4);
    return L.divIcon({
      className: '',
      html: `<div class="player-marker" style="font-size:${fontSize}px">\u{1F9ED}</div>`,
      iconSize:   [size, size],
      iconAnchor: [size / 2, Math.round(size * 0.875)]
    });
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
    return slider ? parseInt(slider.value, 10) : 8;
  }

  function getStepPerFrame() {
    return STEP_PER_FRAME * getSliderSpeed() * (shiftHeld ? SPRINT_MULT : 1);
  }

  function applyMove(dlat, dlng) {
    playerPos[0] += dlat;
    playerPos[1] += dlng;
    playerMarker.setLatLng(playerPos);
    leafletMap.setView(playerPos, leafletMap.getZoom(), { animate: false });

    saveCounter++;
    if (saveCounter >= 90) { savePosition(); saveCounter = 0; }

    proximityCounter++;
    if (proximityCounter >= 8) { checkProximity(); proximityCounter = 0; }
  }

  function movementLoop() {
    const caseOpen = document.getElementById('case-panel')?.classList.contains('visible');
    if (!caseOpen && keysHeld.size > 0) {
      const s = getStepPerFrame();
      let dlat = 0, dlng = 0;
      if (keysHeld.has('ArrowUp')    || keysHeld.has('w') || keysHeld.has('W')) dlat += s;
      if (keysHeld.has('ArrowDown')  || keysHeld.has('s') || keysHeld.has('S')) dlat -= s;
      if (keysHeld.has('ArrowLeft')  || keysHeld.has('a') || keysHeld.has('A')) dlng -= s;
      if (keysHeld.has('ArrowRight') || keysHeld.has('d') || keysHeld.has('D')) dlng += s;
      if (dlat !== 0 || dlng !== 0) applyMove(dlat, dlng);
    }
    requestAnimationFrame(movementLoop);
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

    document.getElementById('pos').textContent =
      `${playerPos[0].toFixed(4)}, ${playerPos[1].toFixed(4)}`;
    document.getElementById('landmark').textContent = nearestName;
    document.getElementById('distance').textContent =
      nearestDist < 10000 ? `${Math.round(nearestDist)}m` : '—';
    document.getElementById('action').textContent =
      shiftHeld
        ? '⚡ Sprint — Arrow keys / WASD • Space to inspect'
        : 'Arrow keys / WASD to move • Space to inspect';

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
    leafletMap.setView(playerPos, START_ZOOM, { animate: true });
    checkProximity();
  }

  function init() {
    loadPosition();

    leafletMap = MapView._leafletMap || document.getElementById('map')._leaflet_map;

    playerMarker = L.marker(playerPos, {
      icon: makePlayerIcon(START_ZOOM),
      zIndexOffset: 1000
    }).addTo(leafletMap);

    // Update icon whenever the user zooms in or out
    leafletMap.on('zoomend', () => {
      playerMarker.setIcon(makePlayerIcon(leafletMap.getZoom()));
    });

    leafletMap.setView(playerPos, START_ZOOM);
    checkProximity();

    const savedName = localStorage.getItem('momexplorer_name');
    if (savedName && typeof Story !== 'undefined') Story.updateHudName(savedName);

    // Speed slider
    const slider = document.getElementById('speed-slider');
    const label  = document.getElementById('speed-label');
    const savedSpeed = parseInt(localStorage.getItem(SPEED_KEY), 10);
    if (savedSpeed >= 1 && savedSpeed <= 20) slider.value = savedSpeed;
    label.textContent = `${slider.value}×`;
    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}×`;
      localStorage.setItem(SPEED_KEY, slider.value);
    });

    // Shift toggles sprint on/off (press once to enable, press again to disable)
    document.addEventListener('keydown', e => {
      if (e.key === 'Shift' && !e.repeat) {
        e.preventDefault();
        shiftHeld = !shiftHeld;
        document.getElementById('action').textContent = shiftHeld
          ? '⚡ Sprint ON — Arrow keys / WASD • Space to inspect'
          : 'Arrow keys / WASD to move • Space to inspect';
      }
    });

    document.addEventListener('keydown', e => {
      if (document.activeElement?.tagName === 'INPUT') return;

      const moveKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','s','S','a','A','d','D'];
      if (moveKeys.includes(e.key)) {
        e.preventDefault();
        keysHeld.add(e.key);
        return;
      }

      if (!document.getElementById('case-panel').classList.contains('hidden')) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('case-close').click();
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        openNearest();
      }
    });

    document.addEventListener('keyup', e => {
      keysHeld.delete(e.key);
      keysHeld.delete(e.key.toLowerCase());
      keysHeld.delete(e.key.toUpperCase());
    });

    document.getElementById('panUp').addEventListener('click',    () => { applyMove( BTN_STEP, 0); savePosition(); checkProximity(); });
    document.getElementById('panDown').addEventListener('click',  () => { applyMove(-BTN_STEP, 0); savePosition(); checkProximity(); });
    document.getElementById('panLeft').addEventListener('click',  () => { applyMove(0, -BTN_STEP); savePosition(); checkProximity(); });
    document.getElementById('panRight').addEventListener('click', () => { applyMove(0,  BTN_STEP); savePosition(); checkProximity(); });
    document.getElementById('resetPan').addEventListener('click', resetPosition);

    requestAnimationFrame(movementLoop);
  }

  return { init, resetToStart: resetPosition };
})();
