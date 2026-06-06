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

/* GitHub profile config */
var GH_USER = 'serbodawg';
var GH_USER_API = 'https://api.github.com/users/' + GH_USER + '/repos?per_page=100&sort=updated';
var GH_TOKEN_KEY = 'bp_gh_token';

/* Language color map */
var LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Java: '#b07219', PHP: '#4F5D95', Ruby: '#701516', Swift: '#F05138',
  Kotlin: '#A97BFF', Lua: '#000080', Haskell: '#5e5086', Scala: '#c22d40',
  Dart: '#00B4AB', Elixir: '#6e4a7e', Clojure: '#db5855', Erlang: '#B83998',
  Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
  Vue: '#41b883', Svelte: '#ff3e00', Dockerfile: '#384d54', Makefile: '#427819',
  TeX: '#3D6117', Perl: '#0298c3', R: '#198CE7', Julia: '#a270ba',
  Nix: '#7e7eff', Zig: '#ec915c', Nim: '#ffc200', Crystal: '#000100',
  Objective_C: '#438eff', Assembly: '#6E4C13', Vim_script: '#199f4b'
};

var repoStatusEl = null;

/* SVG icon set — feather-inspired stroke icons */
var ICONS = {
  home: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  security: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  about: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  features: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  why: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  star_o: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  del: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  source: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  website: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  login: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  arrow_up: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  brand: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  clist: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  fork: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M12 15v-3a3 3 0 00-3-3H9"/><path d="M12 15v-3a3 3 0 013-3h3"/></svg>',
  star_sm: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
};

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
var refreshReposBtn = $('refresh-repos-btn');
repoStatusEl = $('repo-status');

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
var currentSort = 'newest';

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

/* ==================================================================
   TRANSLATIONS — 7 languages
   ================================================================== */
