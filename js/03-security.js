'use strict';

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
  var result = console.log(el);
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
