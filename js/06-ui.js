'use strict';

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

  /* Star button */
  var starBtn = document.createElement('button');
  starBtn.className = 'star-btn' + (project._starred ? ' starred' : '');
  starBtn.textContent = project._starred ? '\u2605' : '\u2606';
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

function renderAdminProjects() {
  if (!adminGrid) return;
  var filtered = getFilteredProjects();
  adminGrid.innerHTML = '';
  for (var i = 0; i < filtered.length; i++) {
    adminGrid.appendChild(createCard(filtered[i]));
  }
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
  var cats = {};
  for (var i = 0; i < projects.length; i++) {
    var c = (projects[i].category || '').trim();
    if (c) cats[c] = (cats[c] || 0) + 1;
  }
  var catKeys = Object.keys(cats).sort();

  var existing = filterGroup.querySelectorAll('.filter-btn');
  for (var i = 1; i < existing.length; i++) {
    existing[i].remove();
  }
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
  if (p.downloads != null) html += '<span>' + escapeHtml(t('detail_downloads')) + ': ' + p.downloads + '</span>';
  if (p.stars != null) html += '<span>' + escapeHtml(t('detail_stars')) + ': ' + p.stars + '</span>';
  html += '</div>';
  if (p.tags) {
    html += '<div class="detail-tags">' + escapeHtml(t('tags')) + ': ' + escapeHtml(p.tags) + '</div>';
  }
  if (p.changelog) {
    html += '<h3>' + escapeHtml(t('detail_changelog')) + '</h3><div class="detail-changelog">';
    if (typeof p.changelog === 'string') {
      html += '<pre>' + escapeHtml(p.changelog) + '</pre>';
    } else if (Array.isArray(p.changelog)) {
      html += '<ul>';
      for (var j = 0; j < p.changelog.length; j++) {
        html += '<li>' + escapeHtml(p.changelog[j]) + '</li>';
      }
      html += '</ul>';
    }
    html += '</div>';
  }
  html += '<div class="detail-actions">';
  var links = [['github_url', 'GitHub'], ['download_url', 'Download'], ['website_url', 'Website'], ['docs_url', 'Docs']];
  for (var l = 0; l < links.length; l++) {
    if (p[links[l][0]]) {
      html += '<a class="btn btn-secondary btn-small" href="' + escapeHtml(p[links[l][0]]) + '" target="_blank" rel="noopener">' + escapeHtml(links[l][1]) + '</a>';
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