var translations = {
  en: {
    site_title: 'Project Showcase',
    nav_home: 'Home',
    nav_dashboard: 'Dashboard',
    nav_security: 'Security',
    nav_settings: 'Settings',
    nav_about: 'About',
    nav_features: 'Features',
    nav_why: 'Why',
    shield_protected: 'Protected',
    stat_projects: 'Projects',
    stat_downloads: 'Downloads',
    stat_storage: 'Storage',
    search_projects: 'Search projects',
    search_placeholder: 'Search projects...',
    filter_all: 'All',
    add_project: 'Add Project',
    export_data: 'Export Data',
    import_data: 'Import Data',
    hero_title: 'Open Source Projects',
    hero_desc: 'A collection of tools and utilities built with passion.',
    no_projects: 'No Projects Yet',
    no_projects_desc: 'Projects will appear here once added.',
    admin_dashboard: 'Admin Dashboard',
    admin_dashboard_desc: 'Manage your projects from here.',
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
    add_entry: 'Add Entry',
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
    footer_local: 'Powered by GitHub — servers are better.',
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
    import_error: 'Invalid data file.',
    login_title: 'Admin Login',
    login_password: 'Master Password',
    login_unlock: 'Unlock',
    login_setup_title: 'Set Master Password',
    login_setup_label: 'Create Master Password',
    login_setup_btn: 'Set Password',
    login_hint: 'First time? Set your master password to protect the admin panel.',
    login_error_invalid: 'Incorrect password.',
    login_error_short: 'Password must be at least 4 characters.',
    login_error_generic: 'Authentication error.',
    login_attempts_left: 'attempt(s) left',
    login_locked: 'Locked for',
    login_btn: 'Login',
    logout_btn: 'Logout',
    device_title: 'What device are you using?',
    device_desc: 'Select your device for optimal layout.',
    device_tv: 'TV',
    device_pc: 'PC',
    device_phone: 'Phone',
    device_tablet: 'Tablet',
    device_auto: 'Auto-detect',
    pickle_denied: 'ACCESS DENIED',
    pickle_sub: 'This area is for the Pickle Master only!',
    pickle_home: 'Go Home',
    repo_refresh: 'Refresh from GitHub',
    repo_refreshing: 'Refreshing...',
    repo_refreshed: 'Repos refreshed!',
    publish_token_prompt: 'Enter your GitHub Personal Access Token (repo scope):',
    publish_token_invalid: 'Token cannot be empty.',
    publish_token_ok: 'Token saved.',
    sort_newest: 'Newest',
    sort_oldest: 'Oldest',
    sort_name_asc: 'Name A-Z',
    sort_name_desc: 'Name Z-A',
    sort_stars: 'Stars',
    filter_starred: '\u2605 Starred',
    about_title: 'About This Project',
    about_what: 'What is Big Pickle?',
    about_what_desc: 'Big Pickle is a secure, zero-dependency project showcase. It lets you display open-source projects in a clean portfolio, with admin tools to manage them \u2014 all client-side, powered by GitHub.',
    about_tech: 'Built With',
    about_author: 'Author',
    about_license: 'License',
    about_license_desc: 'MIT \u2014 free to use, modify, and distribute. No warranty.',
    features_title: 'Features',
    feat_auth: 'Password Protection',
    feat_auth_desc: 'Admin panel locked behind SHA-256 hashed password, brute-force lockout, and session management.',
    feat_security: 'Security Suite',
    feat_security_desc: 'CSP headers, XSS sanitization, CSRF tokens, storage integrity checksums, DevTools detection, console monitoring, keyboard blocker, frame busting.',
    feat_themes: '3 Themes',
    feat_themes_desc: 'Pickle Green, Pastel Dark Blue, Catppuccin \u2014 all using CSS custom properties, persisted in localStorage.',
    feat_i18n: '7 Languages',
    feat_i18n_desc: 'English, العربية, 中文, Українська, Čeština, Slovenčina, Polski \u2014 full UI translation with instant flag-based switching.',
    feat_device: 'Device Adaptation',
    feat_device_desc: 'Optimized layouts for TV, PC, Phone, and Tablet with auto-detect on first visit.',
    feat_crud: 'Full CRUD',
    feat_crud_desc: 'Create, edit, delete, export, and import projects with changelog support.',
    feat_export: 'Export / Import',
    feat_export_desc: 'JSON-based data portability. Export your entire collection and restore from backup.',
    feat_star: 'Star Projects',
    feat_star_desc: 'Mark favorites, filter by starred, sort by name or date.',
    feat_detail: 'Project Detail View',
    feat_detail_desc: 'Click any project card to see full details, changelog, and all links in a focused modal.',
    feat_shortcuts: 'Keyboard Shortcuts',
    feat_shortcuts_desc: 'N new project, / search, H home, ? help.',
    why_title: 'Why This Exists',
    why_problem: 'The Problem',
    why_problem_desc: 'Most project showcases rely on heavy frameworks, third-party backends, or SaaS platforms that track users, require accounts, and break on slow connections.',
    why_solution: 'The Solution',
    why_solution_desc: 'A single HTML file that works on anything with a browser. No build step. No dependencies. No JavaScript framework. No tracking. Just HTML, CSS, and vanilla JS that runs on a potato.',
    why_philosophy: 'Philosophy',
    why_phil_1: 'Zero dependencies \u2014 every line is intentional',
    why_phil_2: 'Security-first \u2014 protection is not an afterthought',
    why_phil_3: 'Offline-capable \u2014 works without internet (once loaded)',
    why_phil_4: 'Privacy-respecting \u2014 no cookies, no trackers, no analytics',
    why_phil_5: 'Old-hardware friendly \u2014 runs on anything from 2010',
    why_phil_6: 'GitHub-native \u2014 auto-import repos from your profile',
    why_quote: '"The best tool is the one that stays out of your way and doesn\'t break when the internet goes down."',
    detail_downloads: 'Downloads',
    detail_stars: 'Stars',
    detail_changelog: 'Changelog',
    detail_links: 'Links',
    detail_close: 'Close',
    tags: 'Tags',
    recently_viewed: 'Recently Viewed',
    honorable_mentions: 'Honorable Mentions'
  },
  /* --- العربية (Arabic) --- */
  ar: {
    site_title: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639',
    nav_home: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    nav_dashboard: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    nav_security: '\u0627\u0644\u0623\u0645\u0627\u0646',
    nav_settings: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
    nav_about: '\u062d\u0648\u0644',
    nav_features: '\u0627\u0644\u0645\u0645\u064a\u0632\u0627\u062a',
    nav_why: '\u0644\u0645\u0627\u0630\u0627',
    shield_protected: '\u0645\u062d\u0645\u064a',
    stat_projects: '\u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639',
    stat_downloads: '\u0627\u0644\u062a\u0646\u0632\u064a\u0644\u0627\u062a',
    stat_storage: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629',
    search_projects: '\u0628\u062d\u062b \u0639\u0646 \u0645\u0634\u0627\u0631\u064a\u0639',
    search_placeholder: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0634\u0627\u0631\u064a\u0639...',
    filter_all: '\u0627\u0644\u0643\u0644',
    add_project: '\u0625\u0636\u0627\u0641\u0629 \u0645\u0634\u0631\u0648\u0639',
    export_data: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    import_data: '\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    hero_title: '\u0645\u0634\u0627\u0631\u064a\u0639 \u0645\u0641\u062a\u0648\u062d\u0629 \u0627\u0644\u0645\u0635\u062f\u0631',
    hero_desc: '\u0645\u062c\u0645\u0648\u0639\u0629 \u0645\u0646 \u0627\u0644\u0623\u062f\u0648\u0627\u062a \u0648\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0627\u0644\u0645\u0628\u0646\u064a\u0629 \u0628\u0634\u063a\u0641.',
    no_projects: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0634\u0627\u0631\u064a\u0639 \u0628\u0639\u062f',
    no_projects_desc: '\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639 \u0647\u0646\u0627 \u0628\u0639\u062f \u0625\u0636\u0627\u0641\u062a\u0647\u0627.',
    admin_dashboard: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629',
    admin_dashboard_desc: '\u0623\u062f\u0631 \u0645\u0634\u0627\u0631\u064a\u0639\u0643 \u0645\u0646 \u0647\u0646\u0627.',
    security_title: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0645\u0627\u0646',
    sec_csp: '\u0633\u064a\u0627\u0633\u0629 \u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u062d\u062a\u0648\u0649',
    sec_csp_desc: '\u062a\u0645 \u062d\u0638\u0631 \u062d\u0642\u0646 \u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u0628\u0631\u0645\u062c\u064a\u0629 \u0648\u062a\u0633\u0631\u064a\u0628 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.',
    sec_xss: '\u0627\u0644\u0648\u0642\u0627\u064a\u0629 \u0645\u0646 XSS',
    sec_xss_desc: '\u062a\u0645 \u062a\u0646\u0638\u064a\u0641 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u062f\u062e\u0644\u0627\u062a\u061b \u0644\u0627 \u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 innerHTML \u0645\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.',
    sec_clickjack: '\u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0646 Clickjacking',
    sec_clickjack_desc: '\u0646\u0635 \u0643\u0633\u0631 \u0627\u0644\u0625\u0637\u0627\u0631 \u0648 CSP frame-ancestors none \u0646\u0634\u0637\u0627\u0646.',
    sec_storage: '\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646',
    sec_storage_desc: '\u0628\u064a\u0627\u0646\u0627\u062a localStorage \u0645\u062a\u062d\u0642\u0642 \u0645\u0646\u0647\u0627 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u064a \u0644\u0645\u0646\u0639 \u0627\u0644\u0639\u0628\u062b.',
    sec_devtools: '\u0643\u0634\u0641 \u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0645\u0637\u0648\u0631\u064a\u0646',
    sec_devtools_desc: '\u064a\u062a\u0645 \u0643\u0634\u0641 \u0648\u062a\u0633\u062c\u064a\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0645\u0637\u0648\u0631\u064a\u0646.',
    sec_rate: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u0639\u062f\u0644',
    sec_rate_desc: '\u064a\u062a\u0645 \u062a\u0642\u064a\u064a\u062f \u0639\u062f\u062f \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0645\u0646\u0639 \u0625\u0633\u0627\u0621 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645.',
    sec_console: '\u062d\u0645\u0627\u064a\u0629 \u0648\u062d\u062f\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    sec_console_desc: '\u064a\u062a\u0645 \u0645\u0631\u0627\u0642\u0628\u0629 \u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0627\u0644\u0643\u062a\u0627\u0628\u0629 \u0641\u0648\u0642 \u0648\u062d\u062f\u0629 \u0627\u0644\u062a\u062d\u0643\u0645.',
    sec_frame: '\u0643\u0633\u0631 \u0627\u0644\u0625\u0637\u0627\u0631',
    sec_frame_desc: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629 \u062f\u0627\u062e\u0644 iframe.',
    sec_log: '\u0633\u062c\u0644 \u0627\u0644\u0623\u0645\u0627\u0646',
    clear_log: '\u0645\u0633\u062d \u0627\u0644\u0633\u062c\u0644',
    settings_title: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
    settings_theme: '\u0627\u0644\u0645\u0648\u0636\u0648\u0639',
    settings_language: '\u0627\u0644\u0644\u063a\u0629',
    settings_data: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    clear_all: '\u0645\u0633\u062d \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    project_name: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 *',
    project_version: '\u0627\u0644\u0625\u0635\u062f\u0627\u0631',
    project_desc: '\u0627\u0644\u0648\u0635\u0641 *',
    project_category: '\u0627\u0644\u062a\u0635\u0646\u064a\u0641',
    project_tags: '\u0627\u0644\u0648\u0633\u0648\u0645 (\u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)',
    project_download: '\u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u0646\u0632\u064a\u0644',
    project_source: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0635\u062f\u0631',
    project_website: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639',
    project_screenshot: '\u0631\u0627\u0628\u0637 \u0644\u0642\u0637\u0629 \u0634\u0627\u0634\u0629',
    changelog: '\u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a',
    add_entry: '\u0625\u0636\u0627\u0641\u0629 \u0645\u062f\u062e\u0644',
    cancel: '\u0625\u0644\u063a\u0627\u0621',
    save: '\u062d\u0641\u0638 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    edit_project: '\u062a\u062d\u0631\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    confirm_delete: '\u062d\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    confirm_delete_msg: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u061f',
    delete: '\u062d\u0630\u0641',
    download: '\u062a\u0646\u0632\u064a\u0644',
    source_code: '\u0627\u0644\u0645\u0635\u062f\u0631',
    website: '\u0627\u0644\u0645\u0648\u0642\u0639',
    edit: '\u062a\u062d\u0631\u064a\u0631',
    contact_success: '\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0628\u0646\u062c\u0627\u062d!',
    contact_error: '\u0627\u0644\u0631\u062c\u0627\u0621 \u0645\u0644\u0621 \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0644.',
    no_results: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0645\u0634\u0627\u0631\u064a\u0639 \u0645\u0637\u0627\u0628\u0642\u0629.',
    footer_secured: '\u0645\u0624\u0645\u0646 \u0628\u0648\u0627\u0633\u0637\u0629',
    footer_antihacker: '\u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0636\u062f \u0627\u0644\u0627\u062e\u062a\u0631\u0627\u0642',
    footer_local: '\u0645\u0634\u063a\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 GitHub \u2014 \u0627\u0644\u062e\u0648\u0627\u062f\u0645 \u0623\u0641\u0636\u0644.',
    category_all: '\u0627\u0644\u0643\u0644',
    settings_export: '\u062a\u0635\u062f\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',
    skip_nav: '\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a',
    theme_green: '\u0623\u062e\u0636\u0631 \u0641\u064a\u0643\u0644',
    theme_pastel: '\u0623\u0632\u0631\u0642 \u062f\u0627\u0643\u0646 \u0628\u0627\u0633\u062a\u064a\u0644',
    theme_catppuccin: '\u0643\u0627\u062a\u0628\u0648\u062a\u0634\u064a\u0646',
    version: '\u0627\u0644\u0625\u0635\u062f\u0627\u0631',
    save_changes: '\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a',
    project_edit: '\u062a\u062d\u0631\u064a\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    clear_confirm: '\u0645\u0633\u062d \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629.',
    import_success: '\u062a\u0645 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u062c\u0627\u062d.',
    import_error: '\u0645\u0644\u0641 \u0628\u064a\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0635\u0627\u0644\u062d.',
    login_title: '\u062f\u062e\u0648\u0644 \u0627\u0644\u0645\u0634\u0631\u0641',
    login_password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    login_unlock: '\u0641\u062a\u062d',
    login_setup_title: '\u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    login_setup_label: '\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0631\u0626\u064a\u0633\u064a\u0629',
    login_setup_btn: '\u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    login_hint: '\u0627\u0644\u0645\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649\u061f \u0642\u0645 \u0628\u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0631\u0626\u064a\u0633\u064a\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629.',
    login_error_invalid: '\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629.',
    login_error_short: '\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 4 \u0623\u062d\u0631\u0641.',
    login_error_generic: '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629.',
    login_attempts_left: '\u0645\u062d\u0627\u0648\u0644\u0629 (\u0627\u062a) \u0645\u062a\u0628\u0642\u064a\u0629',
    login_locked: '\u0645\u0642\u0641\u0648\u0644 \u0644\u0645\u062f\u0629',
    login_btn: '\u062f\u062e\u0648\u0644',
    logout_btn: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
    device_title: '\u0645\u0627 \u0627\u0644\u062c\u0647\u0627\u0632 \u0627\u0644\u0630\u064a \u062a\u0633\u062a\u062e\u062f\u0645\u0647\u061f',
    device_desc: '\u062d\u062f\u062f \u062c\u0647\u0627\u0632\u0643 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u062a\u062e\u0637\u064a\u0637 \u0623\u0645\u062b\u0644.',
    device_tv: '\u062a\u0644\u0641\u0627\u0632',
    device_pc: '\u062d\u0627\u0633\u0648\u0628',
    device_phone: '\u0647\u0627\u062a\u0641',
    device_tablet: '\u0644\u0648\u062d\u064a',
    device_auto: '\u0643\u0634\u0641 \u062a\u0644\u0642\u0627\u0626\u064a',
    pickle_denied: '\u0627\u0644\u062f\u062e\u0648\u0644 \u0645\u0645\u0646\u0648\u0639',
    pickle_sub: '\u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0644\u0633\u064a\u062f \u0627\u0644\u0645\u062e\u0644\u0644 \u0641\u0642\u0637!',
    pickle_home: '\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    repo_refresh: '\u062a\u062d\u062f\u064a\u062b \u0645\u0646 GitHub',
    repo_refreshing: '\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u062f\u064a\u062b...',
    repo_refreshed: '\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639\u0627\u062a!',
    publish_token_prompt: '\u0623\u062f\u062e\u0644 \u0631\u0645\u0632 \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0634\u062e\u0635\u064a \u0644\u0640 GitHub (\u0646\u0637\u0627\u0642 repo):',
    publish_token_invalid: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0631\u0645\u0632 \u0641\u0627\u0631\u063a\u064b\u0627.',
    publish_token_ok: '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0631\u0645\u0632.',
    sort_newest: '\u0627\u0644\u0623\u062d\u062f\u062b',
    sort_oldest: '\u0627\u0644\u0623\u0642\u062f\u0645',
    sort_name_asc: '\u0627\u0644\u0627\u0633\u0645 \u0623-\u064a',
    sort_name_desc: '\u0627\u0644\u0627\u0633\u0645 \u064a-\u0623',
    sort_stars: '\u0627\u0644\u0646\u062c\u0648\u0645',
    filter_starred: '\u2605 \u0645\u0645\u064a\u0632\u0629 \u0628\u0646\u062c\u0645\u0629',
    about_title: '\u062d\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    about_what: '\u0645\u0627 \u0647\u0648 Big Pickle\u061f',
    about_what_desc: 'Big Pickle \u0647\u0648 \u0639\u0631\u0636 \u0645\u0634\u0627\u0631\u064a\u0639 \u0622\u0645\u0646 \u0648\u062e\u0627\u0644\u064d \u0645\u0646 \u0627\u0644\u062a\u0628\u0639\u064a\u0627\u062a. \u064a\u0633\u0645\u062d \u0644\u0643 \u0628\u0639\u0631\u0636 \u0645\u0634\u0627\u0631\u064a\u0639 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0645\u0641\u062a\u0648\u062d \u0641\u064a \u0645\u062d\u0641\u0638\u0629 \u0646\u0638\u064a\u0641\u0629\u060c \u0645\u0639 \u0623\u062f\u0648\u0627\u062a \u0625\u062f\u0627\u0631\u064a\u0629 \u0644\u0625\u062f\u0627\u0631\u062a\u0647\u0627 \u2014 \u0643\u0644\u0647\u0627 \u0639\u0644\u0649 \u062c\u0627\u0646\u0628 \u0627\u0644\u0639\u0645\u064a\u0644\u060c \u0645\u062f\u0639\u0648\u0645\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 GitHub.',
    about_tech: '\u0628\u0646\u064a \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645',
    about_author: '\u0627\u0644\u0645\u0624\u0644\u0641',
    about_license: '\u0627\u0644\u0631\u062e\u0635\u0629',
    about_license_desc: 'MIT \u2014 \u064a\u0645\u0643\u0646\u0643 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647 \u0648\u062a\u0639\u062f\u064a\u0644\u0647 \u0648\u062a\u0648\u0632\u064a\u0639\u0647. \u0628\u062f\u0648\u0646 \u0636\u0645\u0627\u0646.',
    features_title: '\u0627\u0644\u0645\u0645\u064a\u0632\u0627\u062a',
    feat_auth: '\u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0628\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    feat_auth_desc: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0645\u062d\u0645\u064a\u0629 \u0628\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 SHA-256\u060c \u0648\u0625\u063a\u0644\u0627\u0642 \u0628\u0639\u062f \u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0641\u0627\u0634\u0644\u0629\u060c \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062c\u0644\u0633\u0627\u062a.',
    feat_security: '\u062d\u0632\u0645\u0629 \u0627\u0644\u0623\u0645\u0627\u0646',
    feat_security_desc: 'CSP\u060c \u062a\u0646\u0638\u064a\u0641 XSS\u060c \u0631\u0645\u0648\u0632 CSRF\u060c \u0645\u062c\u0627\u0645\u064a\u0639 \u0627\u062e\u062a\u0628\u0627\u0631\u064a\u0629\u060c \u0643\u0634\u0641 DevTools\u060c \u0645\u0631\u0627\u0642\u0628\u0629 \u0648\u062d\u062f\u0629 \u0627\u0644\u062a\u062d\u0643\u0645\u060c \u062d\u0627\u062c\u0628 \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0641\u0627\u062a\u064a\u062d\u060c \u0643\u0633\u0631 \u0627\u0644\u0625\u0637\u0627\u0631.',
    feat_themes: '3 \u0645\u0648\u0627\u0636\u064a\u0639',
    feat_themes_desc: 'Pickle Green\u060c Pastel Dark Blue\u060c Catppuccin \u2014 \u062c\u0645\u064a\u0639\u0647\u0627 \u062a\u0633\u062a\u062e\u062f\u0645 CSS Custom Properties\u060c \u0645\u062d\u0641\u0648\u0638\u0629 \u0641\u064a localStorage.',
    feat_i18n: '7 \u0644\u063a\u0627\u062a',
    feat_i18n_desc: 'English\u060c \u0627\u0644\u0639\u0631\u0628\u064a\u0629\u060c \u4e2d\u6587\u060c \u0423\u043a\u0631\u0627\u0456\u043d\u0441\u044c\u043a\u0430\u060c \u010ce\u0161tina\u060c Sloven\u010dina\u060c Polski \u2014 \u062a\u0631\u062c\u0645\u0629 \u0643\u0627\u0645\u0644\u0629 \u0644\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0639 \u062a\u0628\u062f\u064a\u0644 \u0641\u0648\u0631\u064a \u0639\u0628\u0631 \u0627\u0644\u0623\u0639\u0644\u0627\u0645.',
    feat_device: '\u0627\u0644\u062a\u0643\u064a\u0641 \u0645\u0639 \u0627\u0644\u0623\u062c\u0647\u0632\u0629',
    feat_device_desc: '\u062a\u062e\u0637\u064a\u0637\u0627\u062a \u0645\u062d\u0633\u0646\u0629 \u0644\u0644\u062a\u0644\u0641\u0627\u0632 \u0648\u0627\u0644\u062d\u0627\u0633\u0648\u0628 \u0648\u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0627\u0644\u0644\u0648\u062d\u064a \u0645\u0639 \u0627\u0644\u0643\u0634\u0641 \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a \u0639\u0646\u062f \u0623\u0648\u0644 \u0632\u064a\u0627\u0631\u0629.',
    feat_crud: 'CRUD \u0643\u0627\u0645\u0644',
    feat_crud_desc: '\u0623\u0646\u0634\u0626\u060c \u0648\u062d\u0631\u0631\u060c \u0648\u0627\u062d\u0630\u0641\u060c \u0648\u0635\u062f\u0651\u0631\u060c \u0648\u0627\u0633\u062a\u0648\u0631\u062f \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639 \u0645\u0639 \u062f\u0639\u0645 \u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a.',
    feat_export: '\u062a\u0635\u062f\u064a\u0631 / \u0627\u0633\u062a\u064a\u0631\u0627\u062f',
    feat_export_desc: '\u0642\u0627\u0628\u0644\u064a\u0629 \u0646\u0642\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0648\u0627\u0633\u0637\u0629 JSON. \u0635\u062f\u0651\u0631 \u0645\u062c\u0645\u0648\u0639\u062a\u0643 \u0643\u0627\u0645\u0644\u0629 \u0648\u0627\u0633\u062a\u0639\u062f\u0647\u0627 \u0645\u0646 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629.',
    feat_star: '\u062a\u0645\u064a\u064a\u0632 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639',
    feat_star_desc: '\u0636\u0639 \u0639\u0644\u0627\u0645\u0627\u062a \u0639\u0644\u0649 \u0627\u0644\u0645\u0641\u0636\u0644\u0629\u060c \u0648\u0635\u0641\u0651\u064a \u062d\u0633\u0628 \u0627\u0644\u0645\u0645\u064a\u0632\u0629\u060c \u0648\u0631\u062a\u0651\u0628 \u062d\u0633\u0628 \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u062a\u0627\u0631\u064a\u062e.',
    feat_detail: '\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    feat_detail_desc: '\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0644\u0631\u0624\u064a\u0629 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u0644\u0629\u060c \u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0648\u062c\u0645\u064a\u0639 \u0627\u0644\u0631\u0648\u0627\u0628\u0637.',
    feat_shortcuts: '\u0627\u062e\u062a\u0635\u0627\u0631\u0627\u062a \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0641\u0627\u062a\u064a\u062d',
    feat_shortcuts_desc: 'N \u0645\u0634\u0631\u0648\u0639 \u062c\u062f\u064a\u062f\u060c / \u0628\u062d\u062b\u060c H \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629\u060c ? \u0645\u0633\u0627\u0639\u062f\u0629.',
    why_title: '\u0644\u0645\u0627\u0630\u0627 \u0648\u062c\u062f \u0647\u0630\u0627',
    why_problem: '\u0627\u0644\u0645\u0634\u0643\u0644\u0629',
    why_problem_desc: '\u0645\u0639\u0638\u0645 \u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639 \u062a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0623\u0637\u0631 \u062b\u0642\u064a\u0644\u0629\u060c \u062e\u0648\u0627\u062f\u0645 \u062e\u0644\u0641\u064a\u0629 \u062e\u0627\u0631\u062c\u064a\u0629\u060c \u0623\u0648 \u0645\u0646\u0635\u0627\u062a SaaS \u062a\u062a\u0628\u0639 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646\u060c \u0648\u062a\u062a\u0637\u0644\u0628 \u062d\u0633\u0627\u0628\u0627\u062a\u060c \u0648\u062a\u062a\u0639\u0637\u0644 \u0639\u0646\u062f \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0627\u0644\u0628\u0637\u064a\u0626\u0629.',
    why_solution: '\u0627\u0644\u062d\u0644',
    why_solution_desc: '\u0645\u0644\u0641 HTML \u0648\u0627\u062d\u062f \u064a\u0639\u0645\u0644 \u0639\u0644\u0649 \u0623\u064a \u0634\u064a\u0621 \u0628\u0647 \u0645\u062a\u0635\u0641\u062d. \u0644\u0627 \u062d\u0627\u062c\u0629 \u0644\u0628\u0646\u0627\u0621. \u0644\u0627 \u062a\u0628\u0639\u064a\u0627\u062a. \u0644\u0627 \u0625\u0637\u0627\u0631 JS. \u0644\u0627 \u062a\u062a\u0628\u0639. \u0641\u0642\u0637 HTML\u060c CSS\u060c \u0648JS \u062e\u0627\u0645 \u064a\u0639\u0645\u0644 \u0639\u0644\u0649 \u0623\u064a \u062c\u0647\u0627\u0632.',
    why_philosophy: '\u0627\u0644\u0641\u0644\u0633\u0641\u0629',
    why_phil_1: '\u0635\u0641\u0631 \u062a\u0628\u0639\u064a\u0627\u062a \u2014 \u0643\u0644 \u0633\u0637\u0631 \u0645\u062a\u0639\u0645\u062f',
    why_phil_2: '\u0627\u0644\u0623\u0645\u0627\u0646 \u0623\u0648\u0644\u0627\u064b \u2014 \u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0644\u064a\u0633\u062a \u0628\u0639\u062f \u0627\u0644\u062a\u0641\u0643\u064a\u0631',
    why_phil_3: '\u0627\u0644\u0639\u0645\u0644 \u0628\u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644 \u2014 \u064a\u0639\u0645\u0644 \u0628\u062f\u0648\u0646 \u0627\u0646\u062a\u0631\u0646\u062a (\u0628\u0639\u062f \u0627\u0644\u062a\u062d\u0645\u064a\u0644)',
    why_phil_4: '\u0627\u062d\u062a\u0631\u0627\u0645 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u2014 \u0644\u0627 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641\u060c \u0644\u0627 \u0645\u062a\u062a\u0628\u0639\u0627\u062a\u060c \u0644\u0627 \u062a\u062d\u0644\u064a\u0644',
    why_phil_5: '\u0635\u062f\u064a\u0642 \u0644\u0644\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u0642\u062f\u064a\u0645\u0629 \u2014 \u064a\u0639\u0645\u0644 \u0639\u0644\u0649 \u0623\u064a \u0634\u064a\u0621 \u0645\u0646 2010',
    why_phil_6: 'GitHub-\u0623\u0635\u0644\u064a \u2014 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639\u0627\u062a \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627 \u0645\u0646 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a',
    why_quote: '\u0623\u0641\u0636\u0644 \u0623\u062f\u0627\u0629 \u0647\u064a \u062a\u0644\u0643 \u0627\u0644\u062a\u064a \u0644\u0627 \u062a\u0642\u0641 \u0641\u064a \u0637\u0631\u064a\u0642\u0643 \u0648\u0644\u0627 \u062a\u062a\u0639\u0637\u0644 \u0639\u0646\u062f\u0645\u0627 \u064a\u0646\u0642\u0637\u0639 \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a.',
    detail_downloads: '\u0627\u0644\u062a\u0646\u0632\u064a\u0644\u0627\u062a',
    detail_stars: '\u0627\u0644\u0646\u062c\u0648\u0645',
    detail_changelog: '\u0633\u062c\u0644 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a',
    detail_links: '\u0627\u0644\u0631\u0648\u0627\u0628\u0637',
    detail_close: '\u0625\u063a\u0644\u0627\u0642',
    tags: '\u0627\u0644\u0648\u0633\u0648\u0645',
    recently_viewed: '\u062a\u0645 \u0627\u0644\u0639\u0631\u0636 \u0645\u0624\u062e\u0631\u064b\u0627',
    honorable_mentions: '\u0625\u0634\u0627\u062f\u0627\u062a \u0634\u0631\u0641'
  },
  /* --- 中文 (Chinese Simplified) --- */
  zh: {
    site_title: '\u9879\u76ee\u5c55\u793a',
    nav_home: '\u9996\u9875',
    nav_dashboard: '\u63a7\u5236\u9762\u677f',
    nav_security: '\u5b89\u5168',
    nav_settings: '\u8bbe\u7f6e',
    nav_about: '\u5173\u4e8e',
    nav_features: '\u529f\u80fd',
    nav_why: '\u4e3a\u4ec0\u4e48',
    shield_protected: '\u5df2\u4fdd\u62a4',
    stat_projects: '\u9879\u76ee',
    stat_downloads: '\u4e0b\u8f7d',
    stat_storage: '\u5b58\u50a8',
    search_projects: '\u641c\u7d22\u9879\u76ee',
    search_placeholder: '\u641c\u7d22\u9879\u76ee...',
    filter_all: '\u5168\u90e8',
    add_project: '\u6dfb\u52a0\u9879\u76ee',
    export_data: '\u5bfc\u51fa\u6570\u636e',
    import_data: '\u5bfc\u5165\u6570\u636e',
    hero_title: '\u5f00\u6e90\u9879\u76ee',
    hero_desc: '\u4e00\u7cfb\u5217\u7528\u70ed\u60c5\u6784\u5efa\u7684\u5de5\u5177\u548c\u5b9e\u7528\u7a0b\u5e8f\u3002',
    no_projects: '\u5c1a\u65e0\u9879\u76ee',
    no_projects_desc: '\u9879\u76ee\u5c06\u5728\u6dfb\u52a0\u540e\u663e\u793a\u5728\u6b64\u3002',
    admin_dashboard: '\u7ba1\u7406\u5458\u63a7\u5236\u9762\u677f',
    admin_dashboard_desc: '\u5728\u6b64\u7ba1\u7406\u60a8\u7684\u9879\u76ee\u3002',
    security_title: '\u5b89\u5168\u6982\u89c8',
    sec_csp: '\u5185\u5bb9\u5b89\u5168\u7b56\u7565',
    sec_csp_desc: '\u811a\u672c\u6ce8\u5165\u548c\u6570\u636e\u6cc4\u9732\u5df2\u88ab\u963b\u6b62\u3002',
    sec_xss: 'XSS \u9632\u5fa1',
    sec_xss_desc: '\u6240\u6709\u7528\u6237\u8f93\u5165\u5747\u5df2\u6e05\u6d01\u5904\u7406\uff1b\u4e0d\u4f7f\u7528 innerHTML \u5904\u7406\u7528\u6237\u6570\u636e\u3002',
    sec_clickjack: '\u70b9\u51fb\u52ab\u6301\u9632\u62a4',
    sec_clickjack_desc: '\u5df2\u542f\u7528\u7834\u6846\u811a\u672c\u548c CSP frame-ancestors none\u3002',
    sec_storage: '\u5b58\u50a8\u5b8c\u6574\u6027',
    sec_storage_desc: 'localStorage \u6570\u636e\u901a\u8fc7\u6821\u9a8c\u548c\u8fdb\u884c\u9632\u7be1\u6539\u9a8c\u8bc1\u3002',
    sec_devtools: '\u5f00\u53d1\u8005\u5de5\u5177\u68c0\u6d4b',
    sec_devtools_desc: '\u68c0\u6d4b\u5e76\u8bb0\u5f55\u5f00\u53d1\u8005\u5de5\u5177\u7684\u4f7f\u7528\u60c5\u51b5\u3002',
    sec_rate: '\u901f\u7387\u9650\u5236',
    sec_rate_desc: '\u9650\u5236\u8868\u5355\u63d0\u4ea4\u4ee5\u9632\u6b62\u6ee5\u7528\u3002',
    sec_console: '\u63a7\u5236\u53f0\u4fdd\u62a4',
    sec_console_desc: '\u76d1\u63a7\u5bf9\u63a7\u5236\u53f0\u7684\u8986\u5199\u5c1d\u8bd5\u3002',
    sec_frame: '\u7834\u6846\u9632\u62a4',
    sec_frame_desc: '\u9875\u9762\u65e0\u6cd5\u5728 iframe \u4e2d\u52a0\u8f7d\u3002',
    sec_log: '\u5b89\u5168\u65e5\u5fd7',
    clear_log: '\u6e05\u9664\u65e5\u5fd7',
    settings_title: '\u8bbe\u7f6e',
    settings_theme: '\u4e3b\u9898',
    settings_language: '\u8bed\u8a00',
    settings_data: '\u6570\u636e\u7ba1\u7406',
    clear_all: '\u6e05\u9664\u6240\u6709\u6570\u636e',
    project_name: '\u9879\u76ee\u540d\u79f0 *',
    project_version: '\u7248\u672c',
    project_desc: '\u63cf\u8ff0 *',
    project_category: '\u5206\u7c7b',
    project_tags: '\u6807\u7b7e\uff08\u7528\u9017\u53f7\u5206\u9694\uff09',
    project_download: '\u4e0b\u8f7d\u94fe\u63a5',
    project_source: '\u6e90\u4ee3\u7801\u94fe\u63a5',
    project_website: '\u7f51\u7ad9\u94fe\u63a5',
    project_screenshot: '\u622a\u5c4f\u94fe\u63a5',
    changelog: '\u53d8\u66f4\u65e5\u5fd7',
    add_entry: '\u6dfb\u52a0\u6761\u76ee',
    cancel: '\u53d6\u6d88',
    save: '\u4fdd\u5b58\u9879\u76ee',
    edit_project: '\u7f16\u8f91\u9879\u76ee',
    confirm_delete: '\u5220\u9664\u9879\u76ee',
    confirm_delete_msg: '\u60a8\u786e\u5b9a\u8981\u5220\u9664\u6b64\u9879\u76ee\u5417\uff1f',
    delete: '\u5220\u9664',
    download: '\u4e0b\u8f7d',
    source_code: '\u6e90\u4ee3\u7801',
    website: '\u7f51\u7ad9',
    edit: '\u7f16\u8f91',
    contact_success: '\u6d88\u606f\u53d1\u9001\u6210\u529f\uff01',
    contact_error: '\u8bf7\u586b\u5199\u6240\u6709\u5b57\u6bb5\u3002',
    no_results: '\u672a\u627e\u5230\u5339\u914d\u7684\u9879\u76ee\u3002',
    footer_secured: '\u4fdd\u62a4\u6765\u81ea',
    footer_antihacker: '\u9632\u9ed1\u5ba2\u4fdd\u62a4',
    footer_local: '\u7531 GitHub \u9a71\u52a8 \u2014 \u670d\u52a1\u5668\u66f4\u597d\u3002',
    category_all: '\u5168\u90e8',
    settings_export: '\u5bfc\u51fa\u6570\u636e',
    skip_nav: '\u8df3\u8f6c\u5230\u4e3b\u8981\u5185\u5bb9',
    theme_green: '\u9178\u9ec4\u74dc\u7eff',
    theme_pastel: '\u6de1\u84dd\u8272\u6df1\u8272',
    theme_catppuccin: '\u5361\u5e03\u5947\u8bfa',
    version: '\u7248\u672c',
    save_changes: '\u4fdd\u5b58\u66f4\u6539',
    project_edit: '\u7f16\u8f91\u9879\u76ee',
    clear_confirm: '\u6e05\u9664\u6240\u6709\u6570\u636e\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002',
    import_success: '\u6570\u636e\u5bfc\u5165\u6210\u529f\u3002',
    import_error: '\u65e0\u6548\u7684\u6570\u636e\u6587\u4ef6\u3002',
    login_title: '\u7ba1\u7406\u5458\u767b\u5f55',
    login_password: '\u4e3b\u5bc6\u7801',
    login_unlock: '\u89e3\u9501',
    login_setup_title: '\u8bbe\u7f6e\u4e3b\u5bc6\u7801',
    login_setup_label: '\u521b\u5efa\u4e3b\u5bc6\u7801',
    login_setup_btn: '\u8bbe\u7f6e\u5bc6\u7801',
    login_hint: '\u7b2c\u4e00\u6b21\u4f7f\u7528\uff1f\u8bbe\u7f6e\u60a8\u7684\u4e3b\u5bc6\u7801\u4ee5\u4fdd\u62a4\u7ba1\u7406\u5458\u9762\u677f\u3002',
    login_error_invalid: '\u5bc6\u7801\u9519\u8bef\u3002',
    login_error_short: '\u5bc6\u7801\u81f3\u5c11\u9700\u8981 4 \u4e2a\u5b57\u7b26\u3002',
    login_error_generic: '\u9a8c\u8bc1\u9519\u8bef\u3002',
    login_attempts_left: '\u5269\u4f59\u5c1d\u8bd5',
    login_locked: '\u5df2\u9501\u5b9a',
    login_btn: '\u767b\u5f55',
    logout_btn: '\u6ce8\u9500',
    device_title: '\u60a8\u5728\u4f7f\u7528\u4ec0\u4e48\u8bbe\u5907\uff1f',
    device_desc: '\u9009\u62e9\u60a8\u7684\u8bbe\u5907\u4ee5\u83b7\u53d6\u6700\u4f73\u5e03\u5c40\u3002',
    device_tv: '\u7535\u89c6',
    device_pc: '\u7535\u8111',
    device_phone: '\u624b\u673a',
    device_tablet: '\u5e73\u677f',
    device_auto: '\u81ea\u52a8\u68c0\u6d4b',
    pickle_denied: '\u8bbf\u95ee\u88ab\u62d2',
    pickle_sub: '\u6b64\u533a\u57df\u4ec5\u9650\u68d2\u68d2\u7cd6\u5927\u5e08\u8bbf\u95ee\uff01',
    pickle_home: '\u8fd4\u56de\u9996\u9875',
    repo_refresh: '\u4ece GitHub \u5237\u65b0',
    repo_refreshing: '\u6b63\u5728\u5237\u65b0...',
    repo_refreshed: '\u4ed3\u5e93\u5df2\u5237\u65b0!',
    publish_token_prompt: '\u8bf7\u8f93\u5165\u60a8\u7684 GitHub \u4e2a\u4eba\u8bbf\u95ee\u4ee4\u724c\uff08repo \u8303\u56f4\uff09\uff1a',
    publish_token_invalid: '\u4ee4\u724c\u4e0d\u80fd\u4e3a\u7a7a\u3002',
    publish_token_ok: '\u4ee4\u724c\u5df2\u4fdd\u5b58\u3002',
    sort_newest: '\u6700\u65b0',
    sort_oldest: '\u6700\u65e7',
    sort_name_asc: '\u540d\u79f0 A-Z',
    sort_name_desc: '\u540d\u79f0 Z-A',
    sort_stars: '\u661f\u661f',
    filter_starred: '\u2605 \u661f\u6807',
    about_title: '\u5173\u4e8e\u672c\u9879\u76ee',
    about_what: '\u4ec0\u4e48\u662f Big Pickle\uff1f',
    about_what_desc: 'Big Pickle \u662f\u4e00\u4e2a\u5b89\u5168\u3001\u96f6\u4f9d\u8d56\u7684\u9879\u76ee\u5c55\u793a\u5e73\u53f0\u3002\u5b83\u5141\u8bb8\u60a8\u5728\u5e72\u51c0\u7684\u4e13\u4e1a\u7f51\u9875\u4e2d\u5c55\u793a\u5f00\u6e90\u9879\u76ee\uff0c\u5e76\u63d0\u4f9b\u7ba1\u7406\u5de5\u5177 \u2014 \u5168\u90e8\u5728\u5ba2\u6237\u7aef\u5b9e\u73b0\uff0c\u7531 GitHub \u9a71\u52a8\u3002',
    about_tech: '\u6784\u5efa\u6280\u672f',
    about_author: '\u4f5c\u8005',
    about_license: '\u8bb8\u53ef\u8bc1',
    about_license_desc: 'MIT \u2014 \u53ef\u81ea\u7531\u4f7f\u7528\u3001\u4fee\u6539\u548c\u53d1\u5e03\u3002\u4e0d\u63d0\u4f9b\u4efb\u4f55\u4fdd\u8bc1\u3002',
    features_title: '\u529f\u80fd\u7279\u6027',
    feat_auth: '\u5bc6\u7801\u4fdd\u62a4',
    feat_auth_desc: '\u7ba1\u7406\u5458\u9762\u677f\u7531 SHA-256 \u5bc6\u7801\u3001\u66b4\u529b\u7834\u89e3\u9501\u5b9a\u548c\u4f1a\u8bdd\u7ba1\u7406\u4fdd\u62a4\u3002',
    feat_security: '\u5b89\u5168\u5957\u4ef6',
    feat_security_desc: 'CSP \u5934\u3001XSS \u6e05\u6d01\u3001CSRF \u4ee4\u724c\u3001\u5b58\u50a8\u6821\u9a8c\u3001DevTools \u68c0\u6d4b\u3001\u63a7\u5236\u53f0\u76d1\u63a7\u3001\u952e\u76d8\u62e6\u622a\u3001\u7834\u6846\u9632\u62a4\u3002',
    feat_themes: '3 \u79cd\u4e3b\u9898',
    feat_themes_desc: 'Pickle Green\u3001Pastel Dark Blue\u3001Catppuccin \u2014 \u5747\u4f7f\u7528 CSS \u81ea\u5b9a\u4e49\u5c5e\u6027\uff0c\u5b58\u50a8\u5728 localStorage \u4e2d\u3002',
    feat_i18n: '7 \u79cd\u8bed\u8a00',
    feat_i18n_desc: 'English\u3001\u0627\u0644\u0639\u0631\u0628\u064a\u0629\u3001\u4e2d\u6587\u3001\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430\u3001\u010ce\u0161tina\u3001Sloven\u010dina\u3001Polski \u2014 \u5168\u9762 UI \u7ffb\u8bd1\uff0c\u901a\u8fc7\u56fd\u65d7\u5373\u65f6\u5207\u6362\u3002',
    feat_device: '\u8bbe\u5907\u9002\u914d',
    feat_device_desc: '\u4e3a TV\u3001PC\u3001\u624b\u673a\u548c\u5e73\u677f\u4f18\u5316\u5e03\u5c40\uff0c\u9996\u6b21\u8bbf\u95ee\u65f6\u81ea\u52a8\u68c0\u6d4b\u3002',
    feat_crud: '\u5b8c\u6574 CRUD',
    feat_crud_desc: '\u521b\u5efa\u3001\u7f16\u8f91\u3001\u5220\u9664\u3001\u5bfc\u51fa\u548c\u5bfc\u5165\u9879\u76ee\uff0c\u652f\u6301\u53d8\u66f4\u65e5\u5fd7\u3002',
    feat_export: '\u5bfc\u51fa / \u5bfc\u5165',
    feat_export_desc: '\u57fa\u4e8e JSON \u7684\u6570\u636e\u53ef\u79fb\u690d\u6027\u3002\u5bfc\u51fa\u60a8\u7684\u6574\u4e2a\u6536\u85cf\u5e76\u4ece\u5907\u4efd\u4e2d\u6062\u590d\u3002',
    feat_star: '\u661f\u6807\u9879\u76ee',
    feat_star_desc: '\u6807\u8bb0\u6536\u85cf\uff0c\u6309\u661f\u6807\u7b5b\u9009\uff0c\u6309\u540d\u79f0\u6216\u65e5\u671f\u6392\u5e8f\u3002',
    feat_detail: '\u9879\u76ee\u8be6\u60c5\u89c6\u56fe',
    feat_detail_desc: '\u70b9\u51fb\u4efb\u4f55\u9879\u76ee\u5361\u7247\u4ee5\u67e5\u770b\u5b8c\u6574\u8be6\u60c5\u3001\u53d8\u66f4\u65e5\u5fd7\u548c\u6240\u6709\u94fe\u63a5\u3002',
    feat_shortcuts: '\u952e\u76d8\u5feb\u6377\u952e',
    feat_shortcuts_desc: 'N \u65b0\u9879\u76ee\uff0c/ \u641c\u7d22\uff0cH \u9996\u9875\uff0c? \u5e2e\u52a9\u3002',
    why_title: '\u4e3a\u4ec0\u4e48\u521b\u5efa\u6b64\u9879\u76ee',
    why_problem: '\u95ee\u9898',
    why_problem_desc: '\u5927\u591a\u6570\u9879\u76ee\u5c55\u793a\u5de5\u5177\u4f9d\u8d56\u91cd\u578b\u6846\u67b6\u3001\u7b2c\u4e09\u65b9\u540e\u7aef\u6216 SaaS \u5e73\u53f0\uff0c\u8fd9\u4e9b\u5e73\u53f0\u4f1a\u8ddf\u8e2a\u7528\u6237\u3001\u8981\u6c42\u6ce8\u518c\u5e10\u53f7\uff0c\u5e76\u5728\u7f51\u7edc\u6162\u65f6\u51fa\u73b0\u6545\u969c\u3002',
    why_solution: '\u89e3\u51b3\u65b9\u6848',
    why_solution_desc: '\u4e00\u4e2a\u5355\u4e00\u7684 HTML \u6587\u4ef6\uff0c\u53ef\u5728\u4efb\u4f55\u6d4f\u89c8\u5668\u4e0a\u5de5\u4f5c\u3002\u65e0\u9700\u6784\u5efa\u6b65\u9aa4\u3002\u65e0\u9700\u4f9d\u8d56\u3002\u65e0\u9700 JavaScript \u6846\u67b6\u3002\u65e0\u8ddf\u8e2a\u3002\u53ea\u6709 HTML\u3001CSS \u548c\u7eaf JS\uff0c\u8fd0\u884c\u5728\u4efb\u4f55\u8bbe\u5907\u4e0a\u3002',
    why_philosophy: '\u7406\u5ff5',
    why_phil_1: '\u96f6\u4f9d\u8d56 \u2014 \u6bcf\u4e00\u884c\u4ee3\u7801\u90fd\u662f\u6709\u610f\u4e49\u7684',
    why_phil_2: '\u5b89\u5168\u7b2c\u4e00 \u2014 \u4fdd\u62a4\u4e0d\u662f\u4e8b\u540e\u800c\u662f\u5185\u7f6e\u7684',
    why_phil_3: '\u53ef\u79bb\u7ebf\u5de5\u4f5c \u2014 \u52a0\u8f7d\u540e\u65e0\u9700\u4e92\u8054\u7f51',
    why_phil_4: '\u5c0a\u91cd\u9690\u79c1 \u2014 \u65e0 Cookie\u3001\u65e0\u8ddf\u8e2a\u3001\u65e0\u5206\u6790',
    why_phil_5: '\u517c\u5bb9\u65e7\u786c\u4ef6 \u2014 \u53ef\u5728 2010 \u5e74\u53ca\u4ee5\u540e\u7684\u4efb\u4f55\u8bbe\u5907\u4e0a\u8fd0\u884c',
    why_phil_6: 'GitHub \u539f\u751f \u2014 \u4ece\u60a8\u7684\u4e2a\u4eba\u8d44\u6599\u4e2d\u81ea\u52a8\u5bfc\u5165\u4ed3\u5e93',
    why_quote: '\u201c\u6700\u597d\u7684\u5de5\u5177\u662f\u90a3\u79cd\u4e0d\u4f1a\u6321\u78cc\u60a8\u7684\u5de5\u4f5c\u3001\u4e14\u5728\u7f51\u7edc\u4e2d\u65ad\u65f6\u4e0d\u4f1a\u5d29\u6e83\u7684\u5de5\u5177\u3002\u201d',
    detail_downloads: '\u4e0b\u8f7d\u6b21\u6570',
    detail_stars: '\u661f\u661f',
    detail_changelog: '\u53d8\u66f4\u65e5\u5fd7',
    detail_links: '\u94fe\u63a5',
    detail_close: '\u5173\u95ed',
    tags: '\u6807\u7b7e',
    recently_viewed: '\u6700\u8fd1\u6d4f\u89c8',
    honorable_mentions: '\u8363\u8a89\u63d0\u540d'
  },
  /* --- Українська (Ukrainian) --- */
  uk: {
    site_title: 'Демонстрація Проєктів',
    nav_home: 'Головна',
    nav_dashboard: 'Панель',
    nav_security: 'Безпека',
    nav_settings: 'Налаштування',
    nav_about: 'Про Проєкт',
    nav_features: 'Функції',
    nav_why: 'Чому',
    shield_protected: 'Захищено',
    stat_projects: 'Проєкти',
    stat_downloads: 'Завантаження',
    stat_storage: 'Пам\'ять',
    search_projects: 'Пошук проєктів',
    search_placeholder: 'Пошук проєктів...',
    filter_all: 'Усі',
    add_project: '+ Додати Проєкт',
    export_data: 'Експорт Даних',
    import_data: 'Імпорт Даних',
    hero_title: 'Проєкти з Відкритим Кодом',
    hero_desc: 'Колекція інструментів та утиліт, створених із пристрастю.',
    no_projects: 'Ще Немає Проєктів',
    no_projects_desc: 'Проєкти з\'являться тут після додавання.',
    admin_dashboard: 'Панель Адміністратора',
    admin_dashboard_desc: 'Керуйте своїми проєктами звідси.',
    security_title: 'Огляд Безпеки',
    sec_csp: 'Політика Безпеки Контенту',
    sec_csp_desc: 'Блокування ін\'єкції скриптів та витоку даних.',
    sec_xss: 'Захист від XSS',
    sec_xss_desc: 'Усі вхідні дані очищуються; innerHTML не використовується з даними користувача.',
    sec_clickjack: 'Захист від Clickjacking',
    sec_clickjack_desc: 'Frame-busting скрипт і CSP frame-ancestors none активні.',
    sec_storage: 'Цілісність Сховища',
    sec_storage_desc: 'Дані localStorage перевіряються контрольною сумою.',
    sec_devtools: 'Виявлення DevTools',
    sec_devtools_desc: 'Використання інструментів розробника виявляється та логується.',
    sec_rate: 'Обмеження Швидкості',
    sec_rate_desc: 'Надсилання форм обмежене для запобігання зловживанням.',
    sec_console: 'Захист Консолі',
    sec_console_desc: 'Спроби перезапису консолі відстежуються.',
    sec_frame: 'Frame Busting',
    sec_frame_desc: 'Сторінка не може бути завантажена в iframe.',
    sec_log: 'Журнал Безпеки',
    clear_log: 'Очистити Журнал',
    settings_title: 'Налаштування',
    settings_theme: 'Тема',
    settings_language: 'Мова',
    settings_data: 'Керування Даними',
    clear_all: 'Очистити Всі Дані',
    project_name: 'Назва Проєкту *',
    project_version: 'Версія',
    project_desc: 'Опис *',
    project_category: 'Категорія',
    project_tags: 'Теги (через кому)',
    project_download: 'URL Завантаження',
    project_source: 'URL Джерела',
    project_website: 'URL Вебсайту',
    project_screenshot: 'URL Скріншоту',
    changelog: 'Журнал Змін',
    add_entry: 'Додати Запис',
    cancel: 'Скасувати',
    save: 'Зберегти Проєкт',
    edit_project: 'Редагувати Проєкт',
    confirm_delete: 'Видалити Проєкт',
    confirm_delete_msg: 'Ви впевнені, що хочете видалити цей проєкт?',
    delete: 'Видалити',
    download: 'Завантажити',
    source_code: 'Код',
    website: 'Сайт',
    edit: 'Редагувати',
    contact_success: 'Повідомлення надіслано успішно!',
    contact_error: 'Будь ласка, заповніть усі поля.',
    no_results: 'Співпадаючих проєктів не знайдено.',
    footer_secured: 'Захищено',
    footer_antihacker: 'Анти-Хакерським Захистом',
    footer_local: 'Працює на GitHub — сервери краще.',
    category_all: 'Усі',
    settings_export: 'Експорт Даних',
    skip_nav: 'Перейти до основного вмісту',
    theme_green: 'Pickle Green',
    theme_pastel: 'Пастельний Темно-Синій',
    theme_catppuccin: 'Catppuccin',
    version: 'Версія',
    save_changes: 'Зберегти Зміни',
    project_edit: 'Редагувати Проєкт',
    clear_confirm: 'Очистити всі дані? Цю дію не можна скасувати.',
    import_success: 'Дані імпортовано успішно.',
    import_error: 'Недійсний файл даних.',
    login_title: 'Вхід Адміністратора',
    login_password: 'Мастер-Пароль',
    login_unlock: 'Розблокувати',
    login_setup_title: 'Встановити Мастер-Пароль',
    login_setup_label: 'Створити Мастер-Пароль',
    login_setup_btn: 'Встановити Пароль',
    login_hint: 'Вперше? Встановіть мастер-пароль для захисту панелі адміністратора.',
    login_error_invalid: 'Невірний пароль.',
    login_error_short: 'Пароль має містити щонайменше 4 символи.',
    login_error_generic: 'Помилка аутентифікації.',
    login_attempts_left: 'спроб залишилося',
    login_locked: 'Заблоковано на',
    login_btn: 'Увійти',
    logout_btn: 'Вийти',
    device_title: 'Який пристрій ви використовуєте?',
    device_desc: 'Виберіть пристрій для оптимального макету.',
    device_tv: 'ТВ',
    device_pc: 'ПК',
    device_phone: 'Телефон',
    device_tablet: 'Планшет',
    device_auto: 'Авто-визначення',
    pickle_denied: 'ДОСТУП ЗАБОРОНЕНО',
    pickle_sub: 'Ця зона тільки для Майстра Огірка!',
    pickle_home: 'На Головну',
    repo_refresh: 'Оновити з GitHub',
    repo_refreshing: 'Оновлення...',
    repo_refreshed: 'Репозиторії оновлено!',
    publish_token_prompt: 'Введіть ваш GitHub Personal Access Token (область repo):',
    publish_token_invalid: 'Токен не може бути порожнім.',
    publish_token_ok: 'Токен збережено.',
    sort_newest: 'Найновіші',
    sort_oldest: 'Найстаріші',
    sort_name_asc: 'Ім\'я А-Я',
    sort_name_desc: 'Ім\'я Я-А',
    sort_stars: 'Зірки',
    filter_starred: '\u2605 Обрані',
    about_title: 'Про Проєкт',
    about_what: 'Що таке Big Pickle?',
    about_what_desc: 'Big Pickle — це безпечна, незалежна від фреймворків вітрина проєктів. Вона дозволяє показувати проєкти з відкритим кодом у чистому портфоліо з інструментами адміністрування — все на стороні клієнта, на базі GitHub.',
    about_tech: 'Побудовано з',
    about_author: 'Автор',
    about_license: 'Ліцензія',
    about_license_desc: 'MIT — можна використовувати, змінювати та поширювати. Без гарантії.',
    features_title: 'Функції',
    feat_auth: 'Захист Паролем',
    feat_auth_desc: 'Панель адміністратора захищена паролем SHA-256, блокуванням після невдалих спроб та керуванням сесією.',
    feat_security: 'Пакет Безпеки',
    feat_security_desc: 'CSP, санітизація XSS, CSRF токени, контрольні суми, виявлення DevTools, моніторинг консолі, блокування клавіатури, frame busting.',
    feat_themes: '3 Теми',
    feat_themes_desc: 'Pickle Green, Pastel Dark Blue, Catppuccin — використовують CSS Custom Properties, зберігаються в localStorage.',
    feat_i18n: '7 Мов',
    feat_i18n_desc: 'English, العربية, 中文, Українська, Čeština, Slovenčina, Polski — повний переклад інтерфейсу з миттєвим перемиканням через прапорці.',
    feat_device: 'Адаптація Пристроїв',
    feat_device_desc: 'Оптимізовані макети для ТВ, ПК, Телефону та Планшета з авто-визначенням.',
    feat_crud: 'Повне CRUD',
    feat_crud_desc: 'Створюйте, редагуйте, видаляйте, експортуйте та імпортуйте проєкти з підтримкою журналу змін.',
    feat_export: 'Експорт / Імпорт',
    feat_export_desc: 'Переносимість даних у форматі JSON. Експортуйте всю колекцію та відновлюйте з резервної копії.',
    feat_star: 'Обрані Проєкти',
    feat_star_desc: 'Позначайте обрані, фільтруйте за обраними, сортуйте за назвою або датою.',
    feat_detail: 'Детальний Перегляд',
    feat_detail_desc: 'Натисніть на картку проєкту, щоб побачити повні деталі, журнал змін і всі посилання.',
    feat_shortcuts: 'Гарячі Клавіші',
    feat_shortcuts_desc: 'N новий проєкт, / пошук, H головна, ? допомога.',
    why_title: 'Чому це існує',
    why_problem: 'Проблема',
    why_problem_desc: 'Більшість вітрин проєктів використовують важкі фреймворки, сторонні бекенди або SaaS платформи, які відстежують користувачів, вимагають облікові записи та ламаються на повільних з\'єднаннях.',
    why_solution: 'Рішення',
    why_solution_desc: 'Один HTML-файл, який працює на всьому, що має браузер. No build step. Жодних залежностей. Жодних JS фреймворків. Жодного стеження. Просто HTML, CSS та ванільний JS, що працює на будь-чому.',
    why_philosophy: 'Філософія',
    why_phil_1: 'Нуль залежностей — кожен рядок має значення',
    why_phil_2: 'Безпека на першому місці — захист не після думки',
    why_phil_3: 'Працює офлайн — після завантаження працює без інтернету',
    why_phil_4: 'Поважає приватність — без куків, трекерів та аналітики',
    why_phil_5: 'Дружній до старого заліза — працює на всьому з 2010 року',
    why_phil_6: 'GitHub-рідний — автоматичний імпорт репозиторіїв з вашого профілю',
    why_quote: '"Найкращий інструмент — це той, який не заважає і не ламається, коли інтернет падає."',
    detail_downloads: 'Завантаження',
    detail_stars: 'Зірки',
    detail_changelog: 'Зміни',
    detail_links: 'Посилання',
    detail_close: 'Закрити',
    tags: 'Теги',
    recently_viewed: 'Нещодавно Переглянуті',
    honorable_mentions: 'Почесні Згадки'
  },
  /* --- Čeština (Czech) --- */
  cs: {
    site_title: 'Prezentace Projektů',
    nav_home: 'Domů',
    nav_dashboard: 'Panel',
    nav_security: 'Zabezpečení',
    nav_settings: 'Nastavení',
    nav_about: 'O Projektu',
    nav_features: 'Funkce',
    nav_why: 'Proč',
    shield_protected: 'Chráněno',
    stat_projects: 'Projekty',
    stat_downloads: 'Stahování',
    stat_storage: 'Úložiště',
    search_projects: 'Hledat projekty',
    search_placeholder: 'Hledat projekty...',
    filter_all: 'Vše',
    add_project: '+ Přidat Projekt',
    export_data: 'Exportovat Data',
    import_data: 'Importovat Data',
    hero_title: 'Open Source Projekty',
    hero_desc: 'Sbírka nástrojů a utilit vytvořených s vášní.',
    no_projects: 'Zatím Žádné Projekty',
    no_projects_desc: 'Projekty se zde objeví po přidání.',
    admin_dashboard: 'Admin Panel',
    admin_dashboard_desc: 'Spravujte své projekty odtud.',
    security_title: 'Přehled Zabezpečení',
    sec_csp: 'Zásady Zabezpečení Obsahu',
    sec_csp_desc: 'Blokování injekcí skriptů a úniku dat.',
    sec_xss: 'Ochrana proti XSS',
    sec_xss_desc: 'Veškerý vstup uživatele je čištěn; bez innerHTML s uživatelskými daty.',
    sec_clickjack: 'Ochrana proti Clickjackingu',
    sec_clickjack_desc: 'Frame-busting skript a CSP frame-ancestors none aktivní.',
    sec_storage: 'Integrita Úložiště',
    sec_storage_desc: 'Data v localStorage jsou ověřována kontrolním součtem proti manipulaci.',
    sec_devtools: 'Detekce DevTools',
    sec_devtools_desc: 'Použití vývojářských nástrojů je detekováno a logováno.',
    sec_rate: 'Omezení Rychlosti',
    sec_rate_desc: 'Odesílání formulářů je omezeno, aby se zabránilo zneužití.',
    sec_console: 'Ochrana Konzole',
    sec_console_desc: 'Pokusy o přepsání konzole jsou monitorovány.',
    sec_frame: 'Frame Busting',
    sec_frame_desc: 'Stránku nelze načíst v iframe.',
    sec_log: 'Bezpečnostní Log',
    clear_log: 'Vymazat Log',
    settings_title: 'Nastavení',
    settings_theme: 'Motiv',
    settings_language: 'Jazyk',
    settings_data: 'Správa Dat',
    clear_all: 'Vymazat Všechna Data',
    project_name: 'Název Projektu *',
    project_version: 'Verze',
    project_desc: 'Popis *',
    project_category: 'Kategorie',
    project_tags: 'Štítky (čárkou oddělené)',
    project_download: 'URL Stažení',
    project_source: 'URL Zdrojového Kódu',
    project_website: 'URL Webu',
    project_screenshot: 'URL Snímku Obrazovky',
    changelog: 'Seznam Změn',
    add_entry: 'Přidat Záznam',
    cancel: 'Zrušit',
    save: 'Uložit Projekt',
    edit_project: 'Upravit Projekt',
    confirm_delete: 'Smazat Projekt',
    confirm_delete_msg: 'Opravdu chcete smazat tento projekt?',
    delete: 'Smazat',
    download: 'Stáhnout',
    source_code: 'Zdroj',
    website: 'Web',
    edit: 'Upravit',
    contact_success: 'Zpráva odeslána úspěšně!',
    contact_error: 'Prosím vyplňte všechna pole.',
    no_results: 'Nebyly nalezeny žádné odpovídající projekty.',
    footer_secured: 'Zabezpečeno',
    footer_antihacker: 'Proti-Hackerskou Ochranou',
    footer_local: 'Poháněno GitHub — servery jsou lepší.',
    category_all: 'Vše',
    settings_export: 'Exportovat Data',
    skip_nav: 'Přeskočit na hlavní obsah',
    theme_green: 'Pickle Green',
    theme_pastel: 'Pastelová Tmavě Modrá',
    theme_catppuccin: 'Catppuccin',
    version: 'Verze',
    save_changes: 'Uložit Změny',
    project_edit: 'Upravit Projekt',
    clear_confirm: 'Vymazat všechna data? Tuto operaci nelze vrátit.',
    import_success: 'Data importována úspěšně.',
    import_error: 'Neplatný datový soubor.',
    login_title: 'Přihlášení Admina',
    login_password: 'Hlavní Heslo',
    login_unlock: 'Odemknout',
    login_setup_title: 'Nastavit Hlavní Heslo',
    login_setup_label: 'Vytvořit Hlavní Heslo',
    login_setup_btn: 'Nastavit Heslo',
    login_hint: 'Poprvé? Nastavte si hlavní heslo pro ochranu admin panelu.',
    login_error_invalid: 'Nesprávné heslo.',
    login_error_short: 'Heslo musí mít alespoň 4 znaky.',
    login_error_generic: 'Chyba autentizace.',
    login_attempts_left: 'zbývajících pokusů',
    login_locked: 'Zamčeno na',
    login_btn: 'Přihlásit',
    logout_btn: 'Odhlásit',
    device_title: 'Jaké zařízení používáte?',
    device_desc: 'Vyberte zařízení pro optimální rozvržení.',
    device_tv: 'TV',
    device_pc: 'PC',
    device_phone: 'Telefon',
    device_tablet: 'Tablet',
    device_auto: 'Auto-detekce',
    pickle_denied: 'PŘÍSTUP ZAMÍTNUT',
    pickle_sub: 'Tato oblast je pouze pro Pickle Mistra!',
    pickle_home: 'Jít Domů',
    repo_refresh: 'Obnovit z GitHub',
    repo_refreshing: 'Obnovování...',
    repo_refreshed: 'Repozitáře obnoveny!',
    publish_token_prompt: 'Zadejte váš GitHub Personal Access Token (repo scope):',
    publish_token_invalid: 'Token nemůže být prázdný.',
    publish_token_ok: 'Token uložen.',
    sort_newest: 'Nejnovější',
    sort_oldest: 'Nejstarší',
    sort_name_asc: 'Název A-Z',
    sort_name_desc: 'Název Z-A',
    sort_stars: 'Hvězdy',
    filter_starred: '\u2605 Označené',
    about_title: 'O Tomto Projektu',
    about_what: 'Co je Big Pickle?',
    about_what_desc: 'Big Pickle je bezpečná, na frameworku nezávislá prezentace projektů. Umožňuje zobrazovat open-source projekty v čistém portfoliu s admin nástroji pro správu — vše na straně klienta, poháněno GitHubem.',
    about_tech: 'Postaveno na',
    about_author: 'Autor',
    about_license: 'Licence',
    about_license_desc: 'MIT — lze volně používat, upravovat a distribuovat. Bez záruky.',
    features_title: 'Funkce',
    feat_auth: 'Ochrana Heslem',
    feat_auth_desc: 'Admin panel chráněn SHA-256 heslem, uzamčením po neúspěšných pokusech a správou relací.',
    feat_security: 'Balíček Zabezpečení',
    feat_security_desc: 'CSP, sanitace XSS, CSRF tokeny, kontrolní součty, detekce DevTools, monitorování konzole, blokování klávesnice, frame busting.',
    feat_themes: '3 Motivy',
    feat_themes_desc: 'Pickle Green, Pastel Dark Blue, Catppuccin — všechny používají CSS Custom Properties, uloženy v localStorage.',
    feat_i18n: '7 Jazyků',
    feat_i18n_desc: 'English, العربية, 中文, Українська, Čeština, Slovenčina, Polski — plný překlad UI s okamžitým přepínáním přes vlajky.',
    feat_device: 'Adaptace Zařízení',
    feat_device_desc: 'Optimalizovaná rozvržení pro TV, PC, Telefon a Tablet s auto-detekcí při první návštěvě.',
    feat_crud: 'Plné CRUD',
    feat_crud_desc: 'Vytvářejte, upravujte, mažte, exportujte a importujte projekty s podporou changelogu.',
    feat_export: 'Export / Import',
    feat_export_desc: 'Přenositelnost dat ve formátu JSON. Exportujte celou sbírku a obnovte ze zálohy.',
    feat_star: 'Označit Projekty',
    feat_star_desc: 'Označte oblíbené, filtrujte podle označených, řaďte podle názvu nebo data.',
    feat_detail: 'Detail Projektu',
    feat_detail_desc: 'Klikněte na kartu projektu pro zobrazení úplných detailů, changelogu a všech odkazů.',
    feat_shortcuts: 'Klávesové Zkratky',
    feat_shortcuts_desc: 'N nový projekt, / hledání, H domů, ? nápověda.',
    why_title: 'Proč Toto Existuje',
    why_problem: 'Problém',
    why_problem_desc: 'Většina prezentací projektů spoléhá na těžké frameworky, externí backendy nebo SaaS platformy, které sledují uživatele, vyžadují účty a padají na pomalých připojeních.',
    why_solution: 'Řešení',
    why_solution_desc: 'Jeden HTML soubor, který funguje na čemkoli s prohlížečem. Žádný build step. Žádné závislosti. Žádný JS framework. Žádné sledování. Pouze HTML, CSS a vanilla JS běžící na čemkoli.',
    why_philosophy: 'Filozofie',
    why_phil_1: 'Nulové závislosti — každý řádek má význam',
    why_phil_2: 'Bezpečnost na prvním místě — ochrana není dodatečný nápad',
    why_phil_3: 'Funguje offline — po načtení funguje bez internetu',
    why_phil_4: 'Respektuje soukromí — bez cookies, trackerů a analytiky',
    why_phil_5: 'Přátelský ke starému hardwaru — běží na čemkoli z roku 2010',
    why_phil_6: 'GitHub-nativní — automatický import repozitářů z vašeho profilu',
    why_quote: '"Nejlepší nástroj je ten, který vám nepřekáží a nerozbije se, když spadne internet."',
    detail_downloads: 'Stahování',
    detail_stars: 'Hvězdy',
    detail_changelog: 'Změny',
    detail_links: 'Odkazy',
    detail_close: 'Zavřít',
    tags: 'Štítky',
    recently_viewed: 'Nedávno Zobrazené',
    honorable_mentions: 'Čestná uznání'
  },
  /* --- Slovenčina (Slovak) --- */
  sk: {
    site_title: 'Prezentácia Projektov',
    nav_home: 'Domov',
    nav_dashboard: 'Panel',
    nav_security: 'Bezpečnosť',
    nav_settings: 'Nastavenia',
    nav_about: 'O Projekte',
    nav_features: 'Funkcie',
    nav_why: 'Prečo',
    shield_protected: 'Chránené',
    stat_projects: 'Projekty',
    stat_downloads: 'Stiahnutia',
    stat_storage: 'Úložisko',
    search_projects: 'Hľadať projekty',
    search_placeholder: 'Hľadať projekty...',
    filter_all: 'Všetky',
    add_project: '+ Pridať Projekt',
    export_data: 'Exportovať Dáta',
    import_data: 'Importovať Dáta',
    hero_title: 'Open Source Projekty',
    hero_desc: 'Zbierka nástrojov a utilit vytvorených s vášňou.',
    no_projects: 'Zatiaľ Žiadne Projekty',
    no_projects_desc: 'Projekty sa tu zobrazia po pridaní.',
    admin_dashboard: 'Admin Panel',
    admin_dashboard_desc: 'Spravujte svoje projekty odtiaľto.',
    security_title: 'Prehľad Bezpečnosti',
    sec_csp: 'Politika Bezpečnosti Obsahu',
    sec_csp_desc: 'Blokovanie injekcií skriptov a úniku údajov.',
    sec_xss: 'Ochrana proti XSS',
    sec_xss_desc: 'Všetky vstupy používateľa sú čistené; bez innerHTML s údajmi používateľa.',
    sec_clickjack: 'Ochrana proti Clickjackingu',
    sec_clickjack_desc: 'Frame-busting skript a CSP frame-ancestors none aktívne.',
    sec_storage: 'Integrita Úložiska',
    sec_storage_desc: 'Dáta v localStorage sú overované kontrolným súčtom proti manipulácii.',
    sec_devtools: 'Detekcia DevTools',
    sec_devtools_desc: 'Použitie vývojárskych nástrojov je detekované a logované.',
    sec_rate: 'Obmedzenie Rýchlosti',
    sec_rate_desc: 'Odosielanie formulárov je obmedzené na zabránenie zneužitia.',
    sec_console: 'Ochrana Konzoly',
    sec_console_desc: 'Pokusy o prepísanie konzoly sú monitorované.',
    sec_frame: 'Frame Busting',
    sec_frame_desc: 'Stránku nemožno načítať v iframe.',
    sec_log: 'Bezpečnostný Denník',
    clear_log: 'Vymazať Denník',
    settings_title: 'Nastavenia',
    settings_theme: 'Motív',
    settings_language: 'Jazyk',
    settings_data: 'Správa Dát',
    clear_all: 'Vymazať Všetky Dáta',
    project_name: 'Názov Projektu *',
    project_version: 'Verzia',
    project_desc: 'Popis *',
    project_category: 'Kategória',
    project_tags: 'Štítky (oddelené čiarkou)',
    project_download: 'URL Stiahnutia',
    project_source: 'URL Zdrojového Kódu',
    project_website: 'URL Webu',
    project_screenshot: 'URL Snímky Obrazovky',
    changelog: 'Zoznam Zmien',
    add_entry: 'Pridať Záznam',
    cancel: 'Zrušiť',
    save: 'Uložiť Projekt',
    edit_project: 'Upraviť Projekt',
    confirm_delete: 'Zmazať Projekt',
    confirm_delete_msg: 'Ste si istí, že chcete zmazať tento projekt?',
    delete: 'Zmazať',
    download: 'Stiahnuť',
    source_code: 'Zdroj',
    website: 'Web',
    edit: 'Upraviť',
    contact_success: 'Správa odoslaná úspešne!',
    contact_error: 'Prosím vyplňte všetky polia.',
    no_results: 'Nenašli sa žiadne zodpovedajúce projekty.',
    footer_secured: 'Zabezpečené',
    footer_antihacker: 'Proti-Hackerskou Ochranou',
    footer_local: 'Poháňané GitHub — servery sú lepšie.',
    category_all: 'Všetky',
    settings_export: 'Exportovať Dáta',
    skip_nav: 'Preskočiť na hlavný obsah',
    theme_green: 'Pickle Green',
    theme_pastel: 'Pastelová Tmavomodrá',
    theme_catppuccin: 'Catppuccin',
    version: 'Verzia',
    save_changes: 'Uložiť Zmeny',
    project_edit: 'Upraviť Projekt',
    clear_confirm: 'Vymazať všetky dáta? Túto operáciu nemožno vrátiť.',
    import_success: 'Dáta importované úspešne.',
    import_error: 'Neplatný dátový súbor.',
    login_title: 'Prihlásenie Admina',
    login_password: 'Hlavné Heslo',
    login_unlock: 'Odomknúť',
    login_setup_title: 'Nastaviť Hlavné Heslo',
    login_setup_label: 'Vytvoriť Hlavné Heslo',
    login_setup_btn: 'Nastaviť Heslo',
    login_hint: 'Prvýkrát? Nastavte si hlavné heslo na ochranu admin panela.',
    login_error_invalid: 'Nesprávne heslo.',
    login_error_short: 'Heslo musí mať aspoň 4 znaky.',
    login_error_generic: 'Chyba autentifikácie.',
    login_attempts_left: 'zostávajúcich pokusov',
    login_locked: 'Zamknuté na',
    login_btn: 'Prihlásiť',
    logout_btn: 'Odhlásiť',
    device_title: 'Aké zariadenie používate?',
    device_desc: 'Vyberte zariadenie pre optimálne rozloženie.',
    device_tv: 'TV',
    device_pc: 'PC',
    device_phone: 'Telefón',
    device_tablet: 'Tablet',
    device_auto: 'Auto-detekcia',
    pickle_denied: 'PRÍSTUP ZAMietnutý',
    pickle_sub: 'Táto oblasť je len pre Pickle Majstra!',
    pickle_home: 'Ísť Domov',
    repo_refresh: 'Obnoviť z GitHub',
    repo_refreshing: 'Obnovovanie...',
    repo_refreshed: 'Repozitáre obnovené!',
    publish_token_prompt: 'Zadajte váš GitHub Personal Access Token (repo scope):',
    publish_token_invalid: 'Token nemôže byť prázdny.',
    publish_token_ok: 'Token uložený.',
    sort_newest: 'Najnovšie',
    sort_oldest: 'Najstaršie',
    sort_name_asc: 'Názov A-Z',
    sort_name_desc: 'Názov Z-A',
    sort_stars: 'Hviezdy',
    filter_starred: '\u2605 Označené',
    about_title: 'O TOMTO Projekte',
    about_what: 'Čo je Big Pickle?',
    about_what_desc: 'Big Pickle je bezpečná, na frameworku nezávislá prezentácia projektov. Umožňuje zobrazovať open-source projekty v čistom portfóliu s admin nástrojmi na správu — všetko na strane klienta, poháňané GitHubom.',
    about_tech: 'Postavené na',
    about_author: 'Autor',
    about_license: 'Licencia',
    about_license_desc: 'MIT — možno voľne používať, upravovať a distribuovať. Bez záruky.',
    features_title: 'Funkcie',
    feat_auth: 'Ochrana Heslom',
    feat_auth_desc: 'Admin panel chránený SHA-256 heslom, uzamknutím po neúspešných pokusoch a správou relácií.',
    feat_security: 'Balík Zabezpečenia',
    feat_security_desc: 'CSP, sanitácia XSS, CSRF tokeny, kontrolné súčty, detekcia DevTools, monitorovanie konzoly, blokovanie klávesnice, frame busting.',
    feat_themes: '3 Motívy',
    feat_themes_desc: 'Pickle Green, Pastel Dark Blue, Catppuccin — všetky používajú CSS Custom Properties, uložené v localStorage.',
    feat_i18n: '7 Jazykov',
    feat_i18n_desc: 'English, العربية, 中文, Українська, Čeština, Slovenčina, Polski — plný preklad UI s okamžitým prepínaním cez vlajky.',
    feat_device: 'Adaptácia Zariadení',
    feat_device_desc: 'Optimalizované rozloženia pre TV, PC, Telefón a Tablet s auto-detekciou pri prvej návšteve.',
    feat_crud: 'Plné CRUD',
    feat_crud_desc: 'Vytvárajte, upravujte, mažte, exportujte a importujte projekty s podporou changelogu.',
    feat_export: 'Export / Import',
    feat_export_desc: 'Prenosnosť dát vo formáte JSON. Exportujte celú zbierku a obnovte zo zálohy.',
    feat_star: 'Označiť Projekty',
    feat_star_desc: 'Označte obľúbené, filtrujte podľa označených, zoraďte podľa názvu alebo dátumu.',
    feat_detail: 'Detail Projektu',
    feat_detail_desc: 'Kliknite na kartu projektu pre zobrazenie úplných detailov, changelogu a všetkých odkazov.',
    feat_shortcuts: 'Klávesové Skratky',
    feat_shortcuts_desc: 'N nový projekt, / hľadanie, H domov, ? pomoc.',
    why_title: 'Prečo Toto Existuje',
    why_problem: 'Problém',
    why_problem_desc: 'Väčšina prezentácií projektov spolieha na ťažké frameworky, externé backandy alebo SaaS platformy, ktoré sledujú používateľov, vyžadujú účty a padajú na pomalých pripojeniach.',
    why_solution: 'Riešenie',
    why_solution_desc: 'Jeden HTML súbor, ktorý funguje na čomkoľvek s prehliadačom. Žiadny build step. Žiadne závislosti. Žiadny JS framework. Žiadne sledovanie. Len HTML, CSS a vanilla JS bežiaci na čomkoľvek.',
    why_philosophy: 'Filozofia',
    why_phil_1: 'Nulové závislosti — každý riadok má význam',
    why_phil_2: 'Bezpečnosť na prvom mieste — ochrana nie je dodatočný nápad',
    why_phil_3: 'Funguje offline — po načítaní funguje bez internetu',
    why_phil_4: 'Rešpektuje súkromie — bez cookies, trackerov a analytiky',
    why_phil_5: 'Priateľský k starému hardvéru — beží na čomkoľvek z roku 2010',
    why_phil_6: 'GitHub-natívny — automatický import repozitárov z vášho profilu',
    why_quote: '"Najlepší nástroj je ten, ktorý vám neprekáža a nerozbije sa, keď spadne internet."',
    detail_downloads: 'Stiahnutia',
    detail_stars: 'Hviezdy',
    detail_changelog: 'Zmeny',
    detail_links: 'Odkazy',
    detail_close: 'Zavrieť',
    tags: 'Štítky',
    recently_viewed: 'Nedávno Zobrazené',
    honorable_mentions: 'Čestné Uznanie'
  },
  pl: {
    site_title: 'Prezentacja Projektów',
    nav_home: 'Strona Główna',
    nav_dashboard: 'Panel',
    nav_security: 'Bezpieczeństwo',
    nav_settings: 'Ustawienia',
    nav_about: 'O Projekcie',
    nav_features: 'Funkcje',
    nav_why: 'Dlaczego',
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
    hero_title: 'Projekty Open Source',
    hero_desc: 'Kolekcja narzędzi i aplikacji stworzonych z pasją.',
    no_projects: 'Brak Projektów',
    no_projects_desc: 'Projekty pojawią się tutaj po dodaniu.',
    admin_dashboard: 'Panel Administratora',
    admin_dashboard_desc: 'Zarządzaj swoimi projektami stąd.',
    security_title: 'Przegląd Bezpieczeństwa',
    sec_csp: 'Polityka Bezpieczeństwa Treści',
    sec_csp_desc: 'Blokowanie wstrzykiwania skryptów i wycieku danych.',
    sec_xss: 'Ochrona przed XSS',
    sec_xss_desc: 'Wszystkie dane wejściowe są czyszczone; brak innerHTML z danymi użytkownika.',
    sec_clickjack: 'Ochrona przed Clickjacking',
    sec_clickjack_desc: 'Skrypt frame-busting i CSP frame-ancestors none aktywne.',
    sec_storage: 'Integralność Pamięci',
    sec_storage_desc: 'Dane localStorage są weryfikowane sumą kontrolną przed manipulacją.',
    sec_devtools: 'Wykrywanie DevTools',
    sec_devtools_desc: 'Użycie narzędzi deweloperskich jest wykrywane i logowane.',
    sec_rate: 'Ograniczenie Szybkości',
    sec_rate_desc: 'Wysyłanie formularzy jest ograniczone, aby zapobiec nadużyciom.',
    sec_console: 'Ochrona Konsoli',
    sec_console_desc: 'Próby nadpisania konsoli są monitorowane.',
    sec_frame: 'Frame Busting',
    sec_frame_desc: 'Strona nie może zostać załadowana w iframe.',
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
    changelog: 'Dziennik Zmian',
    add_entry: 'Dodaj Wpis',
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
    footer_antihacker: 'Ochroną Anty-Hakerską',
    footer_local: 'Napędzane przez GitHub — serwery są lepsze.',
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
    import_error: 'Nieprawidłowy plik danych.',
    login_title: 'Logowanie Admina',
    login_password: 'Główne Hasło',
    login_unlock: 'Odblokuj',
    login_setup_title: 'Ustaw Główne Hasło',
    login_setup_label: 'Utwórz Główne Hasło',
    login_setup_btn: 'Ustaw Hasło',
    login_hint: 'Pierwszy raz? Ustaw główne hasło, aby chronić panel administratora.',
    login_error_invalid: 'Nieprawidłowe hasło.',
    login_error_short: 'Hasło musi mieć co najmniej 4 znaki.',
    login_error_generic: 'Błąd uwierzytelniania.',
    login_attempts_left: 'pozostało prób',
    login_locked: 'Zablokowano na',
    login_btn: 'Zaloguj',
    logout_btn: 'Wyloguj',
    device_title: 'Jakiego urządzenia używasz?',
    device_desc: 'Wybierz urządzenie dla optymalnego układu.',
    device_tv: 'TV',
    device_pc: 'PC',
    device_phone: 'Telefon',
    device_tablet: 'Tablet',
    device_auto: 'Auto-wykrywanie',
    pickle_denied: 'ODMOWA DOSTĘPU',
    pickle_sub: 'Ten obszar jest tylko dla Mistrza Ogórka!',
    pickle_home: 'Idź do Strony Głównej',
    repo_refresh: 'Odśwież z GitHub',
    repo_refreshing: 'Odświeżanie...',
    repo_refreshed: 'Repozytoria odświeżone!',
    publish_token_prompt: 'Wprowadź swój GitHub Personal Access Token (zakres repo):',
    publish_token_invalid: 'Token nie może być pusty.',
    publish_token_ok: 'Token zapisany.',
    sort_newest: 'Najnowsze',
    sort_oldest: 'Najstarsze',
    sort_name_asc: 'Nazwa A-Z',
    sort_name_desc: 'Nazwa Z-A',
    sort_stars: 'Gwiazdy',
    filter_starred: '\u2605 Wyróżnione',
    about_title: 'O Tym Projekcie',
    about_what: 'Czym jest Big Pickle?',
    about_what_desc: 'Big Pickle to bezpieczna, niezależna od frameworków prezentacja projektów. Pozwala wyświetlać projekty open source w czystym portfolio, z narzędziami administracyjnymi do zarządzania — wszystko po stronie klienta, napędzane przez GitHub.',
    about_tech: 'Zbudowano z',
    about_author: 'Autor',
    about_license: 'Licencja',
    about_license_desc: 'MIT — można swobodnie używać, modyfikować i rozpowszechniać. Bez gwarancji.',
    features_title: 'Funkcje',
    feat_auth: 'Ochrona Hasłem',
    feat_auth_desc: 'Panel administratora chroniony hasłem SHA-256, blokadą po nieudanych próbach i zarządzaniem sesjami.',
    feat_security: 'Pakiet Bezpieczeństwa',
    feat_security_desc: 'CSP, sanityzacja XSS, tokeny CSRF, sumy kontrolne, wykrywanie DevTools, monitorowanie konsoli, blokada klawiatury, frame busting.',
    feat_themes: '3 Motywy',
    feat_themes_desc: 'Pickle Green, Pastel Dark Blue, Catppuccin — wszystkie używają CSS Custom Properties, przechowywane w localStorage.',
    feat_i18n: '7 Języków',
    feat_i18n_desc: 'English, العربية, 中文, Українська, Čeština, Slovenčina, Polski — pełne tłumaczenie UI z natychmiastowym przełączaniem przez flagi.',
    feat_device: 'Adaptacja Urządzeń',
    feat_device_desc: 'Zoptymalizowane układy dla TV, PC, Telefonu i Tabletu z auto-wykrywaniem przy pierwszej wizycie.',
    feat_crud: 'Pełne CRUD',
    feat_crud_desc: 'Twórz, edytuj, usuwaj, eksportuj i importuj projekty z obsługą dziennika zmian.',
    feat_export: 'Eksport / Import',
    feat_export_desc: 'Przenośność danych w formacie JSON. Eksportuj całą kolekcję i przywracaj z kopii zapasowej.',
    feat_star: 'Wyróżnianie Projektów',
    feat_star_desc: 'Oznaczaj ulubione, filtruj po wyróżnionych, sortuj według nazwy lub daty.',
    feat_detail: 'Szczegóły Projektu',
    feat_detail_desc: 'Kliknij kartę projektu, aby zobaczyć pełne szczegóły, dziennik zmian i wszystkie linki.',
    feat_shortcuts: 'Skróty Klawiszowe',
    feat_shortcuts_desc: 'N nowy projekt, / szukaj, H strona główna, ? pomoc.',
    why_title: 'Dlaczego to istnieje',
    why_problem: 'Problem',
    why_problem_desc: 'Większość prezentacji projektów opiera się na ciężkich frameworkach, zewnętrznych backendach lub platformach SaaS, które śledzą użytkowników, wymagają kont i psują się przy wolnych połączeniach.',
    why_solution: 'Rozwiązanie',
    why_solution_desc: 'Jeden plik HTML, który działa na wszystkim z przeglądarką. Żaden build step. Żadnych zależności. Żadnego frameworka JS. Żadnego śledzenia. Tylko HTML, CSS i czysty JS działający na czymkolwiek.',
    why_philosophy: 'Filozofia',
    why_phil_1: 'Zero zależności — każda linia ma znaczenie',
    why_phil_2: 'Bezpieczeństwo przede wszystkim — ochrona nie jest dodatkiem',
    why_phil_3: 'Działa offline — po załadowaniu działa bez internetu',
    why_phil_4: 'Szanuje prywatność — bez ciasteczek, trackerów i analityki',
    why_phil_5: 'Przyjazny starym urządzeniom — działa na wszystkim z 2010 roku',
    why_phil_6: 'GitHub-natywny — automatyczny import repozytoriów z Twojego profilu',
    why_quote: '"Najlepsze narzędzie to takie, które nie przeszkadza i nie psuje się, gdy internet pada."',
    detail_downloads: 'Pobrania',
    detail_stars: 'Gwiazdki',
    detail_changelog: 'Zmiany',
    detail_links: 'Linki',
    detail_close: 'Zamknij',
    tags: 'Tagi',
    recently_viewed: 'Ostatnio Przeglądane',
    honorable_mentions: 'Wyróżnienia'
  }
};

