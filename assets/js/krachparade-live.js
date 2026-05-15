(function () {
  'use strict';

  const API_URL = 'https://track.tanzfuermich.de/location';
  const FALLBACK_CENTER = [48.137154, 11.576124];
  const INITIAL_ZOOM = 14;
  const LIVE_ZOOM = 16;
  const UPDATE_INTERVAL_MS = 30000;
  const AGE_RENDER_INTERVAL_MS = 5000;
  const STALE_AFTER_SECONDS = 10 * 60;

  const selectors = {
    map: '#wagon-map',
    status: '#tracker-status',
    state: '#tracker-state',
    message: '#tracker-message',
    age: '#location-age',
    accuracyCard: '#accuracy-card',
    accuracy: '#location-accuracy'
  };

  let map = null;
  let marker = null;
  let accuracyCircle = null;
  let hasCenteredOnLocation = false;
  let lastLocation = null;

  function getElement(selector) {
    return document.querySelector(selector);
  }

  function setText(selector, value) {
    const element = getElement(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function setHidden(selector, isHidden) {
    const element = getElement(selector);
    if (element) {
      element.hidden = isHidden;
    }
  }

  function setStatus(kind, label, message) {
    const status = getElement(selectors.status);

    if (status) {
      status.classList.remove('is-loading', 'is-live', 'is-stale', 'is-waiting', 'is-error');
      status.classList.add('is-' + kind);
    }

    setText(selectors.state, label);
    setText(selectors.message, message);
  }

  function toFiniteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function getAgeSeconds(data) {
    const apiAge = toFiniteNumber(data.ageSeconds);

    if (apiAge !== null && apiAge >= 0) {
      return Math.round(apiAge);
    }

    const sourceTime = toFiniteNumber(data.sourceTime || data.receivedAt);

    if (sourceTime === null) {
      return null;
    }

    return Math.max(0, Math.round((Date.now() - sourceTime) / 1000));
  }

  function formatAge(seconds) {
    if (seconds === null) {
      return '--';
    }

    if (seconds < 60) {
      return seconds + ' Sekunden';
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
      return minutes + (minutes === 1 ? ' Minute' : ' Minuten');
    }

    const hours = Math.round(minutes / 60);
    return hours + (hours === 1 ? ' Stunde' : ' Stunden');
  }

  function normalizeLocation(data) {
    const lat = toFiniteNumber(data.lat);
    const lon = toFiniteNumber(data.lon);

    if (lat === null || lon === null) {
      throw new Error('Invalid location response');
    }

    return {
      lat,
      lon,
      ageSeconds: getAgeSeconds(data),
      accuracy: toFiniteNumber(data.accuracy),
      receivedAt: toFiniteNumber(data.receivedAt) || Date.now(),
      sourceTime: toFiniteNumber(data.sourceTime)
    };
  }

  function initMap() {
    const mapElement = getElement(selectors.map);

    if (!mapElement || !window.L) {
      setStatus('error', 'Karte offline', 'Karte konnte gerade nicht geladen werden.');
      return false;
    }

    map = window.L.map(mapElement, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView(FALLBACK_CENTER, INITIAL_ZOOM);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    window.setTimeout(function () {
      map.invalidateSize();
    }, 0);

    return true;
  }

  function clearLocationLayers() {
    if (marker) {
      marker.remove();
      marker = null;
    }

    if (accuracyCircle) {
      accuracyCircle.remove();
      accuracyCircle = null;
    }
  }

  function renderMapLocation(location) {
    const latLng = [location.lat, location.lon];

    if (!map) {
      return;
    }

    if (!marker) {
      marker = window.L.marker(latLng).addTo(map);
    } else {
      marker.setLatLng(latLng);
    }

    marker.bindPopup('1CB Wagen');

    if (location.accuracy !== null && location.accuracy > 0) {
      if (!accuracyCircle) {
        accuracyCircle = window.L.circle(latLng, {
          radius: location.accuracy,
          color: '#30f8ff',
          weight: 2,
          fillColor: '#30f8ff',
          fillOpacity: 0.16
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(latLng);
        accuracyCircle.setRadius(location.accuracy);
      }
    } else if (accuracyCircle) {
      accuracyCircle.remove();
      accuracyCircle = null;
    }

    if (!hasCenteredOnLocation) {
      map.setView(latLng, LIVE_ZOOM);
      hasCenteredOnLocation = true;
    }
  }

  function renderLocationDetails(location) {
    const age = location.ageSeconds;
    const ageText = formatAge(age);
    const isStale = age !== null && age > STALE_AFTER_SECONDS;

    if (isStale) {
      const staleAge = formatAge(age);
      setStatus(
        'stale',
        'Nicht live',
        'Standort derzeit nicht live / letzter bekannter Standort vor ' + staleAge
      );
      setText(selectors.age, 'Vor ' + staleAge);
    } else {
      setStatus('live', 'Live', 'Letztes Update vor ' + ageText);
      setText(selectors.age, 'Vor ' + ageText);
    }

    if (location.accuracy !== null && location.accuracy >= 0) {
      setHidden(selectors.accuracyCard, false);
      setText(selectors.accuracy, 'ca. ' + Math.round(location.accuracy) + ' m');
    } else {
      setHidden(selectors.accuracyCard, true);
    }
  }

  function renderNoLocation() {
    lastLocation = null;
    hasCenteredOnLocation = false;
    clearLocationLayers();

    if (map) {
      map.setView(FALLBACK_CENTER, INITIAL_ZOOM);
    }

    setStatus('waiting', 'Wartet', 'Noch kein Standort verf\u00fcgbar.');
    setText(selectors.age, '--');
    setHidden(selectors.accuracyCard, true);
  }

  function renderFetchError() {
    if (lastLocation) {
      renderLocationDetails(lastLocation);
      setStatus('error', 'Verbindung', 'Standort konnte gerade nicht aktualisiert werden.');
      return;
    }

    setStatus('error', 'Verbindung', 'Standort konnte gerade nicht geladen werden.');
    setText(selectors.age, '--');
    setHidden(selectors.accuracyCard, true);
  }

  function updateRenderedAge() {
    if (!lastLocation) {
      return;
    }

    const baseTime = lastLocation.sourceTime || lastLocation.receivedAt;
    lastLocation.ageSeconds = Math.max(0, Math.round((Date.now() - baseTime) / 1000));
    renderLocationDetails(lastLocation);
  }

  function updateLocation() {
    return fetch(API_URL, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Location request failed');
        }

        return response.json();
      })
      .then(function (data) {
        if (!data || data.ok !== true) {
          renderNoLocation();
          return;
        }

        lastLocation = normalizeLocation(data);
        renderMapLocation(lastLocation);
        renderLocationDetails(lastLocation);
      })
      .catch(renderFetchError);
  }

  function startTracker() {
    if (!initMap()) {
      return;
    }

    updateLocation();
    window.setInterval(updateLocation, UPDATE_INTERVAL_MS);
    window.setInterval(updateRenderedAge, AGE_RENDER_INTERVAL_MS);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        updateLocation();
        if (map) {
          window.setTimeout(function () {
            map.invalidateSize();
          }, 0);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTracker);
  } else {
    startTracker();
  }
}());
