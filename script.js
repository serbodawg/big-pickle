/* ===================================================================
   Project Dashboard — Secure Script
   CRUD, theming, i18n, security monitoring.
   No innerHTML with user data, no eval, no setTimeout(string).
   =================================================================== */
(function() {
  'use strict';

  /* ==================================================================
     ANTI-TAMPER: freeze core prototypes
     ================================================================== */
  if (typeof Object.freeze === 'function') {
    try {
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
    } catch(e) { /* some envs block this */ }
  }

  /* ==================================================================
     CONSTANTS
     ================================================================== */
  var STORAGE_KEY = 'bp_projects';
  var INTEGRITY_KEY = 'bp_integrity';
  var THEME_KEY = 'bp_theme';
  var LANG_KEY = 'bp_lang';
  var LOG_KEY = 'bp_sec_log';
  var CSRF_KEY = 'bp_csrf';
  var MAX_LOG = 50;
  var RATE_WINDOW = 2000;
  var RATE_MAX = 3;
  var MAX_PROJECTS = 100;
  var MAX_FIELD_LENGTH = 2000;

  /* ==================================================================
     DOM REFS
     ================================================================== */
  var $ = function(id) { return document.getElementById(id); };
  var html = document.documentElement;
  var projectsGrid = $('projects-grid');
  var emptyState = $('empty-state');
  var searchInput = $('search-input');
  var addBtn = $('add-project-btn');
  var modal = $('project-modal');
  var confirmModal = $('confirm-modal');
  var modalTitle = $('modal-title');
  var form = $('project-form');
  var formId = $('form-id');
  var formToken = $('form-token');
  var modalClose = $('modal-close-btn');
  var modalCancel = $('modal-cancel-btn');
  var confirmClose = $('confirm-close-btn');
  var confirmNo = $('confirm-no');
  var confirmYes = $('confirm-yes');
  var confirmMsg = $('confirm-msg');
  var filterGroup = document.querySelector('.filter-group');
  var filterBtns = document.querySelectorAll('.filter-btn');
  var statProjects = $('stat-projects');
  var statDownloads = $('stat-total-downloads');
  var statStorage = $('stat-storage');
  var exportBtn = $('export-btn');
  var importBtn = $('import-btn');
  var importFile = $('import-file');
  var settingsExport = $('settings-export');
  var settingsImport = $('settings-import');
  var settingsClear = $('settings-clear');
  var navToggle = document.querySelector('.nav-toggle');
  var navList = document.querySelector('.nav-list');
  var langMenu = document.querySelector('.lang-menu');
  var themeMenu = document.querySelector('.theme-menu');
  var secLogList = $('security-log-list');
  var clearLogBtn = $('clear-log-btn');
  var addClEntryBtn = $('add-cl-entry');
  var changelogEntriesDiv = $('changelog-entries');

  /* elements with context */
  var langBtn = document.querySelector('.lang-current');
  var themeBtn = document.querySelector('.theme-btn');

  /* ==================================================================
     STATE
     ================================================================== */
  var projects = [];
  var currentLang = localStorage.getItem(LANG_KEY) || 'en';
  var currentTheme = localStorage.getItem(THEME_KEY) || 'pickle-green';
  var currentFilter = 'all';
  var currentSearch = '';
  var editingId = null;
  var deleteTarget = null;
  var submitTimestamps = [];

  /* ==================================================================
     SECURITY: CSRF token
     ================================================================== */
  function generateToken() {
    var arr = new Uint8Array(32);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (var i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr).map(function(b) { return b.toString(16).padStart(2,'0'); }).join('');
  }

  function getCsrfToken() {
    var token = localStorage.getItem(CSRF_KEY);
    if (!token) {
      token = generateToken();
      localStorage.setItem(CSRF_KEY, token);
    }
    return token;
  }

  function validateCsrfToken(token) {
    var stored = localStorage.getItem(CSRF_KEY);
    if (!stored || !token) return false;
    /* constant-time compare-ish */
    if (stored.length !== token.length) return false;
    var match = true;
    for (var i = 0; i < stored.length; i++) {
      if (stored.charAt(i) !== token.charAt(i)) match = false;
    }
    return match;
  }

  /* ==================================================================
     SECURITY: Input sanitization
     ================================================================== */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    /* strip control chars except newline/tab */
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    /* strip HTML tags */
    str = str.replace(/<[^>]*>/g, '');
    /* strip event handlers */
    str = str.replace(/on\w+\s*=/gi, '');
    /* strip javascript: */
    str = str.replace(/javascript\s*:/gi, '');
    /* strip data: URIs */
    str = str.replace(/data\s*:\s*text\/html/gi, '');
    /* limit length */
    if (str.length > MAX_FIELD_LENGTH) str = str.substring(0, MAX_FIELD_LENGTH);
    return str;
  }

  function sanitizeUrl(str) {
    if (typeof str !== 'string') return '';
    str = sanitize(str);
    /* only allow http, https, mailto */
    if (str && !/^https?:\/\//i.test(str) && !/^mailto:/i.test(str)) {
      if (str.indexOf('.') > 0 && str.indexOf(' ') === -1) {
        str = 'https://' + str;
      } else {
        return '';
      }
    }
    if (str && !/^https?:\/\//i.test(str) && !/^mailto:/i.test(str)) return '';
    return str;
  }

  /* ==================================================================
     SECURITY: localStorage integrity
     ================================================================== */
  function computeChecksum(data) {
    var str = JSON.stringify(data);
    var hash = 0;
    if (str.length === 0) return hash.toString(16);
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  function saveProjects() {
    var data = { projects: projects, updated: Date.now() };
    var checksum = computeChecksum(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(INTEGRITY_KEY, checksum);
    } catch(e) {
      secLog('Storage error: ' + e.message, 'error');
      if (e.name === 'QuotaExceededError') {
        alert('Storage full. Export your data and clear some projects.');
      }
    }
    updateStats();
    updateFilterBtns();
  }

  function loadProjects() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var storedChecksum = localStorage.getItem(INTEGRITY_KEY);
      if (!raw) return;

      var parsed = JSON.parse(raw);
      var computedChecksum = computeChecksum(parsed);

      if (storedChecksum !== computedChecksum) {
        secLog('DATA TAMPER DETECTED — checksum mismatch!', 'error');
        if (!confirm('Security alert: Project data appears to have been tampered with. Load anyway?')) {
          projects = [];
          return;
        }
      }

      if (parsed && Array.isArray(parsed.projects)) {
        projects = parsed.projects;
        /* validate each project */
        projects = projects.filter(function(p) {
          return p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim();
        });
        /* re-save with valid checksum */
        saveProjects();
        secLog('Data loaded and verified (' + projects.length + ' projects)', 'ok');
      }
    } catch(e) {
      secLog('Data load error: ' + e.message, 'error');
      projects = [];
    }
  }

  /* ==================================================================
     SECURITY: DevTools detection
     ================================================================== */
  var devtoolsOpen = false;
  var devtoolsCheckInterval = null;

  function detectDevTools() {
    /* Method 1: element trick */
    var threshold = 160;
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:-1000px;left:-1000px;width:1px;height:1px';
    Object.defineProperty(el, 'id', {
      get: function() {
        devtoolsOpen = true;
        secLog('DevTools detected (element inspection)', 'warn');
        return 'detected';
      }
    });
    document.body.appendChild(el);
    var result = console.log(el);
    document.body.removeChild(el);

    /* Method 2: Firebug check */
    if (window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) {
      devtoolsOpen = true;
      secLog('DevTools detected (Firebug)', 'warn');
    }

    /* Method 3: out-of-viewport detection */
    var start = performance.now();
    debugger;
    var end = performance.now();
    if (end - start > 100) {
      devtoolsOpen = true;
      secLog('DevTools detected (debugger pause)', 'warn');
    }

    return devtoolsOpen;
  }

  /* Periodic devtools check (every 5s) */
  function startDevToolsWatch() {
    if (devtoolsCheckInterval) return;
    devtoolsCheckInterval = setInterval(function() {
      var start = performance.now();
      debugger;
      var end = performance.now();
      if (end - start > 100) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          secLog('DevTools detected (periodic check)', 'warn');
        }
      }
    }, 5000);
  }

  /* ==================================================================
     SECURITY: Console protection
     ================================================================== */
  function protectConsole() {
    var nativeConsole = {};
    /* snapshot native methods */
    var methods = ['log','warn','error','info','debug'];
    for (var i = 0; i < methods.length; i++) {
      nativeConsole[methods[i]] = console[methods[i]];
    }
    /* Monitor for overwrites */
    var consoleProxy = {};
    for (var i = 0; i < methods.length; i++) {
      (function(m) {
        consoleProxy[m] = function() {
          if (typeof nativeConsole[m] === 'function') {
            nativeConsole[m].apply(console, arguments);
          }
        };
      })(methods[i]);
    }
    /* Don't fully replace — just monitor */
    var origKeys = Object.keys(console).sort().join(',');
    setInterval(function() {
      var currentKeys = Object.keys(console).sort().join(',');
      if (currentKeys !== origKeys) {
        secLog('Console tampering detected', 'warn');
      }
    }, 10000);
  }

  /* ==================================================================
     SECURITY: Rate limiter
     ================================================================== */
  function checkRateLimit() {
    var now = Date.now();
    submitTimestamps = submitTimestamps.filter(function(t) {
      return now - t < RATE_WINDOW;
    });
    if (submitTimestamps.length >= RATE_MAX) {
      secLog('Rate limit exceeded on form submission', 'warn');
      return false;
    }
    submitTimestamps.push(now);
    return true;
  }

  /* ==================================================================
     SECURITY: Keyboard blocker
     ================================================================== */
  function blockDevToolsKeys(e) {
    /* F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C */
    var key = e.keyCode || e.which;
    var ctrl = e.ctrlKey || e.metaKey;
    var shift = e.shiftKey;

    if (key === 123) { /* F12 */
      e.preventDefault();
      secLog('F12 blocked', 'warn');
      return false;
    }
    if (ctrl && shift && (key === 73 || key === 74)) { /* I or J */
      e.preventDefault();
      secLog('DevTools shortcut blocked', 'warn');
      return false;
    }
    if (ctrl && key === 85) { /* Ctrl+U */
      e.preventDefault();
      secLog('View source blocked', 'warn');
      return false;
    }
    if (ctrl && shift && key === 67) { /* Ctrl+Shift+C */
      e.preventDefault();
      secLog('Inspect element blocked', 'warn');
      return false;
    }
    return true;
  }

  /* ==================================================================
     SECURITY: Right-click protection
     ================================================================== */
  function blockRightClick(e) {
    e.preventDefault();
    secLog('Right-click blocked', 'warn');
  }

  /* ==================================================================
     SECURITY: Frame busting (redundant w/ CSP)
     ================================================================== */
  function bustFrame() {
    try {
      if (window.self !== window.top) {
        window.top.location.href = window.self.location.href;
      }
    } catch(e) {
      /* cross-origin, CSP should handle */
    }
  }

  /* ==================================================================
     SECURITY LOG
     ================================================================== */
  function secLog(message, type) {
    type = type || 'ok';
    var logs = [];
    try {
      var raw = localStorage.getItem(LOG_KEY);
      if (raw) logs = JSON.parse(raw);
    } catch(e) { logs = []; }
    logs.push({ time: Date.now(), msg: message, type: type });
    if (logs.length > MAX_LOG) logs = logs.slice(logs.length - MAX_LOG);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch(e) {}
    renderSecurityLog();
  }

  function renderSecurityLog() {
    if (!secLogList) return;
    var logs = [];
    try {
      var raw = localStorage.getItem(LOG_KEY);
      if (raw) logs = JSON.parse(raw);
    } catch(e) {}
    secLogList.innerHTML = '';
    for (var i = Math.max(0, logs.length - 30); i < logs.length; i++) {
      var entry = logs[i];
      var div = document.createElement('div');
      div.className = 'log-entry';
      var date = new Date(entry.time);
      var timeStr = date.toLocaleTimeString();
      var span = document.createElement('span');
      span.className = 'log-time';
      span.textContent = timeStr;
      div.appendChild(span);
      var msgSpan = document.createElement('span');
      msgSpan.className = 'log-' + (entry.type || 'ok');
      msgSpan.textContent = entry.msg;
      div.appendChild(msgSpan);
      secLogList.appendChild(div);
    }
  }

  /* ==================================================================
     TRANSLATIONS
     ================================================================== */
  var translations = {
    en: {
      site_title: 'Project Dashboard',
      nav_dashboard: 'Dashboard',
      nav_security: 'Security',
      nav_settings: 'Settings',
      shield_protected: 'Protected',
      stat_projects: 'Projects',
      stat_downloads: 'Downloads',
      stat_storage: 'Storage',
      search_projects: 'Search projects',
      search_placeholder: 'Search projects...',
      filter_all: 'All',
      add_project: '+ Add Project',
      export_data: 'Export Data',
      import_data: 'Import Data',
      no_projects: 'No Projects Yet',
      no_projects_desc: 'Click "+ Add Project" to create your first project.',
      security_title: 'Security Overview',
      sec_csp: 'Content Security Policy',
      sec_csp_desc: 'Script injection and data exfiltration blocked.',
      sec_xss: 'XSS Prevention',
      sec_xss_desc: 'All user input is sanitized; no innerHTML with user data.',
      sec_clickjack: 'Clickjacking Protection',
      sec_clickjack_desc: 'Frame-busting script and CSP frame-ancestors none active.',
      sec_storage: 'Storage Integrity',
      sec_storage_desc: 'localStorage data is checksum-verified against tampering.',
      sec_devtools: 'DevTools Detection',
      sec_devtools_desc: 'Developer tools usage is detected and logged.',
      sec_rate: 'Rate Limiting',
      sec_rate_desc: 'Form submissions are throttled to prevent abuse.',
      sec_console: 'Console Protection',
      sec_console_desc: 'Console overwriting attempts are monitored.',
      sec_frame: 'Frame Busting',
      sec_frame_desc: 'Page cannot be loaded inside an iframe.',
      sec_log: 'Security Log',
      clear_log: 'Clear Log',
      settings_title: 'Settings',
      settings_theme: 'Theme',
      settings_language: 'Language',
      settings_data: 'Data Management',
      clear_all: 'Clear All Data',
      project_name: 'Project Name *',
      project_version: 'Version',
      project_desc: 'Description *',
      project_category: 'Category',
      project_tags: 'Tags (comma-separated)',
      project_download: 'Download URL',
      project_source: 'Source URL',
      project_website: 'Website URL',
      project_screenshot: 'Screenshot URL',
      changelog: 'Changelog',
      add_entry: '+ Add Entry',
      cancel: 'Cancel',
      save: 'Save Project',
      edit_project: 'Edit Project',
      confirm_delete: 'Delete Project',
      confirm_delete_msg: 'Are you sure you want to delete this project?',
      delete: 'Delete',
      download: 'Download',
      source_code: 'Source',
      website: 'Website',
      edit: 'Edit',
      contact_success: 'Message sent successfully!',
      contact_error: 'Please fill in all fields.',
      no_results: 'No matching projects found.',
      footer_secured: 'Secured with',
      footer_antihacker: 'Anti-Hacker Protection',
      footer_local: 'All data stored locally. No data is sent to any server.',
      category_all: 'All',
      settings_export: 'Export Data',
      skip_nav: 'Skip to main content',
      theme_green: 'Pickle Green',
      theme_pastel: 'Pastel Dark Blue',
      theme_catppuccin: 'Catppuccin',
      version: 'Version',
      save_changes: 'Save Changes',
      project_edit: 'Edit Project',
      clear_confirm: 'Clear All Data? This cannot be undone.',
      import_success: 'Data imported successfully.',
      import_error: 'Invalid data file.'
    },
    pl: {
      site_title: 'Panel Projektów',
      nav_dashboard: 'Panel',
      nav_security: 'Bezpieczeństwo',
      nav_settings: 'Ustawienia',
      shield_protected: 'Chroniony',
      stat_projects: 'Projekty',
      stat_downloads: 'Pobrania',
      stat_storage: 'Pamięć',
      search_projects: 'Szukaj projektów',
      search_placeholder: 'Szukaj projektów...',
      filter_all: 'Wszystkie',
      add_project: '+ Dodaj Projekt',
      export_data: 'Eksportuj Dane',
      import_data: 'Importuj Dane',
      no_projects: 'Brak Projektów',
      no_projects_desc: 'Kliknij "+ Dodaj Projekt" aby utworzyć pierwszy projekt.',
      security_title: 'Przegląd Bezpieczeństwa',
      sec_csp: 'Content Security Policy',
      sec_csp_desc: 'Blokada wstrzykiwania skryptów i eksfiltracji danych.',
      sec_xss: 'Ochrona XSS',
      sec_xss_desc: 'Wszystkie dane wejściowe są czyszczone; brak innerHTML z danymi użytkownika.',
      sec_clickjack: 'Ochrona Clickjacking',
      sec_clickjack_desc: 'Skrypt frame-busting i CSP frame-ancestors none aktywne.',
      sec_storage: 'Integralność Pamięci',
      sec_storage_desc: 'Dane localStorage są weryfikowane sumą kontrolną.',
      sec_devtools: 'Wykrywanie DevTools',
      sec_devtools_desc: 'Użycie narzędzi deweloperskich jest wykrywane i logowane.',
      sec_rate: 'Limit Żądań',
      sec_rate_desc: 'Wysyłanie formularzy jest ograniczone, aby zapobiec nadużyciom.',
      sec_console: 'Ochrona Konsoli',
      sec_console_desc: 'Próby nadpisania konsoli są monitorowane.',
      sec_frame: 'Frame Busting',
      sec_frame_desc: 'Strona nie może być załadowana w iframe.',
      sec_log: 'Dziennik Bezpieczeństwa',
      clear_log: 'Wyczyść Dziennik',
      settings_title: 'Ustawienia',
      settings_theme: 'Motyw',
      settings_language: 'Język',
      settings_data: 'Zarządzanie Danymi',
      clear_all: 'Wyczyść Wszystkie Dane',
      project_name: 'Nazwa Projektu *',
      project_version: 'Wersja',
      project_desc: 'Opis *',
      project_category: 'Kategoria',
      project_tags: 'Tagi (oddzielone przecinkami)',
      project_download: 'URL Pobierania',
      project_source: 'URL Źródła',
      project_website: 'URL Strony',
      project_screenshot: 'URL Zrzutu Ekranu',
      changelog: 'Zmiany',
      add_entry: '+ Dodaj Wpis',
      cancel: 'Anuluj',
      save: 'Zapisz Projekt',
      edit_project: 'Edytuj Projekt',
      confirm_delete: 'Usuń Projekt',
      confirm_delete_msg: 'Czy na pewno chcesz usunąć ten projekt?',
      delete: 'Usuń',
      download: 'Pobierz',
      source_code: 'Źródło',
      website: 'Strona',
      edit: 'Edytuj',
      contact_success: 'Wiadomość wysłana pomyślnie!',
      contact_error: 'Proszę wypełnić wszystkie pola.',
      no_results: 'Nie znaleziono pasujących projektów.',
      footer_secured: 'Zabezpieczone',
      footer_antihacker: 'Ochroną Anti-Hacker',
      footer_local: 'Wszystkie dane przechowywane lokalnie. Żadne dane nie są wysyłane na serwer.',
      category_all: 'Wszystkie',
      settings_export: 'Eksportuj Dane',
      skip_nav: 'Przejdź do głównej treści',
      theme_green: 'Pickle Green',
      theme_pastel: 'Pastelowy Ciemny Niebieski',
      theme_catppuccin: 'Catppuccin',
      version: 'Wersja',
      save_changes: 'Zapisz Zmiany',
      project_edit: 'Edytuj Projekt',
      clear_confirm: 'Wyczyścić wszystkie dane? Tej operacji nie można cofnąć.',
      import_success: 'Dane zaimportowane pomyślnie.',
      import_error: 'Nieprawidłowy plik danych.'
    },
    ru: {
      site_title: 'Панель Проектов',
      nav_dashboard: 'Панель',
      nav_security: 'Безопасность',
      nav_settings: 'Настройки',
      shield_protected: 'Защищено',
      stat_projects: 'Проекты',
      stat_downloads: 'Загрузки',
      stat_storage: 'Память',
      search_projects: 'Поиск проектов',
      search_placeholder: 'Поиск проектов...',
      filter_all: 'Все',
      add_project: '+ Добавить Проект',
      export_data: 'Экспорт Данных',
      import_data: 'Импорт Данных',
      no_projects: 'Нет Проектов',
      no_projects_desc: 'Нажмите "+ Добавить Проект" чтобы создать первый проект.',
      security_title: 'Обзор Безопасности',
      sec_csp: 'Content Security Policy',
      sec_csp_desc: 'Блокировка инъекции скриптов и утечки данных.',
      sec_xss: 'Защита от XSS',
      sec_xss_desc: 'Все вводимые данные очищаются; innerHTML не используется с данными пользователя.',
      sec_clickjack: 'Защита от Clickjacking',
      sec_clickjack_desc: 'Frame-busting скрипт и CSP frame-ancestors none активны.',
      sec_storage: 'Целостность Хранилища',
      sec_storage_desc: 'Данные localStorage проверяются контрольной суммой.',
      sec_devtools: 'Обнаружение DevTools',
      sec_devtools_desc: 'Использование инструментов разработчика обнаруживается и логируется.',
      sec_rate: 'Лимит Запросов',
      sec_rate_desc: 'Отправка форм ограничена для предотвращения злоупотреблений.',
      sec_console: 'Защита Консоли',
      sec_console_desc: 'Попытки перезаписи консоли отслеживаются.',
      sec_frame: 'Frame Busting',
      sec_frame_desc: 'Страница не может быть загружена в iframe.',
      sec_log: 'Журнал Безопасности',
      clear_log: 'Очистить Журнал',
      settings_title: 'Настройки',
      settings_theme: 'Тема',
      settings_language: 'Язык',
      settings_data: 'Управление Данными',
      clear_all: 'Очистить Все Данные',
      project_name: 'Название Проекта *',
      project_version: 'Версия',
      project_desc: 'Описание *',
      project_category: 'Категория',
      project_tags: 'Теги (через запятую)',
      project_download: 'URL Загрузки',
      project_source: 'URL Исходника',
      project_website: 'URL Сайта',
      project_screenshot: 'URL Скриншота',
      changelog: 'Изменения',
      add_entry: '+ Добавить Запись',
      cancel: 'Отмена',
      save: 'Сохранить Проект',
      edit_project: 'Редактировать Проект',
      confirm_delete: 'Удалить Проект',
      confirm_delete_msg: 'Вы уверены, что хотите удалить этот проект?',
      delete: 'Удалить',
      download: 'Скачать',
      source_code: 'Исходник',
      website: 'Сайт',
      edit: 'Редакт.',
      contact_success: 'Сообщение отправлено успешно!',
      contact_error: 'Пожалуйста, заполните все поля.',
      no_results: 'Совпадающих проектов не найдено.',
      footer_secured: 'Защищено',
      footer_antihacker: 'Анти-Хакерской Защитой',
      footer_local: 'Все данные хранятся локально. Никакие данные не отправляются на сервер.',
      category_all: 'Все',
      settings_export: 'Экспорт Данных',
      skip_nav: 'Перейти к основному содержимому',
      theme_green: 'Pickle Green',
      theme_pastel: 'Пастельный Темно-Синий',
      theme_catppuccin: 'Catppuccin',
      version: 'Версия',
      save_changes: 'Сохранить Изменения',
      project_edit: 'Редактировать Проект',
      clear_confirm: 'Очистить все данные? Это действие необратимо.',
      import_success: 'Данные импортированы успешно.',
      import_error: 'Неверный файл данных.'
    }
  };

  /* ==================================================================
     I18N
     ================================================================== */
  function t(key) {
    var langData = translations[currentLang];
    if (!langData) return key;
    return langData[key] || key;
  }

  function translatePage() {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    }
    var phEls = document.querySelectorAll('[data-i18n-placeholder]');
    for (var i = 0; i < phEls.length; i++) {
      var el = phEls[i];
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    }
  }

  function setLanguage(code) {
    currentLang = code;
    html.setAttribute('data-lang', code);
    localStorage.setItem(LANG_KEY, code);
    updateActiveLang(code);
    translatePage();
    renderAll();
    /* update modals if open */
    refreshModalTitle();
  }

  function updateActiveLang(code) {
    if (langBtn) langBtn.textContent = code.toUpperCase();
    var opts = document.querySelectorAll('.lang-opt');
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('data-lang') === code) {
        opts[i].classList.add('active');
      } else {
        opts[i].classList.remove('active');
      }
    }
  }

  /* ==================================================================
     THEME
     ================================================================== */
  function setTheme(name) {
    currentTheme = name;
    html.setAttribute('data-theme', name);
    localStorage.setItem(THEME_KEY, name);
    var opts = document.querySelectorAll('.theme-opt');
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('data-theme') === name) {
        opts[i].classList.add('active');
      } else {
        opts[i].classList.remove('active');
      }
    }
  }

  /* ==================================================================
     PROJECT CRUD
     ================================================================== */

  /* --- Read --- */
  function getProject(id) {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return projects[i];
    }
    return null;
  }

  function generateId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id + '-' + Date.now().toString(36);
  }

  /* --- Create --- */
  function createProject(data) {
    if (projects.length >= MAX_PROJECTS) {
      alert('Maximum of ' + MAX_PROJECTS + ' projects reached.');
      return null;
    }
    var project = {
      id: generateId(),
      name: sanitize(data.name || '').trim(),
      description: sanitize(data.description || '').trim(),
      version: sanitize(data.version || '').trim(),
      category: sanitize(data.category || '').trim(),
      tags: sanitize(data.tags || '').trim(),
      download_url: sanitizeUrl(data.download_url),
      source_url: sanitizeUrl(data.source_url),
      website_url: sanitizeUrl(data.website_url),
      screenshot_url: sanitizeUrl(data.screenshot_url),
      changelog: Array.isArray(data.changelog) ? data.changelog : [],
      created: Date.now(),
      updated: Date.now()
    };
    if (!project.name) return null;
    /* sanitize changelog entries */
    for (var i = 0; i < project.changelog.length; i++) {
      var cl = project.changelog[i];
      cl.version = sanitize(cl.version || '');
      cl.date = sanitize(cl.date || '');
      if (Array.isArray(cl.items)) {
        for (var j = 0; j < cl.items.length; j++) {
          cl.items[j] = sanitize(cl.items[j]);
        }
      }
    }
    projects.push(project);
    saveProjects();
    secLog('Project created: ' + project.name, 'ok');
    return project;
  }

  /* --- Update --- */
  function updateProject(id, data) {
    var project = getProject(id);
    if (!project) return null;
    if (data.name !== undefined) project.name = sanitize(data.name).trim();
    if (data.description !== undefined) project.description = sanitize(data.description).trim();
    if (data.version !== undefined) project.version = sanitize(data.version).trim();
    if (data.category !== undefined) project.category = sanitize(data.category).trim();
    if (data.tags !== undefined) project.tags = sanitize(data.tags).trim();
    if (data.download_url !== undefined) project.download_url = sanitizeUrl(data.download_url);
    if (data.source_url !== undefined) project.source_url = sanitizeUrl(data.source_url);
    if (data.website_url !== undefined) project.website_url = sanitizeUrl(data.website_url);
    if (data.screenshot_url !== undefined) project.screenshot_url = sanitizeUrl(data.screenshot_url);
    if (data.changelog !== undefined) {
      project.changelog = [];
      for (var i = 0; i < data.changelog.length; i++) {
        var cl = {
          version: sanitize(data.changelog[i].version || ''),
          date: sanitize(data.changelog[i].date || ''),
          items: []
        };
        if (Array.isArray(data.changelog[i].items)) {
          for (var j = 0; j < data.changelog[i].items.length; j++) {
            cl.items.push(sanitize(data.changelog[i].items[j]));
          }
        }
        project.changelog.push(cl);
      }
    }
    project.updated = Date.now();
    saveProjects();
    secLog('Project updated: ' + project.name, 'ok');
    return project;
  }

  /* --- Delete --- */
  function deleteProject(id) {
    var idx = -1;
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return false;
    var name = projects[idx].name;
    projects.splice(idx, 1);
    saveProjects();
    secLog('Project deleted: ' + name, 'ok');
    return true;
  }

  /* --- Export --- */
  function exportData() {
    var data = {
      version: 1,
      exported: new Date().toISOString(),
      projects: projects
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'projects-export-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    secLog('Data exported (' + projects.length + ' projects)', 'ok');
  }

  /* --- Import --- */
  function importData(jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.projects)) {
        alert(t('import_error'));
        return false;
      }
      /* validate projects */
      var valid = [];
      for (var i = 0; i < data.projects.length; i++) {
        var p = data.projects[i];
        if (p && typeof p.name === 'string' && p.name.trim()) {
          valid.push(p);
        }
      }
      /* merge or replace? Ask user */
      if (projects.length > 0) {
        if (!confirm('Replace existing ' + projects.length + ' projects with ' + valid.length + ' imported projects?')) {
          secLog('Import cancelled by user', 'ok');
          return false;
        }
      }
      projects = valid;
      saveProjects();
      renderAll();
      alert(t('import_success'));
      secLog('Data imported: ' + valid.length + ' projects', 'ok');
      return true;
    } catch(e) {
      alert(t('import_error'));
      secLog('Import failed: ' + e.message, 'error');
      return false;
    }
  }

  /* ==================================================================
     RENDER: Project Cards
     ================================================================== */
  function renderProjects() {
    if (!projectsGrid) return;
    var filtered = getFilteredProjects();
    projectsGrid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.removeAttribute('hidden');
      return;
    }
    if (emptyState) emptyState.setAttribute('hidden', '');

    for (var i = 0; i < filtered.length; i++) {
      projectsGrid.appendChild(createCard(filtered[i]));
    }
  }

  function getFilteredProjects() {
    var result = [];
    var searchLower = currentSearch.toLowerCase().trim();
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      if (currentFilter !== 'all') {
        var cat = (p.category || '').toLowerCase();
        var filterVal = currentFilter.toLowerCase();
        if (cat.indexOf(filterVal) === -1) continue;
      }
      if (searchLower) {
        var name = (p.name || '').toLowerCase();
        var desc = (p.description || '').toLowerCase();
        var tags = (p.tags || '').toLowerCase();
        if (name.indexOf(searchLower) === -1 && desc.indexOf(searchLower) === -1 && tags.indexOf(searchLower) === -1) continue;
      }
      result.push(p);
    }
    return result;
  }

  function createCard(project) {
    var card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('role', 'listitem');

    /* Actions overlay */
    var actions = document.createElement('div');
    actions.className = 'project-card-actions';
    var editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '\u270E';
    editBtn.setAttribute('aria-label', t('edit') + ' ' + project.name);
    editBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openEditModal(project.id);
    });
    var delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '\u2716';
    delBtn.setAttribute('aria-label', t('delete') + ' ' + project.name);
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openDeleteConfirm(project.id);
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);

    /* Screenshot */
    if (project.screenshot_url) {
      var img = document.createElement('img');
      img.className = 'project-screenshot';
      img.src = project.screenshot_url;
      img.alt = project.name + ' screenshot';
      img.loading = 'lazy';
      img.width = 600;
      img.height = 400;
      card.appendChild(img);
    }

    /* Body */
    var body = document.createElement('div');
    body.className = 'project-body';

    var header = document.createElement('div');
    header.className = 'project-header';
    var nameEl = document.createElement('h3');
    nameEl.className = 'project-name';
    nameEl.textContent = project.name;
    header.appendChild(nameEl);
    if (project.version) {
      var verEl = document.createElement('span');
      verEl.className = 'project-version';
      verEl.textContent = project.version;
      header.appendChild(verEl);
    }
    body.appendChild(header);

    /* Tags */
    if (project.tags) {
      var tagStrs = project.tags.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
      if (tagStrs.length > 0) {
        var tagsEl = document.createElement('div');
        tagsEl.className = 'project-tags';
        for (var i = 0; i < Math.min(tagStrs.length, 5); i++) {
          var tagEl = document.createElement('span');
          tagEl.className = 'project-tag';
          tagEl.textContent = tagStrs[i];
          tagsEl.appendChild(tagEl);
        }
        body.appendChild(tagsEl);
      }
    }

    /* Description */
    if (project.description) {
      var descEl = document.createElement('p');
      descEl.className = 'project-desc';
      descEl.textContent = project.description;
      body.appendChild(descEl);
    }

    /* Actions */
    var actionsRow = document.createElement('div');
    actionsRow.className = 'project-actions';
    if (project.download_url) {
      actionsRow.appendChild(createLinkBtn(project.download_url, t('download'), 'btn-primary'));
    }
    if (project.source_url) {
      actionsRow.appendChild(createLinkBtn(project.source_url, t('source_code'), 'btn-secondary'));
    }
    if (project.website_url) {
      actionsRow.appendChild(createLinkBtn(project.website_url, t('website'), 'btn-secondary'));
    }
    body.appendChild(actionsRow);
    card.appendChild(body);

    return card;
  }

  function createLinkBtn(url, label, cls) {
    var a = document.createElement('a');
    a.href = url;
    a.className = 'btn ' + cls + ' btn-small';
    a.textContent = label;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  /* ==================================================================
     UPDATE FILTER BUTTONS
     ================================================================== */
  function updateFilterBtns() {
    /* collect unique categories */
    var cats = {};
    for (var i = 0; i < projects.length; i++) {
      var c = (projects[i].category || '').trim();
      if (c) cats[c] = (cats[c] || 0) + 1;
    }
    var catKeys = Object.keys(cats).sort();

    /* keep all button, remove extra filter buttons */
    var existing = filterGroup.querySelectorAll('.filter-btn');
    for (var i = 1; i < existing.length; i++) {
      existing[i].remove();
    }
    /* add category buttons */
    for (var i = 0; i < catKeys.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.setAttribute('data-filter', catKeys[i]);
      btn.textContent = catKeys[i] + ' (' + cats[catKeys[i]] + ')';
      btn.addEventListener('click', function() {
        var btns = filterGroup.querySelectorAll('.filter-btn');
        for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
        this.classList.add('active');
        currentFilter = this.getAttribute('data-filter');
        renderProjects();
      });
      filterGroup.appendChild(btn);
      /* if this category matches current filter, activate it */
      if (currentFilter === catKeys[i]) btn.classList.add('active');
    }
  }

  /* ==================================================================
     STATS
     ================================================================== */
  function updateStats() {
    if (statProjects) statProjects.textContent = projects.length;
    if (statDownloads) statDownloads.textContent = projects.filter(function(p) { return p.download_url; }).length;
    if (statStorage) {
      var size = 0;
      try {
        for (var key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            size += (localStorage[key].length || 0);
          }
        }
      } catch(e) {}
      var kb = (size / 1024).toFixed(1);
      statStorage.textContent = kb + ' KB';
    }
  }

  /* ==================================================================
     MODAL: Add / Edit
     ================================================================== */
  function openAddModal() {
    editingId = null;
    modalTitle.textContent = t('add_project');
    form.reset();
    formId.value = '';
    formToken.value = getCsrfToken();
    changelogEntriesDiv.innerHTML = '';
    modal.removeAttribute('hidden');
  }

  function openEditModal(id) {
    var project = getProject(id);
    if (!project) return;
    editingId = id;
    modalTitle.textContent = t('edit_project');
    formToken.value = getCsrfToken();
    $('form-name').value = project.name || '';
    $('form-version').value = project.version || '';
    $('form-desc').value = project.description || '';
    $('form-category').value = project.category || '';
    $('form-tags').value = project.tags || '';
    $('form-download').value = project.download_url || '';
    $('form-source').value = project.source_url || '';
    $('form-website').value = project.website_url || '';
    $('form-screenshot').value = project.screenshot_url || '';

    /* render changelog entries */
    changelogEntriesDiv.innerHTML = '';
    for (var i = 0; i < (project.changelog || []).length; i++) {
      addChangelogEntryForm(project.changelog[i]);
    }

    formId.value = id;
    modal.removeAttribute('hidden');
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    editingId = null;
  }

  function refreshModalTitle() {
    if (!modal.hasAttribute('hidden')) {
      modalTitle.textContent = editingId ? t('edit_project') : t('add_project');
    }
  }

  /* --- Changelog entry forms --- */
  function addChangelogEntryForm(data) {
    data = data || {};
    var div = document.createElement('div');
    div.className = 'cl-entry-form';
    div.innerHTML =
      '<div class="form-row">' +
      '  <div class="form-group"><input class="cl-version" placeholder="Version" value="' + escapeAttr(data.version || '') + '" maxlength="30"></div>' +
      '  <div class="form-group"><input class="cl-date" placeholder="Date (YYYY-MM-DD)" value="' + escapeAttr(data.date || '') + '" maxlength="10"></div>' +
      '</div>' +
      '<div class="form-group"><textarea class="cl-items-input" placeholder="Changes (one per line)" rows="2">' + escapeHtml(data.items ? data.items.join('\n') : '') + '</textarea></div>' +
      '<button type="button" class="cl-entry-remove">Remove entry</button>';
    var removeBtn = div.querySelector('.cl-entry-remove');
    removeBtn.addEventListener('click', function() { div.remove(); });
    changelogEntriesDiv.appendChild(div);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* --- Form submit --- */
  function handleFormSubmit(e) {
    e.preventDefault();

    /* Rate limit */
    if (!checkRateLimit()) {
      alert('Too many submissions. Please wait.');
      return;
    }

    /* CSRF */
    var token = formToken.value;
    if (!validateCsrfToken(token)) {
      secLog('CSRF validation failed', 'error');
      alert('Security validation failed. Please refresh the page.');
      return;
    }

    var name = $('form-name').value;
    var description = $('form-desc').value;
    if (!name.trim() || !description.trim()) {
      alert('Project name and description are required.');
      return;
    }

    /* Collect changelog */
    var clForms = changelogEntriesDiv.querySelectorAll('.cl-entry-form');
    var changelog = [];
    for (var i = 0; i < clForms.length; i++) {
      var cf = clForms[i];
      var version = cf.querySelector('.cl-version').value.trim();
      var date = cf.querySelector('.cl-date').value.trim();
      var itemsText = cf.querySelector('.cl-items-input').value.trim();
      var items = itemsText ? itemsText.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; }) : [];
      if (version || date || items.length > 0) {
        changelog.push({ version: version, date: date, items: items });
      }
    }

    var data = {
      name: name,
      description: description,
      version: $('form-version').value,
      category: $('form-category').value,
      tags: $('form-tags').value,
      download_url: $('form-download').value,
      source_url: $('form-source').value,
      website_url: $('form-website').value,
      screenshot_url: $('form-screenshot').value,
      changelog: changelog
    };

    if (editingId) {
      updateProject(editingId, data);
    } else {
      createProject(data);
    }

    closeModal();
    renderAll();
  }

  /* ==================================================================
     CONFIRM DELETE
     ================================================================== */
  function openDeleteConfirm(id) {
    deleteTarget = id;
    confirmModal.removeAttribute('hidden');
  }

  function closeConfirm() {
    confirmModal.setAttribute('hidden', '');
    deleteTarget = null;
  }

  function executeDelete() {
    if (deleteTarget) {
      deleteProject(deleteTarget);
      renderAll();
    }
    closeConfirm();
  }

  /* ==================================================================
     RENDER ALL
     ================================================================== */
  function renderAll() {
    renderProjects();
    updateStats();
    updateFilterBtns();
  }

  /* ==================================================================
     NAVIGATION
     ================================================================== */
  function navigateTo(pageId) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    var navLinks = document.querySelectorAll('.nav-link');
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].classList.remove('active');
      if (navLinks[i].getAttribute('data-page') === pageId) {
        navLinks[i].classList.add('active');
      }
    }

    /* Close mobile nav */
    if (navList) navList.classList.remove('open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0 });
  }

  /* ==================================================================
     EVENT BINDING
     ================================================================== */

  /* Navigation */
  document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-page]');
    if (target) {
      e.preventDefault();
      navigateTo(target.getAttribute('data-page'));
    }
    /* Close dropdowns */
    if (!e.target.closest('.lang-switcher')) {
      if (langMenu) langMenu.classList.remove('open');
    }
    if (!e.target.closest('.theme-switcher')) {
      if (themeMenu) themeMenu.classList.remove('open');
    }
  });

  /* Language */
  if (langBtn) {
    langBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (langMenu) langMenu.classList.toggle('open');
    });
  }
  document.querySelectorAll('.lang-opt').forEach(function(el) {
    el.addEventListener('click', function() {
      var lang = this.getAttribute('data-lang');
      if (lang) setLanguage(lang);
      if (langMenu) langMenu.classList.remove('open');
    });
  });

  /* Theme */
  if (themeBtn) {
    themeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (themeMenu) themeMenu.classList.toggle('open');
    });
  }
  document.querySelectorAll('.theme-opt').forEach(function(el) {
    el.addEventListener('click', function() {
      var theme = this.getAttribute('data-theme');
      if (theme) setTheme(theme);
      if (themeMenu) themeMenu.classList.remove('open');
    });
  });

  /* Mobile nav toggle */
  if (navToggle) {
    navToggle.addEventListener('click', function() {
      var open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
    });
  }

  /* Search */
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearch = this.value;
      renderProjects();
    });
  }

  /* Add project button */
  if (addBtn) addBtn.addEventListener('click', openAddModal);

  /* Modal close */
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (!modal.hasAttribute('hidden')) closeModal();
      if (!confirmModal.hasAttribute('hidden')) closeConfirm();
      if (langMenu) langMenu.classList.remove('open');
      if (themeMenu) themeMenu.classList.remove('open');
      if (navList) navList.classList.remove('open');
    }
  });

  /* Form submit */
  if (form) form.addEventListener('submit', handleFormSubmit);

  /* Confirm modal */
  if (confirmClose) confirmClose.addEventListener('click', closeConfirm);
  if (confirmNo) confirmNo.addEventListener('click', closeConfirm);
  if (confirmYes) confirmYes.addEventListener('click', executeDelete);
  confirmModal.addEventListener('click', function(e) {
    if (e.target === confirmModal) closeConfirm();
  });

  /* Changelog add entry */
  if (addClEntryBtn) {
    addClEntryBtn.addEventListener('click', function() {
      addChangelogEntryForm();
    });
  }

  /* Export */
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  if (settingsExport) settingsExport.addEventListener('click', exportData);

  /* Import */
  if (importBtn) {
    importBtn.addEventListener('click', function() {
      importFile.click();
    });
  }
  if (settingsImport) {
    settingsImport.addEventListener('click', function() {
      importFile.click();
    });
  }
  if (importFile) {
    importFile.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        importData(evt.target.result);
      };
      reader.readAsText(file);
      importFile.value = '';
    });
  }

  /* Clear all data */
  if (settingsClear) {
    settingsClear.addEventListener('click', function() {
      if (confirm(t('clear_confirm'))) {
        projects = [];
        saveProjects();
        renderAll();
        secLog('All data cleared by user', 'warn');
      }
    });
  }

  /* Clear log */
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', function() {
      localStorage.removeItem(LOG_KEY);
      renderSecurityLog();
    });
  }

  /* ==================================================================
     SECURITY: Initialize protections
     ================================================================== */

  /* Keyboard blocker */
  document.addEventListener('keydown', blockDevToolsKeys);

  /* Right-click blocker */
  document.addEventListener('contextmenu', blockRightClick);

  /* Frame bust (redundant) */
  bustFrame();

  /* DevTools detection */
  detectDevTools();
  startDevToolsWatch();

  /* Console protection */
  protectConsole();

  /* Periodic integrity check */
  setInterval(function() {
    var raw = localStorage.getItem(STORAGE_KEY);
    var checksum = localStorage.getItem(INTEGRITY_KEY);
    if (raw && checksum) {
      try {
        var parsed = JSON.parse(raw);
        var computed = computeChecksum(parsed);
        if (computed !== checksum) {
          secLog('Integrity check failed — data may have been tampered with!', 'error');
        }
      } catch(e) {
        secLog('Integrity check error: ' + e.message, 'error');
      }
    }
  }, 30000);

  /* ==================================================================
     INIT
     ================================================================== */
  loadProjects();
  setTheme(currentTheme);
  updateActiveLang(currentLang);
  translatePage();
  renderAll();
  renderSecurityLog();

  /* navigate to dashboard initially */
  navigateTo('dashboard');

})();