/* ==================================================================
   LANGUAGE FLAGS & NAMES
   ================================================================== */
var langFlags = {
  en: '\ud83c\uddec\ud83c\udde7',
  ar: '\ud83c\uddf8\ud83c\udde6',
  zh: '\ud83c\udde8\ud83c\uddf3',
  uk: '\ud83c\uddfa\ud83c\udde6',
  cs: '\ud83c\udde8\ud83c\uddff',
  sk: '\ud83c\uddf8\ud83c\uddf0',
  pl: '\ud83c\uddf5\ud83c\uddf1'
};

var langNames = {
  en: 'English',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  zh: '\u4e2d\u6587',
  uk: '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430',
  cs: '\u010ce\u0161tina',
  sk: 'Sloven\u010dina',
  pl: 'Polski'
};

/* RTL direction map — Arabic is RTL, rest are LTR */
var langDir = {
  ar: 'rtl'
};

/* ==================================================================
   I18N FUNCTIONS
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

  /* Set RTL direction — Arabic only */
  var dir = langDir[code] || 'ltr';
  html.setAttribute('dir', dir);
  html.setAttribute('lang', code);

  updateActiveLang(code);
  translatePage();
  renderAll();
  refreshModalTitle();
}

function updateActiveLang(code) {
  /* Update header button with flag */
  if (langBtn) {
    langBtn.textContent = langFlags[code] || code.toUpperCase();
    langBtn.title = langNames[code] || code;
  }
  /* Update lang menu items */
  var opts = document.querySelectorAll('.lang-opt');
  for (var i = 0; i < opts.length; i++) {
    var opt = opts[i];
    var lang = opt.getAttribute('data-lang');
    if (lang === code) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
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
};

/* ==================================================================
   SECURITY SUITE
   ================================================================== */
var loginModal = $('login-modal');
var loginForm = $('login-form');
var loginPwd = $('login-password');
var loginSubmit = $('login-submit');
var loginError = $('login-error');
var loginLockout = $('login-lockout');
var loginLabel = $('login-label');
var loginHint = $('login-hint');
var loginTitle = $('login-title');
var loginClose = $('login-close-btn');
var loginBtn = $('login-btn');
var logoutBtn = $('logout-btn');
var pickleModal = $('pickle-modal');
var pickleGoHome = $('pickle-go-home');
var deviceModal = $('device-modal');
var deviceAutoBtn = $('device-auto-btn');

/* ---------- SHA-256 hashing via SubtleCrypto ---------- */
function sha256(str) {
  var encoder = new TextEncoder();
  var data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(function(hash) {
    return Array.from(new Uint8Array(hash)).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  });
}

function getFailCount() {
  return parseInt(localStorage.getItem(FAIL_KEY) || '0', 10);
}

function getLockoutUntil() {
  return parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
}

function isLockedOut() {
  var until = getLockoutUntil();
  if (!until) return false;
  if (Date.now() < until) return true;
  localStorage.removeItem(FAIL_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
  return false;
}

function recordFailedAttempt() {
  var count = getFailCount() + 1;
  localStorage.setItem(FAIL_KEY, String(count));
  if (count >= MAX_FAILS) {
    var until = Date.now() + (LOCKOUT_SECS * 1000);
    localStorage.setItem(LOCKOUT_KEY, String(until));
    secLog('Brute-force lockout activated (' + LOCKOUT_SECS + 's)', 'warn');
  }
}

/* ---------- Show login modal ---------- */
function openLoginModal() {
  if (loginTitle) loginTitle.textContent = t('login_title');
  if (loginLabel) loginLabel.textContent = t('login_password');
  if (loginSubmit) loginSubmit.textContent = t('login_unlock');
  if (loginHint) loginHint.setAttribute('hidden', '');
  if (loginError) loginError.setAttribute('hidden', '');
  if (loginLockout) loginLockout.setAttribute('hidden', '');
  if (loginPwd) { loginPwd.value = ''; loginPwd.disabled = false; }
  if (loginSubmit) loginSubmit.disabled = false;
  updateLockoutDisplay();
  loginModal.removeAttribute('hidden');
  if (loginPwd) setTimeout(function() { loginPwd.focus(); }, 100);
}

function closeLoginModal() {
  loginModal.setAttribute('hidden', '');
  if (loginPwd) loginPwd.value = '';
}

function updateLockoutDisplay() {
  if (!isLockedOut()) {
    if (loginLockout) loginLockout.setAttribute('hidden', '');
    if (loginPwd) loginPwd.disabled = false;
    if (loginSubmit) loginSubmit.disabled = false;
    return;
  }
  var until = getLockoutUntil();
  var remain = Math.ceil((until - Date.now()) / 1000);
  if (loginLockout) {
    loginLockout.removeAttribute('hidden');
    loginLockout.textContent = t('login_locked') + ' ' + remain + 's';
  }
  if (loginPwd) loginPwd.disabled = true;
  if (loginSubmit) loginSubmit.disabled = true;
  if (remain > 0) {
    setTimeout(updateLockoutDisplay, 1000);
  }
}

function getFixedPassword() {
  var k = [0x5A,0x23,0x7E,0x1B,0xCD,0x44,0x38,0x91,0x62,0x4F,0x1C,0x8A,0x75,0x32];
  var x = [0x13,0x41,0x4C,0x77,0xAE,0x22,0x4C,0xE2,0x0B,0x7D,0x2C,0xB8,0x47,0x13];
  var pwd = '';
  for (var i = 0; i < k.length; i++) pwd += String.fromCharCode(k[i] ^ x[i]);
  return pwd;
}

/* ---------- Verify fixed password ---------- */
function verifyPassword(password) {
  if (!FIXED_HASH) {
    showLoginError(t('login_error_generic'));
    return;
  }
  sha256(password + ':' + FIXED_SALT).then(function(hash) {
    if (hash === FIXED_HASH) {
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      setSession();
      secLog('Login successful', 'ok');
      setAuthenticated(true);
      closeLoginModal();
    } else {
      recordFailedAttempt();
      if (isLockedOut()) {
        updateLockoutDisplay();
        secLog('Login failed \u2014 locked out', 'warn');
      } else {
        var remaining = MAX_FAILS - getFailCount();
        showLoginError(t('login_error_invalid') + ' ' + remaining + ' ' + t('login_attempts_left'));
        secLog('Login failed (' + getFailCount() + '/' + MAX_FAILS + ')', 'warn');
      }
      if (loginPwd) { loginPwd.value = ''; loginPwd.focus(); }
    }
  }).catch(function() {
    showLoginError(t('login_error_generic'));
  });
}

function showLoginError(msg) {
  if (loginError) {
    loginError.textContent = msg;
    loginError.removeAttribute('hidden');
  }
}

/* ---------- Session helpers ---------- */
function setSession() {
  var token = 'bp_' + FIXED_HASH.substring(0, 8) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  try { sessionStorage.setItem(SESSION_KEY, token); } catch(e) {}
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
}

function getSessionToken() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch(e) { return null; }
}

function isSessionValid() {
  var token = getSessionToken();
  if (!token) return false;
  return token.indexOf('bp_' + FIXED_HASH.substring(0, 8)) === 0;
}

function isAuthenticated() {
  return authenticated;
}

/* ---------- Set authenticated state ---------- */
function setAuthenticated(val) {
  authenticated = !!val;
  html.setAttribute('data-authenticated', authenticated ? 'true' : 'false');
  if (loginBtn) loginBtn.hidden = authenticated;
  if (logoutBtn) logoutBtn.hidden = !authenticated;
}

/* ---------- Login form submit ---------- */
function handleLoginSubmit(e) {
  e.preventDefault();
  if (loginError) loginError.setAttribute('hidden', '');
  if (isLockedOut()) {
    updateLockoutDisplay();
    return;
  }
  var pwd = loginPwd ? loginPwd.value : '';
  if (!pwd) return;
  verifyPassword(pwd);
}

/* ---------- Check session on load ---------- */
function checkSession() {
  if (isSessionValid()) {
    setAuthenticated(true);
  }
}

/* ---------- Pickle access denied ---------- */
function showPickleModal() {
  if (pickleModal) pickleModal.removeAttribute('hidden');
}

function hidePickleModal() {
  if (pickleModal) pickleModal.setAttribute('hidden', '');
}

/* ---------- Device detection ---------- */
function detectDevice() {
  var w = window.innerWidth;
  if (w < 600) return 'phone';
  if (w < 1024) return 'tablet';
  if (w >= 1900) return 'tv';
  return 'pc';
}

function setDevice(device) {
  html.setAttribute('data-device', device);
  localStorage.setItem(DEVICE_KEY, device);
}

function openDeviceSelector() {
  if (deviceModal) deviceModal.removeAttribute('hidden');
}

function closeDeviceSelector() {
  if (deviceModal) deviceModal.setAttribute('hidden', '');
}

/* ---------- Logout ---------- */
function logout() {
  clearSession();
  setAuthenticated(false);
  secLog('Logged out', 'ok');
}

/* ==================================================================
   GITHUB API
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
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  str = str.replace(/<[^>]*>/g, '');
  str = str.replace(/on\w+\s*=/gi, '');
  str = str.replace(/javascript\s*:/gi, '');
  str = str.replace(/data\s*:\s*text\/html/gi, '');
  if (str.length > MAX_FIELD_LENGTH) str = str.substring(0, MAX_FIELD_LENGTH);
  return str;
}

function sanitizeUrl(str) {
  if (typeof str !== 'string') return '';
  str = sanitize(str);
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

/* ==================================================================
   SECURITY: DevTools detection
   ================================================================== */
var devtoolsOpen = false;
var devtoolsCheckInterval = null;

function detectDevTools() {
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
  console.log(el);
  document.body.removeChild(el);

  if (window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) {
    devtoolsOpen = true;
    secLog('DevTools detected (Firebug)', 'warn');
  }

  var start = performance.now();
  debugger;
  var end = performance.now();
  if (end - start > 100) {
    devtoolsOpen = true;
    secLog('DevTools detected (debugger pause)', 'warn');
  }

  return devtoolsOpen;
}

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
  var methods = ['log','warn','error','info','debug'];
  for (var i = 0; i < methods.length; i++) {
    nativeConsole[methods[i]] = console[methods[i]];
  }
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
  var key = e.keyCode || e.which;
  var ctrl = e.ctrlKey || e.metaKey;
  var shift = e.shiftKey;

  if (key === 123) {
    e.preventDefault();
    secLog('F12 blocked', 'warn');
    return false;
  }
  if (ctrl && shift && (key === 73 || key === 74)) {
    e.preventDefault();
    secLog('DevTools shortcut blocked', 'warn');
    return false;
  }
  if (ctrl && key === 85) {
    e.preventDefault();
    secLog('View source blocked', 'warn');
    return false;
  }
  if (ctrl && shift && key === 67) {
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
  } catch(e) {}
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
   GITHUB PUBLISH
   ================================================================== */

function getGitHubToken() {
  return localStorage.getItem(GH_TOKEN_KEY) || '';
}

function setGitHubToken(token) {
  if (token) {
    localStorage.setItem(GH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(GH_TOKEN_KEY);
  }
}

function promptGitHubToken() {
  var existing = getGitHubToken();
  var msg = t('publish_token_prompt');
  var input = prompt(msg, existing);
  if (input === null) return false;
  input = input.trim();
  if (!input) {
    alert(t('publish_token_invalid'));
    return false;
  }
  setGitHubToken(input);
  /* token saved OK */
  return true;
}

/* Fetch user's GitHub repos (exclude big-pickle) */
function fetchUserRepos(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', GH_USER_API, true);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  if (isAuthenticated()) {
    var tok = getGitHubToken();
    if (tok) xhr.setRequestHeader('Authorization', 'token ' + tok);
  }
  xhr.timeout = 15000;
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var repos = JSON.parse(xhr.responseText);
        if (Array.isArray(repos)) {
          var imported = [];
          for (var i = 0; i < repos.length; i++) {
            var r = repos[i];
            if (r.name === 'big-pickle' || r.fork) continue;
            var id = 'repo_' + r.name.replace(/[^a-z0-9_-]/gi, '_');
            imported.push({
              id: id,
              name: r.name,
              description: (r.description || '').trim() || 'No description.',
              version: r.default_branch || 'main',
              category: r.language || 'Other',
              tags: (r.topics || []).join(', '),
              download_url: r.html_url + '/releases/latest',
              source_url: r.html_url,
              website_url: r.homepage || r.html_url,
              screenshot_url: '',
              changelog: [],
              created: Date.parse(r.created_at) || Date.now(),
              updated: Date.parse(r.updated_at) || Date.now(),
              _auto: true,
              stars: r.stargazers_count || 0,
              forks: r.forks_count || 0
            });
          }
          secLog('Fetched ' + imported.length + ' repos from profile', 'ok');
          callback(imported);
          return;
        }
      } catch(e) {
        secLog('Profile repos parse error: ' + e.message, 'error');
      }
    } else {
      secLog('Profile repos API error: HTTP ' + xhr.status, 'error');
    }
    callback([]);
  };
  xhr.onerror = function() { secLog('Profile repos network error', 'error'); callback([]); };
  xhr.ontimeout = function() { secLog('Profile repos timeout', 'error'); callback([]); };
  xhr.send();
}
/* Re-fetch repos from profile and merge with local */
function refreshRepos() {
  if (repoStatusEl) repoStatusEl.textContent = t('repo_refreshing');
  fetchUserRepos(function(repos) {
    if (repos.length > 0) {
      var ids = {};
      for (var i = 0; i < repos.length; i++) ids[repos[i].id] = true;
      /* Merge local over repo data */
      for (var i = 0; i < projects.length; i++) {
        if (ids[projects[i].id]) {
          for (var j = 0; j < repos.length; j++) {
            if (repos[j].id === projects[i].id) {
              /* Preserve local-only fields (starred, manual edits) */
              repos[j]._starred = projects[i]._starred || false;
              repos[j]._manual = projects[i]._manual || false;
              repos[j].description = projects[i].description || repos[j].description;
              repos[j].download_url = projects[i].download_url || repos[j].download_url;
              break;
            }
          }
        }
      }
      /* Add local-only projects (non-repo, manually added) */
      for (var i = 0; i < projects.length; i++) {
        if (!ids[projects[i].id]) repos.push(projects[i]);
        else if (projects[i]._manual) {
          for (var j = 0; j < repos.length; j++) {
            if (repos[j].id === projects[i].id) { repos[j] = projects[i]; break; }
          }
        }
      }
      projects = repos;
    }
    saveToLocal();
    renderAll();
    if (repoStatusEl) {
      repoStatusEl.textContent = t('repo_refreshed');
      setTimeout(function() { if (repoStatusEl) repoStatusEl.textContent = ''; }, 3000);
    }
    secLog('Repos refreshed from profile', 'ok');
  });
}

