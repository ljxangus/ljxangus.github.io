(function () {
  'use strict';

  var SELECTORS = {
    content: '.lumina-post-content',
    toc: '#luminaToc',
  };
  var BREAKPOINT = 1500;
  var SCROLL_OFFSET = 80;
  var RESIZE_DEBOUNCE_MS = 150;

  var state = {
    observer: null,
    resizeTimer: null,
    initialized: false,
  };

  function shouldRender() {
    return window.matchMedia('(min-width: ' + BREAKPOINT + 'px)').matches;
  }

  function collectHeadings(content) {
    return Array.prototype.slice.call(content.querySelectorAll('h2, h3'));
  }

  function ensureIds(headings) {
    headings.forEach(function (h, i) {
      if (!h.id) {
        h.id = 'toc-heading-' + (i + 1);
      }
    });
  }

  function buildToc(headings) {
    var toc = document.getElementById('luminaToc');
    if (!toc) return;

    if (headings.length === 0) {
      toc.hidden = true;
      toc.innerHTML = '';
      return;
    }

    var title = document.createElement('div');
    title.className = 'lumina-toc-title';
    title.textContent = 'On this page';

    var nav = document.createElement('nav');
    nav.className = 'lumina-toc-list';

    headings.forEach(function (h) {
      var a = document.createElement('a');
      var level = h.tagName.toLowerCase().slice(1);
      a.className = 'lumina-toc-item lumina-toc-item--level-' + level;
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      a.dataset.tocTarget = h.id;
      nav.appendChild(a);
    });

    toc.innerHTML = '';
    toc.appendChild(title);
    toc.appendChild(nav);
    toc.hidden = false;
  }

  function setupActiveTracking(headings) {
    if (!('IntersectionObserver' in window)) return;

    var links = document.querySelectorAll('.lumina-toc-item');
    if (links.length === 0) return;

    var visibleIds = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          visibleIds[e.target.id] = true;
        } else {
          delete visibleIds[e.target.id];
        }
      });

      var firstVisible = null;
      for (var i = 0; i < headings.length; i++) {
        if (visibleIds[headings[i].id]) {
          firstVisible = headings[i].id;
          break;
        }
      }

      links.forEach(function (l) {
        l.classList.toggle('active', l.dataset.tocTarget === firstVisible);
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach(function (h) {
      observer.observe(h);
    });

    state.observer = observer;
  }

  function setupClickHandler() {
    var toc = document.getElementById('luminaToc');
    if (!toc) return;

    toc.addEventListener('click', function (e) {
      var target = e.target;
      if (!target || !target.classList || !target.classList.contains('lumina-toc-item')) {
        return;
      }
      e.preventDefault();
      var id = target.dataset.tocTarget;
      var destination = document.getElementById(id);
      if (!destination) return;

      var top = destination.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({
        top: top,
        behavior: 'smooth',
      });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + id);
      }
    });
  }

  function teardown() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    var toc = document.getElementById('luminaToc');
    if (toc) {
      toc.innerHTML = '';
      toc.hidden = true;
    }
  }

  function init() {
    teardown();

    var content = document.querySelector(SELECTORS.content);
    if (!content) return;

    if (!shouldRender()) return;

    var headings = collectHeadings(content);
    if (headings.length === 0) return;

    ensureIds(headings);
    buildToc(headings);
    setupActiveTracking(headings);
    setupClickHandler();

    state.initialized = true;
  }

  function onResize() {
    if (state.resizeTimer) {
      clearTimeout(state.resizeTimer);
    }
    state.resizeTimer = setTimeout(init, RESIZE_DEBOUNCE_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('resize', onResize);
})();
