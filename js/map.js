/**
 * map.js — Leaflet map initialization and marker management
 */

const MapView = (() => {
  let leafletMap = null;
  let markers = {};  // id → { marker, location }
  let locations = [];

  // SVG icon factory
  function makeIcon(state) {
    // state: 'locked' | 'unlocked' | 'solved'
    const colors = {
      locked:   '#888888',
      unlocked: '#c9a84c',
      solved:   '#8b1a1a'
    };
    const color = colors[state];
    const label = state === 'solved' ? '✔' : '🔍';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <circle cx="15" cy="15" r="13" fill="${color}" stroke="#fff" stroke-width="2"/>
        <text x="15" y="20" text-anchor="middle" font-size="14" fill="#fff">${label}</text>
        <line x1="24" y1="24" x2="34" y2="34" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      </svg>`;

    return L.divIcon({
      className: `marker-${state}`,
      html: `<div class="marker-icon-svg">${svg}</div>`,
      iconSize:   [36, 44],
      iconAnchor: [18, 44],
      popupAnchor:[0, -44]
    });
  }

  async function init() {
    // Load saved game state
    Game.load();

    // Init Leaflet map centered on Monmouth County, NJ
    leafletMap = L.map('map', {
      center: [40.32, -74.17],
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(leafletMap);

    // Load location data
    const resp = await fetch('data/locations.json');
    locations = await resp.json();

    // Add markers
    locations.forEach(loc => {
      const state = Game.isSolved(loc.id)   ? 'solved'
                  : Game.isUnlocked(loc.id) ? 'unlocked'
                  : 'locked';

      const marker = L.marker(loc.coords, { icon: makeIcon(state) })
        .addTo(leafletMap);

      marker.on('click', () => {
        if (Game.isUnlocked(loc.id) || Game.isSolved(loc.id)) {
          UI.openCaseFile(loc);
        } else {
          UI.showToast('You must visit this location in person to unlock it.');
        }
      });

      markers[loc.id] = { marker, location: loc };
    });

    return locations;
  }

  function updateMarker(id) {
    const entry = markers[id];
    if (!entry) return;
    const state = Game.isSolved(id)   ? 'solved'
                : Game.isUnlocked(id) ? 'unlocked'
                : 'locked';
    entry.marker.setIcon(makeIcon(state));
  }

  async function loadNewStory(url) {
    // Remove existing markers from map
    Object.keys(markers).forEach(id => {
      leafletMap.removeLayer(markers[id].marker);
    });
    markers = {};

    // Load new location data
    const resp = await fetch(url);
    locations = await resp.json();

    // Add markers for new locations
    locations.forEach(loc => {
      const state = Game.isSolved(loc.id)   ? 'solved'
                  : Game.isUnlocked(loc.id) ? 'unlocked'
                  : 'locked';

      const marker = L.marker(loc.coords, { icon: makeIcon(state) })
        .addTo(leafletMap);

      marker.on('click', () => {
        if (Game.isUnlocked(loc.id) || Game.isSolved(loc.id)) {
          UI.openCaseFile(loc);
        } else {
          UI.showToast('You must visit this location in person to unlock it.');
        }
      });

      markers[loc.id] = { marker, location: loc };
    });

    return locations;
  }

  function getLocations() { return locations; }

  function resetAllMarkers() {
    Object.keys(markers).forEach(id => {
      markers[id].marker.setIcon(makeIcon('locked'));
    });
  }

  function showUserPosition(lat, lng) {
    // Draw or move an accuracy circle for user position (subtle)
    if (!MapView._userCircle) {
      MapView._userCircle = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#3a6cc8',
        fillColor: '#3a6cc8',
        fillOpacity: 0.5,
        weight: 2
      }).addTo(leafletMap);
    } else {
      MapView._userCircle.setLatLng([lat, lng]);
    }
  }

  return { init, updateMarker, resetAllMarkers, getLocations, showUserPosition, loadNewStory,
           get _leafletMap() { return leafletMap; } };
})();
