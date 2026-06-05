'use strict';

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
  if (publishStatus) publishStatus.textContent = t('publish_token_ok');
  return true;
}

/* Fetch published projects from GitHub raw content */
function fetchPublishedProjects(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', GH_RAW, true);
  xhr.timeout = 10000;
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        if (data && Array.isArray(data.projects)) {
          secLog('Fetched ' + data.projects.length + ' published projects', 'ok');
          callback(data.projects);
          return;
        }
      } catch(e) {
        secLog('Published data parse error: ' + e.message, 'error');
      }
    } else if (xhr.status === 404) {
      secLog('No published data yet (data/projects.json missing)', 'warn');
    } else {
      secLog('Published data fetch error: HTTP ' + xhr.status, 'error');
    }
    callback([]);
  };
  xhr.onerror = function() { secLog('Published data network error', 'error'); callback([]); };
  xhr.ontimeout = function() { secLog('Published data timeout', 'error'); callback([]); };
  xhr.send();
}

/* Fetch releases from apps-linux-only and merge as auto-imported projects */
function fetchAppsRepo(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', APPS_API, true);
  xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  if (isAuthenticated()) {
    var tok = getGitHubToken();
    if (tok) xhr.setRequestHeader('Authorization', 'token ' + tok);
  }
  xhr.timeout = 15000;
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        var releases = JSON.parse(xhr.responseText);
        if (Array.isArray(releases)) {
          var imported = [];
          for (var i = 0; i < releases.length; i++) {
            var r = releases[i];
            if (r.draft) continue;
            var id = 'auto_' + r.tag_name.replace(/[^a-z0-9_-]/gi, '_');
            var dl = '';
            if (r.assets && r.assets.length > 0) {
              dl = r.assets[0].browser_download_url || '';
            }
            imported.push({
              id: id,
              name: r.name || r.tag_name,
              description: (r.body || '').trim() || 'No description.',
              version: r.tag_name || '',
              category: 'Linux App',
              tags: '',
              download_url: dl,
              source_url: r.html_url || '',
              website_url: r.html_url || '',
              screenshot_url: '',
              changelog: [],
              created: Date.parse(r.published_at || r.created_at) || Date.now(),
              updated: Date.parse(r.updated_at) || Date.now(),
              _auto: true
            });
          }
          secLog('Fetched ' + imported.length + ' apps from repo', 'ok');
          callback(imported);
          return;
        }
      } catch(e) {
        secLog('Apps repo parse error: ' + e.message, 'error');
      }
    } else {
      secLog('Apps repo API error: HTTP ' + xhr.status, 'error');
    }
    callback([]);
  };
  xhr.onerror = function() { secLog('Apps repo network error', 'error'); callback([]); };
  xhr.ontimeout = function() { secLog('Apps repo timeout', 'error'); callback([]); };
  xhr.send();
}

/* Commit current projects to GitHub via API */
function publishToSite(callback) {
  var token = getGitHubToken();
  if (!token) {
    if (!promptGitHubToken()) {
      if (callback) callback(false, 'no_token');
      return;
    }
    token = getGitHubToken();
  }

  if (publishStatus) publishStatus.textContent = t('publish_working');

  var content = JSON.stringify({ projects: projects, updated: Date.now() }, null, 2);
  var encoded = btoa(unescape(encodeURIComponent(content)));

  /* Step 1: get current file SHA */
  var xhrGet = new XMLHttpRequest();
  xhrGet.open('GET', GH_API, true);
  xhrGet.setRequestHeader('Authorization', 'token ' + token);
  xhrGet.setRequestHeader('Accept', 'application/vnd.github.v3+json');
  xhrGet.timeout = 15000;

  xhrGet.onload = function() {
    var sha = '';
    if (xhrGet.status === 200) {
      try { sha = JSON.parse(xhrGet.responseText).sha; } catch(e) {}
    }

    /* Step 2: PUT the file */
    var body = {
      message: 'publish: update project data',
      content: encoded,
      branch: GH_BRANCH
    };
    if (sha) body.sha = sha;

    var xhrPut = new XMLHttpRequest();
    xhrPut.open('PUT', GH_API, true);
    xhrPut.setRequestHeader('Authorization', 'token ' + token);
    xhrPut.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhrPut.setRequestHeader('Content-Type', 'application/json');
    xhrPut.timeout = 15000;

    xhrPut.onload = function() {
      if (xhrPut.status === 200 || xhrPut.status === 201) {
        if (publishStatus) publishStatus.textContent = t('publish_ok');
        if (callback) callback(true);
      } else {
        var errMsg = t('publish_err');
        try {
          var errData = JSON.parse(xhrPut.responseText);
          if (errData && errData.message) errMsg += ' ' + errData.message;
        } catch(e) {}
        if (publishStatus) publishStatus.textContent = errMsg;
        if (xhrPut.status === 401 || xhrPut.status === 403) {
          setGitHubToken('');
          if (confirm('Token invalid or expired. Enter a new one?')) {
            promptGitHubToken();
          }
        }
        if (callback) callback(false, errMsg);
      }
    };

    xhrPut.onerror = function() {
      if (publishStatus) publishStatus.textContent = t('publish_err');
      if (callback) callback(false, 'network_error');
    };

    try {
      xhrPut.send(JSON.stringify(body));
    } catch(e) {
      if (publishStatus) publishStatus.textContent = t('publish_err');
      if (callback) callback(false, 'send_error');
    }
  };

  xhrGet.onerror = function() {
    if (publishStatus) publishStatus.textContent = t('publish_err');
    if (callback) callback(false, 'network_error');
  };

  try {
    xhrGet.send();
  } catch(e) {
    if (publishStatus) publishStatus.textContent = t('publish_err');
    if (callback) callback(false, 'send_error');
  }
}