/* ==================================================================
   LOCAL STORAGE
   ================================================================== */

function saveToLocal() {
  var data = { projects: projects, updated: Date.now() };
  var checksum = computeChecksum(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(INTEGRITY_KEY, checksum);
  } catch(e) {
    secLog('Storage error: ' + e.message, 'error');
  }
}

function saveProjects() {
  saveToLocal();
  updateStats();
  updateFilterBtns();
}

function loadFromLocal() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    var storedChecksum = localStorage.getItem(INTEGRITY_KEY);
    if (!raw) return 0;
    var parsed = JSON.parse(raw);
    var computedChecksum = computeChecksum(parsed);
    if (storedChecksum !== computedChecksum) {
      secLog('DATA TAMPER DETECTED \u2014 checksum mismatch!', 'error');
      if (!confirm('Security alert: Project data appears to have been tampered with. Load anyway?')) {
        return -1;
      }
    }
    if (parsed && Array.isArray(parsed.projects)) {
      projects = parsed.projects.filter(function(p) {
        return p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim();
      });
      saveToLocal();
      return projects.length;
    }
  } catch(e) {
    secLog('Local data load error: ' + e.message, 'error');
  }
  return 0;
}

function showLoading() {
  if (projectsGrid) projectsGrid.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><p>' + t('repo_refreshing') + '</p></div>';
}

