'use strict';

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
  var icons = { info: '\u2139', ok: '\u2713', warn: '\u26A0', error: '\u2716' };
  var bg = { info: '#2196F3', ok: '#4CAF50', warn: '#FF9800', error: '#f44336' };
  toast.style.cssText = 'padding:12px 20px;background:' + (bg[type] || '#333') + ';color:#fff;border-radius:8px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:translateX(120%);transition:transform 0.3s ease;display:flex;align-items:center;gap:10px;cursor:pointer';
  toast.innerHTML = '<span style="font-size:18px">' + (icons[type] || '') + '</span><span>' + message + '</span>';

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
