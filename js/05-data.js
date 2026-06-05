'use strict';

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

function saveProjects(doPublish) {
  saveToLocal();
  updateStats();
  updateFilterBtns();
  if (doPublish !== false && isAuthenticated()) {
    publishToSite(null);
  }
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

function loadProjects() {
  var localCount = loadFromLocal();
  if (localCount < 0) return;
  var loaded = localCount > 0;

  /* Fetch published data from GitHub */
  fetchPublishedProjects(function(published) {
    publishedProjects = published;
    var ids = {};
    var changed = false;

    if (published.length > 0) {
      projects = published.filter(function(p) {
        return p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim();
      });
      for (var i = 0; i < projects.length; i++) ids[projects[i].id] = true;
      changed = true;
    }

    /* Merge local drafts on top (local wins for same IDs) */
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
                changed = true;
              }
            }
          }
        } catch(e) {}
      }
    }

    /* Fetch auto-imported apps */
    fetchAppsRepo(function(apps) {
      for (var i = 0; i < apps.length; i++) {
        if (!ids[apps[i].id]) {
          projects.push(apps[i]);
          ids[apps[i].id] = true;
        }
      }
      if (changed || apps.length > 0) {
        renderAll();
      }
      if (published.length > 0) {
        secLog('GitHub data loaded (' + published.length + ' published, ' + apps.length + ' apps)', 'ok');
      } else if (loaded) {
        secLog('Local data loaded (' + localCount + ' projects)', 'ok');
      }
    });
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
