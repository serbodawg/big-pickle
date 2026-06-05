'use strict';

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

/* Admin dashboard search */
if (adminSearchInput) {
  adminSearchInput.addEventListener('input', function() {
    currentSearch = this.value;
    renderProjects();
    renderAdminProjects();
  });
}

/* Admin dashboard add / export / import */
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

/* Publish to site */
if (publishBtn) {
  publishBtn.addEventListener('click', function() {
    if (!isAuthenticated()) return;
    if (projects.length === 0) {
      if (publishStatus) publishStatus.textContent = 'No projects to publish.';
      return;
    }
    publishToSite(function(success) {
      if (success && publishStatus) {
        publishStatus.textContent = t('publish_ok');
      }
    });
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
  document.querySelectorAll('.device-opt').forEach(function(el) {
    el.addEventListener('click', function() {
      var dev = this.getAttribute('data-device');
      if (dev) {
        setDevice(dev);
        closeDeviceSelector();
      }
    });
  });
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
/* Initial render while async data loads */
renderProjects();
setTheme(currentTheme);
updateActiveLang(currentLang);
translatePage();
renderSecurityLog();

/* Compute fixed hash from obfuscated password at runtime */
sha256(getFixedPassword() + ':' + FIXED_SALT).then(function(hash) {
  FIXED_HASH = hash;
  checkSession();
});

/* navigate to home (public portfolio) initially */
navigateTo('home');
