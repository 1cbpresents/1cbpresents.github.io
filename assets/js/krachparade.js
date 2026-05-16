(function () {
  'use strict';

  document.body.classList.add('krach-js-booting');

  const CURRENT_DJ_ID = 2;
  const DONATION_URL = 'https://paypal.me/Timon9Pfeifer';

  const DJS = [
    {
      id: 'toon-sokrates',
      name: 'TOON WORLD & Sokrates',
      instagram: '@toon_world.1cb',
      instagramUrl: 'https://www.instagram.com/toon_world.1cb/',
      instagram2: '@sokrates.music',
      instagramUrl2: 'https://www.instagram.com/sokrates.music/',
      time: '16:00 - 17:00',
      motto: 'Cinematic Psytrance',
      image: '/assets/images/krachparade/djs/toon.webp'
    },
    {
      id: 'pnk-pnthr',
      name: 'pnk pnthr',
      instagram: '@_pnk.pnthr_',
      instagramUrl: 'https://www.instagram.com/_pnk.pnthr_/',
      instagram2: '',
      instagramUrl2: '',
      time: '17:00 - 17:45',
      motto: 'Oldschool Psy',
      image: '/assets/images/krachparade/djs/pnk.webp'
    },
    {
      id: 'luka-v',
      name: 'Luka V',
      instagram: '@mixedbylukav',
      instagramUrl: 'https://www.instagram.com/mixedbylukav/',
      instagram2: '',
      instagramUrl2: '',
      time: '17:45 - 18:30',
      motto: 'Pop Trance',
      image: '/assets/images/krachparade/djs/lukav.webp'
    },
    {
      id: 'every-one',
      name: '.everyone',
      instagram: '@______everyone______________',
      instagramUrl: 'https://www.instagram.com/______everyone______________/',
      instagram2: '',
      instagramUrl2: '',
      time: '18:30 - 19:30',
      motto: 'Peak-time dust and parade sirens.',
      image: '/assets/images/krachparade/djs/every.webp'
    }
  ];

  const WAVEFORM_PATTERN = [
    18, 42, 28, 58, 34, 68, 44, 24,
    52, 36, 64, 30, 48, 70, 26, 56,
    38, 62, 22, 46, 66, 32, 54, 40,
    72, 28, 60, 36, 50, 20, 58, 44
  ];

  const selectors = {
    player: '.now-player',
    image: '#dj-image',
    title: '#now-playing-title',
    name: '#dj-name',
    motto: '#dj-motto',
    time: '#dj-time',
    status: '#dj-status',
    instagramLinks: '#instagram-links',
    backLiveButton: '#back-live-button',
    donationLink: '#donation-link',
    timetable: '#timetable-list',
    waveform: '#waveform'
  };

  let selectedDj = null;

  function getElement(selector) {
    return document.querySelector(selector);
  }

  function getRequestedDjId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('dj');
  }

  function findDjBySetNumber(value) {
    const setNumber = String(value).trim();

    if (!/^\d+$/.test(setNumber)) {
      return null;
    }

    return DJS[Number(setNumber) - 1] || null;
  }

  function findDj(id) {
    const djId = String(id).trim();

    return findDjBySetNumber(djId) || DJS.find(function (dj) {
      return dj.id === djId;
    });
  }

  function getLiveDj() {
    return findDj(getRequestedDjId()) || findDj(CURRENT_DJ_ID) || DJS[0];
  }

  function isSameDj(firstDj, secondDj) {
    return Boolean(firstDj && secondDj && firstDj.id === secondDj.id);
  }

  function setErrorState() {
    document.body.classList.remove('krach-js-ready');
    document.body.classList.add('krach-js-error');
    setText(selectors.name, 'Lineup Error');
    setText(selectors.motto, 'Lineup konnte nicht geladen werden.');
  }

  function setText(selector, value) {
    const element = getElement(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function setLink(selector, url) {
    const element = getElement(selector);
    if (element) {
      element.href = url;
    }
  }

  function hasValue(value) {
    return Boolean(value && String(value).trim());
  }

  function getInstagramHandles(dj) {
    const handles = [];

    if (hasValue(dj.instagram)) {
      handles.push(dj.instagram);
    }

    if (hasValue(dj.instagram2) && hasValue(dj.instagramUrl2)) {
      handles.push(dj.instagram2);
    }

    return handles.join(' / ');
  }

  function getInstagramLinks(dj) {
    const links = [];

    if (hasValue(dj.instagramUrl)) {
      links.push({
        label: hasValue(dj.instagram) ? dj.instagram : 'Instagram',
        url: dj.instagramUrl
      });
    }

    if (hasValue(dj.instagramUrl2)) {
      links.push({
        label: hasValue(dj.instagram2) ? dj.instagram2 : 'Instagram',
        url: dj.instagramUrl2
      });
    }

    return links;
  }

  function renderInstagramLinks(dj) {
    const container = getElement(selectors.instagramLinks);

    if (!container) {
      return;
    }

    const links = getInstagramLinks(dj);
    container.textContent = '';
    container.hidden = !links.length;

    links.forEach(function (link) {
      const anchor = document.createElement('a');
      anchor.className = 'action-btn action-btn--ghost';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.label;
      anchor.setAttribute('aria-label', link.label + ' auf Instagram');
      container.appendChild(anchor);
    });
  }

  function renderWaveform(activeIndex) {
    const waveform = getElement(selectors.waveform);
    if (!waveform) {
      return;
    }

    waveform.textContent = '';

    WAVEFORM_PATTERN.forEach(function (height, index) {
      const bar = document.createElement('span');
      const shiftedHeight = WAVEFORM_PATTERN[(index + (activeIndex * 3)) % WAVEFORM_PATTERN.length];
      bar.style.height = shiftedHeight + 'px';
      bar.style.animationDelay = (index * -0.055) + 's';
      bar.style.animationDuration = (0.8 + ((index % 5) * 0.08)) + 's';
      waveform.appendChild(bar);
    });
  }

  function renderTimetable(liveDj, displayedDj) {
    const timetable = getElement(selectors.timetable);
    if (!timetable) {
      return;
    }

    timetable.textContent = '';

    DJS.forEach(function (dj, index) {
      const item = document.createElement('li');
      item.className = 'timetable__item';

      if (isSameDj(dj, liveDj)) {
        item.classList.add('is-live');
      }

      if (isSameDj(dj, displayedDj)) {
        item.classList.add('is-selected');
        item.setAttribute('aria-current', 'true');
      }

      const button = document.createElement('button');
      button.className = 'timetable__button';
      button.type = 'button';
      button.dataset.djId = dj.id;
      button.setAttribute('aria-label', 'Set ' + String(index + 1).padStart(2, '0') + ' ansehen: ' + dj.name);
      button.addEventListener('click', function () {
        selectedDj = isSameDj(dj, liveDj) ? null : dj;
        renderActiveDj();
        scrollToPlayer();
      });

      const time = document.createElement('span');
      time.className = 'timetable__time';
      time.textContent = dj.time;

      const artist = document.createElement('span');
      artist.className = 'timetable__artist';

      const name = document.createElement('strong');
      name.textContent = dj.name;

      const instagram = document.createElement('span');
      instagram.textContent = getInstagramHandles(dj);

      artist.append(name, instagram);
      button.append(time, artist);
      item.appendChild(button);
      timetable.appendChild(item);
    });
  }

  function scrollToPlayer() {
    const player = getElement(selectors.player);

    if (!player || !player.scrollIntoView) {
      return;
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    player.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function renderBackLiveButton(isBrowsing) {
    const button = getElement(selectors.backLiveButton);

    if (!button) {
      return;
    }

    button.hidden = !isBrowsing;
    button.onclick = function () {
      selectedDj = null;
      renderActiveDj();
      scrollToPlayer();
    };
  }

  function renderImage(dj) {
    const player = getElement(selectors.player);
    const image = getElement(selectors.image);

    if (!player || !image) {
      return;
    }

    player.classList.remove('has-image');
    image.hidden = true;
    image.alt = dj.name + ' DJ portrait';

    image.onload = function () {
      image.hidden = false;
      player.classList.add('has-image');
    };

    image.onerror = function () {
      image.hidden = true;
      player.classList.remove('has-image');
    };

    if (dj.image) {
      image.src = dj.image;
    }
  }

  function renderActiveDj() {
    if (!DJS.length) {
      setErrorState();
      return;
    }

    const liveDj = getLiveDj();
    const displayedDj = selectedDj || liveDj;
    const displayedIndex = DJS.findIndex(function (dj) {
      return dj.id === displayedDj.id;
    });
    const isBrowsing = !isSameDj(displayedDj, liveDj);

    if (!liveDj || !displayedDj || displayedIndex < 0) {
      setErrorState();
      return;
    }

    document.title = '1CB Krachparade - ' + displayedDj.name;

    setText(selectors.title, isBrowsing ? 'Selected set' : 'Now playing');
    setText(selectors.name, displayedDj.name);
    setText(selectors.motto, displayedDj.motto);
    setText(selectors.time, displayedDj.time);
    setText(selectors.status, isBrowsing ? 'SET INFO' : 'LIVE');
    setLink(selectors.donationLink, DONATION_URL);

    renderBackLiveButton(isBrowsing);
    renderInstagramLinks(displayedDj);
    renderImage(displayedDj);
    renderWaveform(displayedIndex);
    renderTimetable(liveDj, displayedDj);
    document.body.classList.remove('krach-js-error');
    document.body.classList.add('krach-js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderActiveDj);
  } else {
    renderActiveDj();
  }
}());
