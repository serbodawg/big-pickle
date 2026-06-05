/* ===================================================================
   Big Pickle — Script
   SPA router, theme manager, i18n, search, filtering, render.
   Zero dependencies. Works on old browsers.
   =================================================================== */
(function() {
  'use strict';

  /* ---------- DOM refs ---------- */
  var html = document.documentElement;
  var pages = document.querySelectorAll('.page');
  var navLinks = document.querySelectorAll('.nav-link, [data-page]');
  var themeOpts = document.querySelectorAll('.theme-opt');
  var langOpts = document.querySelectorAll('.lang-opt');
  var langBtn = document.querySelector('.lang-current');
  var langMenu = document.querySelector('.lang-menu');
  var themeMenu = document.querySelector('.theme-menu');
  var featuredGrid = document.getElementById('featured-grid');
  var appsGrid = document.getElementById('apps-grid');
  var releasesList = document.getElementById('latest-releases');
  var changelogList = document.getElementById('changelog-list');
  var changelogSelect = document.getElementById('changelog-project');
  var searchInput = document.getElementById('search-input');
  var filterBtns = document.querySelectorAll('.filter-btn');
  var emptyState = document.getElementById('empty-state');
  var navToggle = document.querySelector('.nav-toggle');
  var navList = document.querySelector('.nav-list');
  var contactForm = document.getElementById('contact-form');
  var formStatus = document.getElementById('form-status');
  var statProjects = document.getElementById('stat-projects');

  /* ---------- Data ---------- */
  var projects = [];
  try {
    var dataEl = document.getElementById('project-data');
    if (dataEl) projects = JSON.parse(dataEl.textContent);
  } catch(e) { projects = []; }

  var translations = {};
  try {
    var transEl = document.getElementById('translation-data');
    if (transEl) translations = JSON.parse(transEl.textContent);
  } catch(e) { translations = {}; }

  /* ---------- State ---------- */
  var currentLang = localStorage.getItem('bp-lang') || 'en';
  var currentTheme = localStorage.getItem('bp-theme') || 'pickle-green';
  var currentPage = 'home';
  var currentFilter = 'all';
  var currentSearch = '';

  /* ---------- Init ---------- */
  html.setAttribute('data-lang', currentLang);
  html.setAttribute('data-theme', currentTheme);
  updateActiveLang(currentLang);
  updateActiveTheme(currentTheme);

  /* ==================================================================
     THEME MANAGER
     ================================================================== */
  function setTheme(name) {
    currentTheme = name;
    html.setAttribute('data-theme', name);
    localStorage.setItem('bp-theme', name);
    updateActiveTheme(name);
  }

  function updateActiveTheme(name) {
    for (var i = 0; i < themeOpts.length; i++) {
      var opt = themeOpts[i];
      if (opt.getAttribute('data-theme') === name) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    }
  }

  /* ==================================================================
     LANGUAGE MANAGER
     ================================================================== */
  function setLanguage(code) {
    currentLang = code;
    html.setAttribute('data-lang', code);
    localStorage.setItem('bp-lang', code);
    updateActiveLang(code);
    translatePage();
    renderAll(); /* re-render project data with new language */
  }

  function updateActiveLang(code) {
    if (langBtn) langBtn.textContent = code.toUpperCase();
    for (var i = 0; i < langOpts.length; i++) {
      var opt = langOpts[i];
      if (opt.getAttribute('data-lang') === code) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    }
  }

  function t(key) {
    var langData = translations[currentLang];
    if (!langData) return key;
    return langData[key] || key;
  }

  /* Translate all elements with data-i18n */
  function translatePage() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        /* handled by data-i18n-placeholder */
      } else if (el.tagName === 'SELECT') {
        var optionText = t(key);
        /* Only translate if this is a simple label, not the <select> itself */
      } else {
        el.innerHTML = val;
      }
    }
    /* Translate placeholders */
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var i = 0; i < phEls.length; i++) {
      phEls[i].setAttribute('placeholder', t(phEls[i].getAttribute('data-i18n-placeholder')));
    }
  }

  /* ==================================================================
     PAGE ROUTER
     ================================================================== */
  function navigateTo(pageId) {
    if (pageId === currentPage) return;
    currentPage = pageId;

    /* Show/hide pages */
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    /* Update nav */
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].classList.remove('active');
      if (navLinks[i].getAttribute('data-page') === pageId) {
        navLinks[i].classList.add('active');
      }
    }

    /* Close mobile nav */
    if (navList) navList.classList.remove('open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');

    /* Scroll to top */
    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* Page-specific rendering */
    if (pageId === 'home') renderHome();
    if (pageId === 'apps') renderApps();
    if (pageId === 'changelog') renderChangelog();
  }

  /* ==================================================================
     PROJECT HELPERS
     ================================================================== */
  function getProjectName(proj) {
    var i18n = proj.i18n && proj.i18n[currentLang];
    return i18n ? i18n.name : proj.id;
  }

  function getProjectDesc(proj) {
    var i18n = proj.i18n && proj.i18n[currentLang];
    return i18n ? i18n.desc : '';
  }

  function getCategoryLabel(cat) {
    return t('category_' + cat) || cat;
  }

  /* Get project version for display, newest changelog entry */
  function getLatestVersion(proj) {
    return proj.version || '0.0.0';
  }

  /* Generate changelog items for a project */
  function getChangelog(proj) {
    return proj.changelog || [];
  }

  /* Sort projects by recency (based on first changelog date) */
  function getProjectDate(proj) {
    var cl = getChangelog(proj);
    if (cl.length > 0) return cl[0].date || '2000-01-01';
    return '2000-01-01';
  }

  /* Get all changelog entries across all projects */
  function getAllChangelogEntries() {
    var entries = [];
    for (var i = 0; i < projects.length; i++) {
      var proj = projects[i];
      var cl = getChangelog(proj);
      for (var j = 0; j < cl.length; j++) {
        entries.push({
          projectId: proj.id,
          projectName: getProjectName(proj),
          version: cl[j].version,
          date: cl[j].date,
          items: cl[j].items
        });
      }
    }
    entries.sort(function(a, b) { return b.date.localeCompare(a.date); });
    return entries;
  }

  /* Count total releases */
  function countReleases() {
    var count = 0;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].changelog) count += projects[i].changelog.length;
    }
    return count;
  }

  /* ==================================================================
     RENDER: Project Card
     ================================================================== */
  function createProjectCard(proj) {
    var name = getProjectName(proj);
    var desc = getProjectDesc(proj);
    var version = getLatestVersion(proj);
    var cat = getCategoryLabel(proj.category);
    var screenshot = proj.screenshots && proj.screenshots[0] ? proj.screenshots[0] : '';

    var card = document.createElement('article');
    card.className = 'project-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', name);

    var html = '';
    if (screenshot) {
      html += '<img class="project-screenshot" src="' + screenshot + '" alt="' + name + ' screenshot" loading="lazy" width="600" height="400">';
    }
    html += '<div class="project-body">';
    html += '  <div class="project-header">';
    html += '    <h3 class="project-name">' + escapeHtml(name) + '</h3>';
    html += '    <span class="project-version">' + escapeHtml(version) + '</span>';
    html += '  </div>';
    html += '  <span class="project-category">' + escapeHtml(cat) + '</span>';
    html += '  <p class="project-desc">' + escapeHtml(desc) + '</p>';
    html += '  <div class="project-actions">';
    html += '    <a href="' + escapeHtml(proj.download_url || '#') + '" class="btn btn-primary btn-small" target="_blank" rel="noopener">' + t('download') + '</a>';
    if (proj.source_url) {
      html += '    <a href="' + escapeHtml(proj.source_url) + '" class="btn btn-secondary btn-small" target="_blank" rel="noopener">' + t('source_code') + '</a>';
    }
    html += '  </div>';
    html += '</div>';

    card.innerHTML = html;
    return card;
  }

  /* Minimal HTML escaping */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ==================================================================
     RENDER: Home
     ================================================================== */
  function renderHome() {
    /* Featured: first 3 projects */
    var featured = projects.slice(0, 3);
    if (featuredGrid) {
      featuredGrid.innerHTML = '';
      for (var i = 0; i < featured.length; i++) {
        featuredGrid.appendChild(createProjectCard(featured[i]));
      }
    }

    /* Latest releases */
    if (releasesList) {
      var entries = getAllChangelogEntries().slice(0, 6);
      releasesList.innerHTML = '';
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var item = document.createElement('div');
        item.className = 'release-item';
        item.innerHTML = '<div class="release-info"><span class="release-project">' + escapeHtml(e.projectName) + '</span><span class="release-version">' + escapeHtml(e.version) + '</span></div><span class="release-date">' + escapeHtml(e.date) + '</span>';
        releasesList.appendChild(item);
      }
    }

    /* Stats */
    if (statProjects) statProjects.textContent = projects.length;
  }

  /* ==================================================================
     RENDER: Applications (with search & filter)
     ================================================================== */
  function renderApps() {
    if (!appsGrid) return;
    var filtered = filterProjects(projects, currentFilter, currentSearch);
    appsGrid.innerHTML = '';
    if (filtered.length === 0) {
      if (emptyState) emptyState.removeAttribute('hidden');
      return;
    }
    if (emptyState) emptyState.setAttribute('hidden', '');
    for (var i = 0; i < filtered.length; i++) {
      appsGrid.appendChild(createProjectCard(filtered[i]));
    }
  }

  function filterProjects(list, filter, search) {
    var result = [];
    var searchLower = search.toLowerCase().trim();
    for (var i = 0; i < list.length; i++) {
      var proj = list[i];
      /* Category filter */
      if (filter !== 'all' && proj.category !== filter) continue;
      /* Search filter */
      if (searchLower) {
        var name = getProjectName(proj).toLowerCase();
        var desc = getProjectDesc(proj).toLowerCase();
        var id = proj.id.toLowerCase();
        if (name.indexOf(searchLower) === -1 && desc.indexOf(searchLower) === -1 && id.indexOf(searchLower) === -1) continue;
      }
      result.push(proj);
    }
    return result;
  }

  /* ==================================================================
     RENDER: Changelog
     ================================================================== */
  function renderChangelog() {
    var selected = changelogSelect ? changelogSelect.value : 'all';
    var allEntries = getAllChangelogEntries();

    /* Populate filter dropdown if not already */
    if (changelogSelect && changelogSelect.options.length <= 1) {
      for (var i = 0; i < projects.length; i++) {
        var opt = document.createElement('option');
        opt.value = projects[i].id;
        opt.textContent = getProjectName(projects[i]);
        changelogSelect.appendChild(opt);
      }
    }

    /* Filter entries */
    var filtered = [];
    for (var i = 0; i < allEntries.length; i++) {
      if (selected === 'all' || allEntries[i].projectId === selected) {
        filtered.push(allEntries[i]);
      }
    }

    if (!changelogList) return;
    changelogList.innerHTML = '';
    for (var i = 0; i < filtered.length; i++) {
      var e = filtered[i];
      var entryDiv = document.createElement('div');
      entryDiv.className = 'cl-entry';
      var itemsHtml = '';
      for (var j = 0; j < e.items.length; j++) {
        itemsHtml += '<li>' + escapeHtml(e.items[j]) + '</li>';
      }
      entryDiv.innerHTML = '<div class="cl-header"><span class="cl-project">' + escapeHtml(e.projectName) + '</span><span class="cl-version">' + escapeHtml(e.version) + '</span><span class="cl-date">' + escapeHtml(e.date) + '</span></div><ul class="cl-items">' + itemsHtml + '</ul>';
      changelogList.appendChild(entryDiv);
    }
    if (filtered.length === 0) {
      changelogList.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem;">' + t('no_results') + '</p>';
    }
  }

  /* ==================================================================
     RENDER ALL (called on language change)
     ================================================================== */
  function renderAll() {
    renderHome();
    if (currentPage === 'apps') renderApps();
    if (currentPage === 'changelog') renderChangelog();
  }

  /* ==================================================================
     EVENT BINDING
     ================================================================== */

  /* --- Navigation --- */
  document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-page]');
    if (target) {
      e.preventDefault();
      var page = target.getAttribute('data-page');
      if (page) navigateTo(page);
    }

    /* Close dropdowns when clicking outside */
    if (!e.target.closest('.lang-switcher')) {
      if (langMenu) langMenu.classList.remove('open');
    }
    if (!e.target.closest('.theme-switcher')) {
      if (themeMenu) themeMenu.classList.remove('open');
    }
  });

  /* --- Language switcher --- */
  if (langBtn) {
    langBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (langMenu) langMenu.classList.toggle('open');
    });
  }
  for (var i = 0; i < langOpts.length; i++) {
    langOpts[i].addEventListener('click', function(e) {
      var lang = this.getAttribute('data-lang');
      if (lang) setLanguage(lang);
      if (langMenu) langMenu.classList.remove('open');
    });
  }

  /* --- Theme switcher --- */
  var themeBtn = document.querySelector('.theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (themeMenu) themeMenu.classList.toggle('open');
    });
  }
  for (var i = 0; i < themeOpts.length; i++) {
    themeOpts[i].addEventListener('click', function(e) {
      var theme = this.getAttribute('data-theme');
      if (theme) setTheme(theme);
      if (themeMenu) themeMenu.classList.remove('open');
    });
  }

  /* --- Mobile nav toggle --- */
  if (navToggle) {
    navToggle.addEventListener('click', function() {
      var expanded = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', expanded);
    });
  }

  /* --- Search --- */
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearch = this.value;
      renderApps();
    });
  }

  /* --- Filter buttons --- */
  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener('click', function() {
      for (var j = 0; j < filterBtns.length; j++) {
        filterBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter') || 'all';
      renderApps();
    });
  }

  /* --- Changelog filter --- */
  if (changelogSelect) {
    changelogSelect.addEventListener('change', function() {
      renderChangelog();
    });
  }

  /* --- Contact form --- */
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = document.getElementById('contact-name');
      var email = document.getElementById('contact-email');
      var message = document.getElementById('contact-message');
      if (name && email && message && name.value && email.value && message.value) {
        if (formStatus) {
          formStatus.textContent = t('contact_success');
          formStatus.className = 'form-status success';
        }
        contactForm.reset();
      } else {
        if (formStatus) {
          formStatus.textContent = t('contact_error');
          formStatus.className = 'form-status error';
        }
      }
    });
  }

  /* --- Keyboard: Escape closes dropdowns --- */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (langMenu) langMenu.classList.remove('open');
      if (themeMenu) themeMenu.classList.remove('open');
      if (navList) navList.classList.remove('open');
    }
  });

  /* --- Keyboard: Enter activates focused nav link --- */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var target = e.target.closest('[data-page]');
      if (target) {
        e.preventDefault();
        navigateTo(target.getAttribute('data-page'));
      }
    }
  });

  /* ==================================================================
     INIT
     ================================================================== */
  translatePage();
  renderHome();
  navigateTo('home');

})();