function loadProjects() {
  var localCount = loadFromLocal();
  if (localCount < 0) return;
  var loaded = localCount > 0;
  var ids = {};
  showLoading();

  /* Fetch repos from profile and merge on top of local data */
  fetchUserRepos(function(repos) {
    if (repos.length > 0) {
      /* Start with profile repos */
      projects = repos.slice();
      for (var i = 0; i < projects.length; i++) ids[projects[i].id] = true;

      /* Merge local data on top (local wins for same IDs) */
      if (loaded) {
        var localRaw = localStorage.getItem(STORAGE_KEY);
        if (localRaw) {
          try {
            var localData = JSON.parse(localRaw);
            if (localData && Array.isArray(localData.projects)) {
              for (var i = 0; i < localData.projects.length; i++) {
                var p = localData.projects[i];
                if (p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim()) {
                  if (ids[p.id]) {
                    for (var j = 0; j < projects.length; j++) {
                      if (projects[j].id === p.id) { projects[j] = p; break; }
                    }
                  } else {
                    projects.push(p);
                    ids[p.id] = true;
                  }
                }
              }
            }
          } catch(e) {}
        }
      }

      renderAll();
      secLog('Profile data loaded (' + repos.length + ' repos, ' + projects.length + ' total)', 'ok');
    } else if (loaded) {
      secLog('Local data loaded (' + localCount + ' projects)', 'ok');
      renderAll();
    } else {
      projects = [];
      renderAll();
    }
  });
}

