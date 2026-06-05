'use strict';

/* ==================================================================
   ANTI-TAMPER: freeze core prototypes
   ================================================================== */
if (typeof Object.freeze === 'function') {
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
  } catch(e) {}
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
var FAIL_KEY = 'bp_fail_count';
var LOCKOUT_KEY = 'bp_lockout_until';
var SESSION_KEY = 'bp_session';
var MAX_FAILS = 5;
var LOCKOUT_SECS = 60;
var FIXED_SALT = 'bp_salt_42';
var FIXED_HASH = null;
var DEVICE_KEY = 'bp_device';

/* Published data GitHub config */
var GH_OWNER = 'serbodawg';
var GH_REPO = 'big-pickle';
var GH_PATH = 'data/projects.json';
var GH_BRANCH = 'main';
var GH_TOKEN_KEY = 'bp_gh_token';
var GH_RAW = 'https://raw.githubusercontent.com/' + GH_OWNER + '/' + GH_REPO + '/' + GH_BRANCH + '/' + GH_PATH;
var GH_API = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + GH_PATH;

/* Apps repo for auto-import */
var APPS_OWNER = 'serbodawg';
var APPS_REPO = 'apps-linux-only';
var APPS_API = 'https://api.github.com/repos/' + APPS_OWNER + '/' + APPS_REPO + '/releases';

/* Cached published projects (merged into load) */
var publishedProjects = [];

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

/* Dashboard page refs */
var adminGrid = $('admin-grid');
var adminSearchInput = $('search-input-admin');
var adminAddBtn = $('add-project-btn-admin');
var adminExportBtn = $('export-btn-admin');
var adminImportBtn = $('import-btn-admin');
var adminImportFile = $('import-file-admin');
var publishBtn = $('publish-btn');
var publishStatus = $('publish-status');

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
var authenticated = false;

/* ==================================================================
   UTILITY
   ================================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
