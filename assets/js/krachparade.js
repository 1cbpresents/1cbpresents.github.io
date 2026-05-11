(function () {
  'use strict';

  const CURRENT_DJ_ID = 'neon-mara';
  const DONATION_URL = 'https://paypal.me/DEINLINK';

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

  function textFrom(parent, selector) {
    const element = parent.querySelector(selector);
    return element ? element.textContent.trim() : '';
  }

  function readDjFromItem(item, index) {
    const data = item.dataset || {};

    return {
      id: data.djId || '',
      name: data.name || textFrom(item, '.timetable__artist strong'),
      instagram: data.instagram || textFrom(item, '.timetable__artist span'),
      instagramUrl: data.instagramUrl || 'https://www.instagram.com/1cb__kollektiv/',
      time: data.time || textFrom(item, '.timetable__time'),
      motto: data.motto || '',
      image: data.image || '',
      item: item,
      index: index
    };
  }

  function getDjs() {
    const timetable = getElement(selectors.timetable);

    if (!timetable) {
      return [];
    }

    return Array.prototype.slice
      .call(timetable.querySelectorAll('.timetable__item'))
      .map(readDjFromItem)
      .filter(function (dj) {
        return dj.id && dj.name;
      });
  }

  function findDj(djs, id) {
    return djs.find(function (dj) {
      return dj.id === id;
    });
  }

  function getActiveDj(djs) {
    return findDj(djs, getRequestedDjId()) || findDj(djs, CURRENT_DJ_ID) || djs[0];
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

    for (let index = 0; index < 24; index += 1) {
      const bar = document.createElement('span');
      const height = 22 + (((index * 17) + (activeIndex * 11)) % 48);
      bar.style.height = height + 'px';
      bar.style.animationDelay = (index * -0.075) + 's';
      waveform.appendChild(bar);
    }
  }

  function renderTimetable(djs, activeDj) {
    djs.forEach(function (dj) {
      dj.item.classList.remove('is-active');
      dj.item.removeAttribute('aria-current');

      if (dj.id === activeDj.id) {
        dj.item.classList.add('is-active');
        dj.item.setAttribute('aria-current', 'true');
      }
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
    const djs = getDjs();

    if (!djs.length) {
      return;
    }

    const activeDj = getActiveDj(djs);

    document.title = '1CB Krachparade - ' + activeDj.name;

    setText(selectors.name, activeDj.name);
    setText(selectors.motto, activeDj.motto);
    setText(selectors.time, activeDj.time);
    setText(selectors.position, 'Set ' + String(activeDj.index + 1).padStart(2, '0'));
    setLink(selectors.donationLink, DONATION_URL);

    const instagramLink = getElement(selectors.instagramLink);
    if (instagramLink) {
      instagramLink.href = activeDj.instagramUrl;
      instagramLink.textContent = activeDj.instagram;
      instagramLink.setAttribute('aria-label', activeDj.name + ' auf Instagram');
    }

    renderImage(activeDj);
    renderWaveform(activeDj.index);
    renderTimetable(djs, activeDj);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderActiveDj);
  } else {
    renderActiveDj();
  }
}());