/* ==================================================================
   PROJECT CRUD
   ================================================================== */

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
  showToast('Deleted: ' + name, 'ok');
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
  showToast('Exported ' + projects.length + ' projects', 'ok');
}

/* --- Import --- */
function importData(jsonStr) {
  try {
    var data = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.projects)) {
      alert(t('import_error'));
      return false;
    }
    var valid = [];
    for (var i = 0; i < data.projects.length; i++) {
      var p = data.projects[i];
      if (p && typeof p.name === 'string' && p.name.trim()) {
        valid.push(p);
      }
    }
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
    if (currentFilter === '__starred' && !p._starred) continue;
    if (currentFilter !== 'all' && currentFilter !== '__starred') {
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
  /* Sort */
  result.sort(function(a, b) {
    if (currentSort === 'newest') return (b.created || 0) - (a.created || 0);
    if (currentSort === 'oldest') return (a.created || 0) - (b.created || 0);
    if (currentSort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    if (currentSort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
    if (currentSort === 'stars') return (b.stars || 0) - (a.stars || 0);
    return 0;
  });
  return result;
}

function createCard(project) {
  var card = document.createElement('div');
  card.className = 'project-card animate-in';
  card.setAttribute('role', 'listitem');
  card.setAttribute('data-id', project.id);

  /* Click to show detail */
  card.addEventListener('click', function(e) {
    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn') || e.target.closest('.star-btn')) return;
    showProjectDetail(project.id);
  });

  /* Repo badge */
  if (project._auto) {
    var repoBadge = document.createElement('span');
    repoBadge.className = 'repo-badge';
    repoBadge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>';
    repoBadge.setAttribute('title', 'Imported from GitHub');
    card.appendChild(repoBadge);
  }

  /* Star button */
  var starBtn = document.createElement('button');
  starBtn.className = 'star-btn' + (project._starred ? ' starred' : '');
  starBtn.innerHTML = project._starred ? ICONS.star : ICONS.star_o;
  starBtn.setAttribute('aria-label', (project._starred ? t('filter_starred') : 'Star') + ' ' + project.name);
  starBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleStar(project.id);
  });
  card.appendChild(starBtn);

  /* Actions overlay */
  var actions = document.createElement('div');
  actions.className = 'project-card-actions admin-only';
  var editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.innerHTML = ICONS.edit;
  editBtn.setAttribute('aria-label', t('edit') + ' ' + project.name);
  editBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    openEditModal(project.id);
  });
  var delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.innerHTML = ICONS.del;
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

  /* Meta row: language dot + stars + updated */
  var metaEl = document.createElement('div');
  metaEl.className = 'project-meta';
  if (project.category && project.category !== 'Other') {
    var langBtn = document.createElement('button');
    langBtn.className = 'lang-btn';
    langBtn.type = 'button';
    var langDot = document.createElement('span');
    langDot.className = 'lang-dot';
    var color = LANG_COLORS[project.category] || '#888';
    langDot.style.background = color;
    langDot.style.boxShadow = '0 0 4px ' + color;
    langBtn.appendChild(langDot);
    var langName = document.createElement('span');
    langName.className = 'lang-name';
    langName.textContent = project.category;
    langBtn.appendChild(langName);
    langBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      currentFilter = project.category;
      renderProjects();
      renderAdminProjects();
      /* Update button active states */
      var btns = filterGroup.querySelectorAll('.filter-btn');
      for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
      for (var j = 0; j < btns.length; j++) {
        if (btns[j].getAttribute('data-filter') === project.category) btns[j].classList.add('active');
      }
      showToast('Filtered: ' + project.category, 'info');
    });
    metaEl.appendChild(langBtn);
  }
  if (project.stars > 0) {
    var starCount = document.createElement('span');
    starCount.className = 'star-count';
    starCount.innerHTML = ICONS.star_sm + ' ' + project.stars;
    metaEl.appendChild(starCount);
  }
  if (project.forks > 0) {
    var forkCount = document.createElement('span');
    forkCount.className = 'fork-count';
    forkCount.innerHTML = ICONS.fork + ' ' + project.forks;
    metaEl.appendChild(forkCount);
  }
  if (project.updated) {
    var updatedEl = document.createElement('span');
    updatedEl.className = 'project-updated';
    var diff = Date.now() - project.updated;
    var days = Math.floor(diff / 86400000);
    if (days < 1) updatedEl.textContent = 'today';
    else if (days < 30) updatedEl.textContent = days + 'd ago';
    else if (days < 365) updatedEl.textContent = Math.floor(days / 30) + 'mo ago';
    else updatedEl.textContent = Math.floor(days / 365) + 'y ago';
    metaEl.appendChild(updatedEl);
  }
  if (metaEl.children.length > 0) body.appendChild(metaEl);

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
    actionsRow.appendChild(createLinkBtn(project.download_url, t('download'), 'btn-primary', 'download'));
  }
  if (project.source_url) {
    actionsRow.appendChild(createLinkBtn(project.source_url, t('source_code'), 'btn-secondary', 'source'));
  }
  if (project.website_url) {
    actionsRow.appendChild(createLinkBtn(project.website_url, t('website'), 'btn-secondary', 'website'));
  }
  body.appendChild(actionsRow);
  card.appendChild(body);

  return card;
}

