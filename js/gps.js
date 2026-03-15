/**
 * gps.js — Geolocation, proximity detection, and unlock events
 *
 * Thresholds:
 *   UNLOCK_RADIUS_M   = 75m  → location unlocks
 *   HINT_RADIUS_M     = 300m → "A mystery is near…" toast
 */

const GPS = (() => {
  const UNLOCK_RADIUS_M = 75;
  const HINT_RADIUS_M   = 300;

  // Haversine formula: returns distance in meters between two WGS84 coords
  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in metres
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  let hintCooldown = false;

  function handlePosition(pos) {
    const { latitude: lat, longitude: lng } = pos.coords;

    // Update GPS status bar
    const bar = document.getElementById('gps-bar');
    const statusEl = document.getElementById('gps-status');
    bar.className = 'gps-active';
    statusEl.textContent = `GPS active — ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    // Update user position dot on map
    MapView.showUserPosition(lat, lng);

    const locations = MapView.getLocations();
    let nearestHint = null;
    let nearestDist = Infinity;

    locations.forEach(loc => {
      const dist = haversineDistance(lat, lng, loc.coords[0], loc.coords[1]);

      // Unlock
      if (dist <= UNLOCK_RADIUS_M && !Game.isUnlocked(loc.id) && !Game.isSolved(loc.id)) {
        const wasNew = Game.unlock(loc.id);
        if (wasNew) {
          MapView.updateMarker(loc.id);
          UI.showUnlockNotification(loc.name);
        }
      }

      // Hint (nearest locked site within HINT_RADIUS_M)
      if (dist <= HINT_RADIUS_M && dist > UNLOCK_RADIUS_M
          && !Game.isUnlocked(loc.id) && !Game.isSolved(loc.id)) {
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestHint = loc;
        }
      }
    });

    if (nearestHint && !hintCooldown) {
      UI.showProximityHint(Math.round(nearestDist));
      hintCooldown = true;
      setTimeout(() => { hintCooldown = false; }, 15000); // throttle to once per 15s
    }
  }

  function handleError(err) {
    const bar = document.getElementById('gps-bar');
    const statusEl = document.getElementById('gps-status');
    bar.className = 'gps-error';
    const messages = {
      1: 'GPS permission denied. Enable location to play.',
      2: 'GPS signal unavailable. Try moving outdoors.',
      3: 'GPS request timed out. Retrying…'
    };
    statusEl.textContent = messages[err.code] || 'GPS error.';
  }

  function start() {
    if (!navigator.geolocation) {
      document.getElementById('gps-status').textContent = 'GPS not supported by this browser.';
      return;
    }
    navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge:         5000,
      timeout:            15000
    });
  }

  return { start, haversineDistance };
})();
