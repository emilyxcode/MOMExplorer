/**
 * game.js (root) — Virtual player movement and proximity unlocking
 *
 * Arrow keys / WASD: continuous movement while held
 * Shift: 2× speed boost
 * Space / Enter: open case file for nearest unlocked site
 * Reset button: return to start, clear saved position
 *
 * Player position is saved to localStorage and restored on reload.
 */

const PlayerGame = (() => {
  const STEP_PER_FRAME = 0.000006;   // degrees per animation frame at speed 1×
  const SPRINT_MULT   = 2;           // Shift doubles speed on top of slider
  const UNLOCK_DIST_M = 450;         // metres to unlock a site
  const BTN_STEP      = 0.00020;     // per D-pad button click
  const START_POS     = [40.32, -74.17];
  const POS_KEY       = 'momexplorer_pos';
  const SPEED_KEY     = 'momexplorer_speed';

  let playerPos    = [...START_POS];
  let playerMarker = null;
  let leafletMap   = null;
  let shiftHeld    = false;

  // Continuous movement: track which keys are currently down
  const keysHeld = new Set();

  // Throttle counters so we don't hit localStorage or checkProximity at 60 fps
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
    return slider ? parseInt(slider.value, 10) : 5;
  }

  function getStepPerFrame() {
    return STEP_PER_FRAME * getSliderSpeed() * (shiftHeld ? SPRINT_MULT : 1);
  }

  function applyMove(dlat, dlng) {
    playerPos[0] += dlat;
    playerPos[1] += dlng;
    playerMarker.setLatLng(playerPos);
    // Follow player without easing so continuous movement stays fluid
    leafletMap.setView(playerPos, leafletMap.getZoom(), { animate: false });

    saveCounter++;
    if (saveCounter >= 90) { savePosition(); saveCounter = 0; }

    proximityCounter++;
    if (proximityCounter >= 8) { checkProximity(); proximityCounter = 0; }
  }

  // requestAnimationFrame movement loop
  function movementLoop() {
    // Don't move while a panel is open
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

    // Hint when between UNLOCK_DIST_M and 1500m of a locked site
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

    // Show saved name in HUD
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

    // Track shift for sprint
    document.addEventListener('keydown', e => {
      if (e.key === 'Shift') { shiftHeld = true; }
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Shift') { shiftHeld = false; }
    });

    // Key tracking for continuous movement
    document.addEventListener('keydown', e => {
      if (document.activeElement?.tagName === 'INPUT') return;

      const moveKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','s','S','a','A','d','D'];
      if (moveKeys.includes(e.key)) {
        e.preventDefault();
        keysHeld.add(e.key);
        return;
      }

      // Case panel: Space/Enter closes it
      if (!document.getElementById('case-panel').classList.contains('hidden')) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('case-close').click();
        }
        return;
      }

      // Space/Enter away from panel: open nearest
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        openNearest();
      }
    });

    document.addEventListener('keyup', e => {
      keysHeld.delete(e.key);
      // Also clear case variants (e.g. 'W' held when capslock toggles to 'w')
      keysHeld.delete(e.key.toLowerCase());
      keysHeld.delete(e.key.toUpperCase());
    });

    // D-pad buttons (discrete steps, slightly larger than per-frame)
    document.getElementById('panUp').addEventListener('click',    () => { applyMove( BTN_STEP, 0); savePosition(); checkProximity(); });
    document.getElementById('panDown').addEventListener('click',  () => { applyMove(-BTN_STEP, 0); savePosition(); checkProximity(); });
    document.getElementById('panLeft').addEventListener('click',  () => { applyMove(0, -BTN_STEP); savePosition(); checkProximity(); });
    document.getElementById('panRight').addEventListener('click', () => { applyMove(0,  BTN_STEP); savePosition(); checkProximity(); });
    document.getElementById('resetPan').addEventListener('click', resetPosition);

    // Start the movement loop
    requestAnimationFrame(movementLoop);
  }

  return { init, resetToStart: resetPosition };
})();