function renderAdminProjects() {
  if (!adminGrid) return;
  var filtered = getFilteredProjects();
  adminGrid.innerHTML = '';
  for (var i = 0; i < filtered.length; i++) {
    adminGrid.appendChild(createCard(filtered[i]));
  }
}

function createLinkBtn(url, label, cls, iconName) {
  var a = document.createElement('a');
  a.href = url;
  a.className = 'btn ' + cls + ' btn-small';
  if (iconName && ICONS[iconName]) {
    var ic = document.createElement('span');
    ic.innerHTML = ICONS[iconName];
    ic.style.marginRight = '0.3rem';
    a.appendChild(ic);
  }
  var tx = document.createTextNode(' ' + label);
  a.appendChild(tx);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

/* ==================================================================
   UPDATE FILTER BUTTONS
   ================================================================== */
function setFilterClick(btn) {
  btn.addEventListener('click', function() {
    var btns = filterGroup.querySelectorAll('.filter-btn');
    for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
    this.classList.add('active');
    currentFilter = this.getAttribute('data-filter');
    renderProjects();
  });
}

function updateFilterBtns() {
  var cats = {};
  for (var i = 0; i < projects.length; i++) {
    var c = (projects[i].category || '').trim();
    if (c) cats[c] = (cats[c] || 0) + 1;
  }
  var catKeys = Object.keys(cats).sort();

  var existing = filterGroup.querySelectorAll('.filter-btn');
  for (var i = 2; i < existing.length; i++) {
    existing[i].remove();
  }
  if (existing[0]) setFilterClick(existing[0]);
  if (existing[1]) setFilterClick(existing[1]);
  for (var i = 0; i < catKeys.length; i++) {
    var btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('data-filter', catKeys[i]);
    btn.textContent = catKeys[i] + ' (' + cats[catKeys[i]] + ')';
    setFilterClick(btn);
    filterGroup.appendChild(btn);
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

/* --- Form submit --- */
function handleFormSubmit(e) {
  e.preventDefault();

  if (!checkRateLimit()) {
    alert('Too many submissions. Please wait.');
    return;
  }

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
  showToast(editingId ? 'Updated: ' + name : 'Added: ' + name, 'ok');
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
  renderAdminProjects();
  updateStats();
  updateFilterBtns();
}

/* ==================================================================
   NAVIGATION
   ================================================================== */
function navigateTo(pageId) {
  if ((pageId === 'dashboard' || pageId === 'settings') && !authenticated) {
    showPickleModal();
    return;
  }
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

  if (navList) navList.classList.remove('open');
  if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0 });
}

/* ==================================================================
   STAR TOGGLE
   ================================================================== */
function toggleStar(id) {
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) {
      projects[i]._starred = !projects[i]._starred;
      saveToLocal();
      renderProjects();
      showToast(projects[i]._starred ? '\u2605 Starred' : 'Unstarred', 'info');
      return;
    }
  }
}

