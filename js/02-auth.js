'use strict';

/* ==================================================================
   LOGIN / AUTHENTICATION
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
