(function () {
  'use strict';

  document.body.classList.add('krach-js-booting');

  const CURRENT_DJ_ID = 1;
  const DONATION_URL = 'https://paypal.me/DEINLINK';

  const DJS = [
    {
      id: 'neon-mara',
      name: 'Neon Mara',
      instagram: '@neon.mara',
      instagramUrl: 'https://www.instagram.com/neon.mara/',
      time: '14:00 - 15:00',
      motto: 'Chrome kicks, open-air pressure.',
      image: '/assets/images/krachparade/djs/neon-mara.webp'
    },
    {
      id: 'basstian-null',
      name: 'Basstian Null',
      instagram: '@basstian.null',
      instagramUrl: 'https://www.instagram.com/basstian.null/',
      time: '15:00 - 16:00',
      motto: 'Industrial bounce for moving streets.',
      image: '/assets/images/krachparade/djs/basstian-null.webp'
    },
    {
      id: 'luna-kick',
      name: 'Luna Kick',
      instagram: '@luna.kick',
      instagramUrl: 'https://www.instagram.com/luna.kick/',
      time: '16:00 - 17:00',
      motto: 'Fast smiles, heavy subs.',
      image: '/assets/images/krachparade/djs/luna-kick.webp'
    },
    {
      id: 'rave-kasimir',
      name: 'Rave Kasimir',
      instagram: '@rave.kasimir',
      instagramUrl: 'https://www.instagram.com/rave.kasimir/',
      time: '17:00 - 18:00',
      motto: 'Peak-time dust and parade sirens.',
      image: '/assets/images/krachparade/djs/rave-kasimir.webp'
    },
    {
      id: 'toni-triebwerk',
      name: 'Toni Triebwerk',
      instagram: '@toni.triebwerk',
      instagramUrl: 'https://www.instagram.com/toni.triebwerk/',
      time: '18:00 - 19:00',
      motto: 'Final gear, full collective lift-off.',
      image: '/assets/images/krachparade/djs/toni-triebwerk.webp'
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
    position: '#set-position',
    name: '#dj-name',
    motto: '#dj-motto',
    time: '#dj-time',
    instagramLink: '#instagram-link',
    donationLink: '#donation-link',
    timetable: '#timetable-list',
    waveform: '#waveform'
  };

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

  function getActiveDj() {
    return findDj(getRequestedDjId()) || findDj(CURRENT_DJ_ID) || DJS[0];
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

  function renderTimetable(activeDj) {
    const timetable = getElement(selectors.timetable);
    if (!timetable) {
      return;
    }

    timetable.textContent = '';

    DJS.forEach(function (dj) {
      const item = document.createElement('li');
      item.className = 'timetable__item';

      if (dj.id === activeDj.id) {
        item.classList.add('is-active');
        item.setAttribute('aria-current', 'true');
      }

      const time = document.createElement('span');
      time.className = 'timetable__time';
      time.textContent = dj.time;

      const artist = document.createElement('span');
      artist.className = 'timetable__artist';

      const name = document.createElement('strong');
      name.textContent = dj.name;

      const instagram = document.createElement('span');
      instagram.textContent = dj.instagram;

      artist.append(name, instagram);
      item.append(time, artist);
      timetable.appendChild(item);
    });
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

    const activeDj = getActiveDj();
    const activeIndex = DJS.findIndex(function (dj) {
      return dj.id === activeDj.id;
    });

    if (!activeDj || activeIndex < 0) {
      setErrorState();
      return;
    }

    document.title = '1CB Krachparade - ' + activeDj.name;

    setText(selectors.name, activeDj.name);
    setText(selectors.motto, activeDj.motto);
    setText(selectors.time, activeDj.time);
    setText(selectors.position, 'Set ' + String(activeIndex + 1).padStart(2, '0'));
    setLink(selectors.donationLink, DONATION_URL);

    const instagramLink = getElement(selectors.instagramLink);
    if (instagramLink) {
      instagramLink.href = activeDj.instagramUrl;
      instagramLink.textContent = activeDj.instagram;
      instagramLink.setAttribute('aria-label', activeDj.name + ' auf Instagram');
    }

    renderImage(activeDj);
    renderWaveform(activeIndex);
    renderTimetable(activeDj);
    document.body.classList.remove('krach-js-error');
    document.body.classList.add('krach-js-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderActiveDj);
  } else {
    renderActiveDj();
  }
}());