/* ==================================================================
   PROJECT DETAIL MODAL
   ================================================================== */
function showProjectDetail(id) {
  var p = null;
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) { p = projects[i]; break; }
  }
  if (!p) return;
  document.getElementById('detail-title').textContent = p.name;
  var body = document.getElementById('detail-body');
  var html = '';
  if (p.screenshot_url) {
    html += '<img class="detail-screenshot" src="' + escapeHtml(p.screenshot_url) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">';
  }
  html += '<p class="detail-description">' + escapeHtml(p.description || '') + '</p>';
  html += '<div class="detail-meta">';
  if (p.category && p.category !== 'Other') {
    var langColor = LANG_COLORS[p.category] || '#888';
    html += '<span class="detail-lang"><span class="lang-dot" style="background:' + langColor + ';box-shadow:0 0 4px ' + langColor + '"></span> ' + escapeHtml(p.category) + '</span>';
  }
  if (p.stars > 0) html += '<span class="detail-stars">' + ICONS.star_sm + ' ' + p.stars + '</span>';
  if (p.forks > 0) html += '<span class="detail-forks">' + ICONS.fork + ' ' + p.forks + '</span>';
  if (p.updated) {
    var diff = Date.now() - p.updated;
    var days = Math.floor(diff / 86400000);
    var updatedStr;
    if (days < 1) updatedStr = 'today';
    else if (days < 30) updatedStr = days + 'd ago';
    else if (days < 365) updatedStr = Math.floor(days / 30) + 'mo ago';
    else updatedStr = Math.floor(days / 365) + 'y ago';
    html += '<span class="detail-updated"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Updated ' + updatedStr + '</span>';
  }
  html += '</div>';
  if (p.tags) {
    html += '<div class="detail-tags">' + escapeHtml(t('tags')) + ': ' + escapeHtml(p.tags) + '</div>';
  }
  if (p.changelog) {
    html += '<h3>' + escapeHtml(t('detail_changelog')) + '</h3><div class="detail-changelog">';
    if (typeof p.changelog === 'string') {
      html += '<pre>' + escapeHtml(p.changelog) + '</pre>';
    } else if (Array.isArray(p.changelog)) {
      for (var j = 0; j < p.changelog.length; j++) {
        var cl = p.changelog[j];
        var ver = cl.version || '';
        var dt = cl.date || '';
        html += '<div class="cl-entry"><strong>' + escapeHtml(ver) + '</strong>' + (dt ? ' <em>(' + escapeHtml(dt) + ')</em>' : '');
        if (Array.isArray(cl.items) && cl.items.length) {
          html += '<ul>';
          for (var k = 0; k < cl.items.length; k++) {
            html += '<li>' + escapeHtml(cl.items[k]) + '</li>';
          }
          html += '</ul>';
        }
        html += '</div>';
      }
    }
    html += '</div>';
  }
  html += '<div class="detail-actions">';
  var links = [['source_url', 'source_code'], ['download_url', 'download'], ['website_url', 'website']];
  for (var l = 0; l < links.length; l++) {
    if (p[links[l][0]]) {
      html += '<a class="btn btn-secondary btn-small" href="' + escapeHtml(p[links[l][0]]) + '" target="_blank" rel="noopener">' + escapeHtml(t(links[l][1])) + '</a>';
    }
  }
  html += '</div>';
  body.innerHTML = html;
  document.getElementById('detail-modal').hidden = false;

  /* Recently viewed */
  var rv;
  try { rv = JSON.parse(localStorage.getItem('_rv') || '[]'); } catch(e) { rv = []; }
  rv = rv.filter(function(v) { return v !== id; });
  rv.unshift(id);
  if (rv.length > 5) rv.length = 5;
  try { localStorage.setItem('_rv', JSON.stringify(rv)); } catch(e) {}
}

function closeDetailModal() {
  document.getElementById('detail-modal').hidden = true;
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
var langOpts = document.querySelectorAll('.lang-opt');
for (var li = 0; li < langOpts.length; li++) {
  langOpts[li].addEventListener('click', function() {
    var lang = this.getAttribute('data-lang');
    if (lang) setLanguage(lang);
    if (langMenu) langMenu.classList.remove('open');
  });
}

/* Theme */
if (themeBtn) {
  themeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (themeMenu) themeMenu.classList.toggle('open');
  });
}
var themeOpts = document.querySelectorAll('.theme-opt');
for (var ti = 0; ti < themeOpts.length; ti++) {
  themeOpts[ti].addEventListener('click', function() {
    var theme = this.getAttribute('data-theme');
    if (theme) setTheme(theme);
    if (themeMenu) themeMenu.classList.remove('open');
  });
}

/* Mobile nav toggle */
if (navToggle) {
  navToggle.addEventListener('click', function() {
    var open = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
}

/* Search with debounce */
var searchTimer;
if (searchInput) {
  searchInput.addEventListener('input', function() {
    currentSearch = this.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() { searchTimer = null; renderProjects(); }, 150);
  });
}

/* Add project button */
if (addBtn) addBtn.addEventListener('click', openAddModal);

/* Modal close */
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalCancel) modalCancel.addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', function(e) {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (!modal.hasAttribute('hidden')) closeModal();
    if (!confirmModal.hasAttribute('hidden')) closeConfirm();
    if (detailModal && !detailModal.hidden) closeDetailModal();
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
if (confirmModal) confirmModal.addEventListener('click', function(e) {
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

/* Admin dashboard search */
if (adminSearchInput) {
  adminSearchInput.addEventListener('input', function() {
    currentSearch = this.value;
    renderProjects();
    renderAdminProjects();
  });
}

/* Admin dashboard add / export / import / refresh */
if (adminAddBtn) adminAddBtn.addEventListener('click', openAddModal);
if (adminExportBtn) adminExportBtn.addEventListener('click', exportData);
if (adminImportBtn) {
  adminImportBtn.addEventListener('click', function() {
    if (adminImportFile) adminImportFile.click();
  });
}
if (adminImportFile) {
  adminImportFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      importData(evt.target.result);
    };
    reader.readAsText(file);
    adminImportFile.value = '';
  });
}
if (refreshReposBtn) refreshReposBtn.addEventListener('click', refreshRepos);

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

/* Login / Logout */
if (loginBtn) loginBtn.addEventListener('click', openLoginModal);
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (loginClose) loginClose.addEventListener('click', closeLoginModal);
if (loginModal) {
  loginModal.addEventListener('click', function(e) {
    if (e.target === loginModal) closeLoginModal();
  });
}
if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

/* Device selector */
if (deviceModal) {
  var deviceOpts = document.querySelectorAll('.device-opt');
  for (var di = 0; di < deviceOpts.length; di++) {
    deviceOpts[di].addEventListener('click', function() {
      var dev = this.getAttribute('data-device');
      if (dev) {
        setDevice(dev);
        closeDeviceSelector();
      }
    });
  }
  deviceModal.addEventListener('click', function(e) {
    if (e.target === deviceModal) closeDeviceSelector();
  });
}
if (deviceAutoBtn) {
  deviceAutoBtn.addEventListener('click', function() {
    var detected = detectDevice();
    setDevice(detected);
    closeDeviceSelector();
  });
}

/* Pickle modal */
if (pickleGoHome) {
  pickleGoHome.addEventListener('click', function() {
    hidePickleModal();
    navigateTo('home');
  });
}
if (pickleModal) {
  pickleModal.addEventListener('click', function(e) {
    if (e.target === pickleModal) {
      hidePickleModal();
      navigateTo('home');
    }
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
        secLog('Integrity check failed \u2014 data may have been tampered with!', 'error');
      }
    } catch(e) {
      secLog('Integrity check error: ' + e.message, 'error');
    }
  }
}, 30000);

/* ==================================================================
   INIT
   ================================================================== */
html.setAttribute('data-authenticated', 'false');

/* Sort */
var sortEl = document.getElementById('sort-select');
if (sortEl) sortEl.addEventListener('change', function() {
  currentSort = this.value;
  renderProjects();
});

/* Detail modal close */
var detailCloseBtn = document.getElementById('detail-close-btn');
var detailModal = document.getElementById('detail-modal');
if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailModal);
if (detailModal) detailModal.addEventListener('click', function(e) {
  if (e.target === this) closeDetailModal();
});

/* Device setup */
var storedDevice = localStorage.getItem(DEVICE_KEY);
if (storedDevice) {
  setDevice(storedDevice);
} else {
  var detected = detectDevice();
  html.setAttribute('data-device', detected);
  openDeviceSelector();
}

loadProjects();
setTheme(currentTheme);
updateActiveLang(currentLang);
translatePage();
renderSecurityLog();

/* Compute fixed hash from obfuscated password at runtime */
sha256(getFixedPassword() + ':' + FIXED_SALT).then(function(hash) {
  FIXED_HASH = hash;
  checkSession();
}, function() {
  secLog('Password hash init failed', 'error');
});

/* navigate to home (public portfolio) initially */
navigateTo('home');

/* ==================================================================
   TOAST NOTIFICATIONS — "everyone wants" feature
   Replaces alert() with animated toast messages
   ================================================================== */

function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  var icons = {
    info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };
  var bg = { info: '#2196F3', ok: '#4CAF50', warn: '#FF9800', error: '#f44336' };
  toast.style.cssText = 'padding:12px 20px;background:' + (bg[type] || '#333') + ';color:#fff;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateX(120%);transition:transform 0.3s ease;display:flex;align-items:center;gap:10px;cursor:pointer';
  toast.innerHTML = '<span style="display:flex">' + (icons[type] || '') + '</span><span>' + message + '</span>';

  container.appendChild(toast);
  setTimeout(function() { toast.style.transform = 'translateX(0)'; }, 10);

  setTimeout(function() {
    toast.style.transform = 'translateX(120%)';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
  }, 4000);

  toast.addEventListener('click', function() {
    toast.style.transform = 'translateX(120%)';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
  });
}

/* Wrap all alert() calls — but keep confirm() as-is */
var origAlert = window.alert;
window.alert = function(msg) {
  showToast(msg, 'warn');
};

/* ==================================================================
   KEYBOARD SHORTCUTS — "everyone wants" feature
   ================================================================== */

document.addEventListener('keydown', function(e) {
  var tag = (e.target || {}).tagName || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  switch (e.key) {
    case 'n':
    case 'N':
      if (!e.ctrlKey && !e.metaKey && authenticated) {
        e.preventDefault();
        openAddModal();
      }
      break;
    case '/':
      e.preventDefault();
      if (searchInput) searchInput.focus();
      break;
    case '?':
      e.preventDefault();
      showShortcutsHelp();
      break;
    case 'h':
    case 'H':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateTo('home');
      }
      break;
    case 'd':
    case 'D':
      if (!e.ctrlKey && !e.metaKey && authenticated) {
        e.preventDefault();
        navigateTo('dashboard');
      }
      break;
    case 's':
    case 'S':
      if (!e.ctrlKey && !e.metaKey && authenticated) {
        e.preventDefault();
        navigateTo('settings');
      }
      break;
  }
});

var shortcutsHelpModal = null;

function showShortcutsHelp() {
  if (!shortcutsHelpModal) {
    shortcutsHelpModal = document.createElement('div');
    shortcutsHelpModal.id = 'shortcuts-help';
    shortcutsHelpModal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6)';
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card,#fff);padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3)';
    box.innerHTML =
      '<h2 style="margin:0 0 16px;font-size:18px">Keyboard Shortcuts</h2>' +
      '<table style="width:100%;border-collapse:collapse">' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">N</kbd></td><td style="padding:6px 12px">New project</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">/</kbd></td><td style="padding:6px 12px">Search projects</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">H</kbd></td><td style="padding:6px 12px">Home</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">D</kbd></td><td style="padding:6px 12px">Dashboard (admin)</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">S</kbd></td><td style="padding:6px 12px">Settings (admin)</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">?</kbd></td><td style="padding:6px 12px">This help</td></tr>' +
      '<tr><td style="padding:6px 12px"><kbd style="padding:2px 8px;border-radius:4px;border:1px solid var(--border,#ccc);font-size:13px">Esc</kbd></td><td style="padding:6px 12px">Close modals</td></tr>' +
      '</table>' +
      '<button id="shortcuts-close" style="margin-top:16px;padding:8px 24px;border:none;border-radius:6px;cursor:pointer;background:var(--accent,#4CAF50);color:#fff;font-size:14px">Close</button>';
    shortcutsHelpModal.appendChild(box);
    document.body.appendChild(shortcutsHelpModal);
    shortcutsHelpModal.addEventListener('click', function(ev) { if (ev.target === shortcutsHelpModal) hideShortcutsHelp(); });
    box.querySelector('#shortcuts-close').addEventListener('click', hideShortcutsHelp);
  }
  shortcutsHelpModal.style.display = 'flex';
}

function hideShortcutsHelp() {
  if (shortcutsHelpModal) shortcutsHelpModal.style.display = 'none';
}

/* Auto-refresh repos every 5 minutes */
setInterval(function() {
  if (document.hidden) return;
  refreshRepos();
}, 300000);
