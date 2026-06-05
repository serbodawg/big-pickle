'use strict';

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
