/* =========================================================
   OGWINI CTHS — Admin panel
   Auth (Supabase) + CRUD for Subjects and Timetables.
   All writes go through Supabase; RLS requires an
   authenticated session, so users must sign in first.
   ========================================================= */
import { supabase } from './supabase-client.js';

/* ---------- helpers ---------- */
var $ = function (id) { return document.getElementById(id); };

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  if (isError !== undefined) {
    el.classList.toggle('admin-msg--error', isError);
    el.classList.toggle('admin-msg--success', !isError);
  }
  if (!isError) {
    window.setTimeout(function () { el.hidden = true; }, 3500);
  }
}

function gradeLabel(start, end) {
  if (start && end && start !== end) return 'Gr ' + start + '\u2013' + end;
  if (start) return 'Gr ' + start;
  if (end) return 'Gr ' + end;
  return '\u2014';
}

/* ---------- auth ---------- */
var loginView = $('login-view');
var dashboardView = $('dashboard-view');
var adminUser = $('admin-user');

async function refreshSession() {
  var res = await supabase.auth.getSession();
  var session = res.data ? res.data.session : null;
  if (session && session.user) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    adminUser.hidden = false;
    $('admin-email').textContent = session.user.email || '';
    loadDepartments();
    loadSubjects();
    loadTimetables();
    initializeContentManager();
    loadPreviewDashboard();
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
    adminUser.hidden = true;
  }
}

$('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errEl = $('login-error');
  errEl.hidden = true;
  var btn = $('login-submit');
  btn.disabled = true;
  btn.textContent = 'Signing in\u2026';

  var res = await supabase.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-password').value
  });

  btn.disabled = false;
  btn.textContent = 'Sign in';

  if (res.error) {
    showMsg(errEl, res.error.message || 'Unable to sign in.', true);
    return;
  }
  refreshSession();
});

$('logout-btn').addEventListener('click', async function () {
  await supabase.auth.signOut();
  refreshSession();
});

/* ---------- tabs ---------- */
function activateAdminTab(name) {
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.classList.toggle('is-active', tab.getAttribute('data-tab') === name);
  });
  document.querySelectorAll('.admin-panel').forEach(function (panel) { panel.classList.remove('is-active'); });
  $('panel-' + name).classList.add('is-active');
}
document.querySelectorAll('.admin-tab').forEach(function (tab) {
  tab.addEventListener('click', function () { activateAdminTab(tab.getAttribute('data-tab')); });
});

/* =========================================================
   SUBJECTS
   ========================================================= */
var departments = [];

async function loadDepartments() {
  var res = await supabase
    .from('academic_departments')
    .select('id, department_name')
    .order('department_name', { ascending: true });
  departments = res.data || [];
  var select = $('subject-department');
  select.innerHTML = '<option value="">\u2014 No department \u2014</option>' +
    departments.map(function (d) {
      return '<option value="' + esc(d.id) + '">' + esc(d.department_name) + '</option>';
    }).join('');
}

function deptName(id) {
  var d = departments.find(function (x) { return x.id === id; });
  return d ? d.department_name : '\u2014';
}

async function loadSubjects() {
  var tbody = $('subjects-tbody');
  var res = await supabase
    .from('subjects')
    .select('id, department_id, subject_name, grade_start, grade_end')
    .order('subject_name', { ascending: true });

  if (res.error) {
    tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">Could not load subjects.</td></tr>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">No subjects yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function (s) {
    return '<tr>' +
      '<td data-label="Subject">' + esc(s.subject_name) + '</td>' +
      '<td data-label="Department">' + esc(deptName(s.department_id)) + '</td>' +
      '<td data-label="Grades">' + esc(gradeLabel(s.grade_start, s.grade_end)) + '</td>' +
      '<td data-label="Actions"><div class="admin-table__actions">' +
        '<button class="btn btn--outline btn--sm" data-edit-subject="' + esc(s.id) + '">Edit</button>' +
        '<button class="btn btn--danger btn--sm" data-del-subject="' + esc(s.id) + '">Delete</button>' +
      '</div></td></tr>';
  }).join('');
}

function resetSubjectForm() {
  $('subject-id').value = '';
  $('subject-form').reset();
  $('subject-form-title').textContent = 'Add subject';
  $('subject-submit').textContent = 'Add subject';
  $('subject-cancel').hidden = true;
}

$('subject-cancel').addEventListener('click', resetSubjectForm);

$('subject-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errEl = $('subject-error');
  errEl.hidden = true;

  var payload = {
    subject_name: $('subject-name').value.trim(),
    department_id: $('subject-department').value || null,
    grade_start: $('subject-grade-start').value ? parseInt($('subject-grade-start').value, 10) : null,
    grade_end: $('subject-grade-end').value ? parseInt($('subject-grade-end').value, 10) : null,
    description: $('subject-description').value.trim() || null
  };

  var id = $('subject-id').value;
  var res = id
    ? await supabase.from('subjects').update(payload).eq('id', id)
    : await supabase.from('subjects').insert(payload);

  if (res.error) {
    showMsg(errEl, res.error.message, true);
    return;
  }
  resetSubjectForm();
  showMsg($('global-msg'), id ? 'Subject updated.' : 'Subject added.', false);
  await loadSubjects();
  await refreshManagedPreviews();
});

$('subjects-tbody').addEventListener('click', async function (e) {
  var editButton = e.target.closest('[data-edit-subject]');
  var deleteButton = e.target.closest('[data-del-subject]');
  var editId = editButton && editButton.getAttribute('data-edit-subject');
  var delId = deleteButton && deleteButton.getAttribute('data-del-subject');

  if (editId) {
    var res = await supabase.from('subjects').select('*').eq('id', editId).single();
    if (res.error || !res.data) return;
    var s = res.data;
    $('subject-id').value = s.id;
    $('subject-name').value = s.subject_name || '';
    $('subject-department').value = s.department_id || '';
    $('subject-grade-start').value = s.grade_start || '';
    $('subject-grade-end').value = s.grade_end || '';
    $('subject-description').value = s.description || '';
    $('subject-form-title').textContent = 'Edit subject';
    $('subject-submit').textContent = 'Save changes';
    $('subject-cancel').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (delId) {
    if (!window.confirm('Delete this subject? This cannot be undone.')) return;
    var del = await supabase.from('subjects').delete().eq('id', delId);
    if (del.error) { showMsg($('subject-error'), del.error.message, true); return; }
    showMsg($('global-msg'), 'Subject deleted.', false);
    await loadSubjects();
    await refreshManagedPreviews();
  }
});

/* =========================================================
   TIMETABLES
   ========================================================= */
async function loadTimetables() {
  var tbody = $('timetables-tbody');
  var res = await supabase
    .from('timetables')
    .select('id, grade, file_url')
    .order('grade', { ascending: true });

  if (res.error) {
    tbody.innerHTML = '<tr><td colspan="3" class="admin-empty">Could not load timetables.</td></tr>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="admin-empty">No timetables yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function (t) {
    var fileCell = t.file_url
      ? '<a href="' + esc(t.file_url) + '" target="_blank" rel="noopener" style="color:var(--green-forest);font-weight:600;">View file</a>'
      : '\u2014';
    return '<tr>' +
      '<td data-label="Grade">' + esc(t.grade || '\u2014') + '</td>' +
      '<td data-label="File">' + fileCell + '</td>' +
      '<td data-label="Actions"><div class="admin-table__actions">' +
        '<button class="btn btn--outline btn--sm" data-edit-timetable="' + esc(t.id) + '">Edit</button>' +
        '<button class="btn btn--danger btn--sm" data-del-timetable="' + esc(t.id) + '">Delete</button>' +
      '</div></td></tr>';
  }).join('');
}

function resetTimetableForm() {
  $('timetable-id').value = '';
  $('timetable-form').reset();
  $('timetable-form-title').textContent = 'Add timetable';
  $('timetable-submit').textContent = 'Add timetable';
  $('timetable-cancel').hidden = true;
}

$('timetable-cancel').addEventListener('click', resetTimetableForm);

$('timetable-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var errEl = $('timetable-error');
  errEl.hidden = true;

  var payload = {
    grade: $('timetable-grade').value.trim(),
    file_url: $('timetable-file').value.trim() || null
  };

  var id = $('timetable-id').value;
  var res = id
    ? await supabase.from('timetables').update(payload).eq('id', id)
    : await supabase.from('timetables').insert(payload);

  if (res.error) {
    showMsg(errEl, res.error.message, true);
    return;
  }
  resetTimetableForm();
  showMsg($('global-msg'), id ? 'Timetable updated.' : 'Timetable added.', false);
  await loadTimetables();
  await refreshManagedPreviews();
});

$('timetables-tbody').addEventListener('click', async function (e) {
  var editButton = e.target.closest('[data-edit-timetable]');
  var deleteButton = e.target.closest('[data-del-timetable]');
  var editId = editButton && editButton.getAttribute('data-edit-timetable');
  var delId = deleteButton && deleteButton.getAttribute('data-del-timetable');

  if (editId) {
    var res = await supabase.from('timetables').select('*').eq('id', editId).single();
    if (res.error || !res.data) return;
    var t = res.data;
    $('timetable-id').value = t.id;
    $('timetable-grade').value = t.grade || '';
    $('timetable-file').value = t.file_url || '';
    $('timetable-form-title').textContent = 'Edit timetable';
    $('timetable-submit').textContent = 'Save changes';
    $('timetable-cancel').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (delId) {
    if (!window.confirm('Delete this timetable? This cannot be undone.')) return;
    var del = await supabase.from('timetables').delete().eq('id', delId);
    if (del.error) { showMsg($('timetable-error'), del.error.message, true); return; }
    showMsg($('global-msg'), 'Timetable deleted.', false);
    await loadTimetables();
    await refreshManagedPreviews();
  }
});

/* =========================================================
   GENERIC SITE CONTENT MANAGER
   ========================================================= */
var contentConfigs = {
  homepage_content: { label: 'Home — main content', singleton: true, fields: [['hero_title','Hero title'],['hero_subtitle','Hero subtitle'],['welcome_message','Welcome message','textarea'],['principal_message','Principal message','textarea'],['cta_primary','Primary button'],['cta_primary_link','Primary button link'],['cta_secondary','Secondary button'],['cta_secondary_link','Secondary button link']] },
  homepage_slides: { label: 'Home — slides', fields: [['title','Title'],['description','Description','textarea'],['image_url','Image URL','url'],['display_order','Display order','number'],['is_active','Active','checkbox']] },
  homepage_statistics: { label: 'Home — statistics', fields: [['title','Title'],['value','Value'],['icon','Icon name'],['display_order','Display order','number']] },
  school_information: { label: 'About — school information', singleton: true, fields: [['school_name','School name'],['motto','Motto'],['history','History','textarea'],['vision','Vision','textarea'],['mission','Mission','textarea'],['principal_name','Principal name'],['principal_message','Principal message','textarea'],['school_email','Email','email'],['school_phone','Phone'],['school_address','Address','textarea']] },
  leadership_team: { label: 'About — leadership team', fields: [['name','Name'],['position','Position'],['photo_url','Photo URL','url'],['email','Email','email'],['bio','Biography','textarea'],['display_order','Display order','number']] },
  academic_departments: { label: 'Academics — departments', fields: [['department_name','Department name'],['description','Description','textarea'],['head_of_department','Head of department']] },
  academic_calendar: { label: 'Academics — calendar', fields: [['title','Title'],['description','Description','textarea'],['start_date','Start date','date'],['end_date','End date','date'],['category','Category']] },
  news_categories: { label: 'News — categories', fields: [['name','Category name']] },
  news_articles: { label: 'News — articles', fields: [['category_id','Category','relation','news_categories','name'],['title','Title'],['slug','Slug'],['summary','Summary','textarea'],['content','Content','textarea'],['featured_image','Featured image URL','url'],['author','Author'],['published_at','Published date','datetime-local'],['is_featured','Featured','checkbox']], titleField: 'title', subtitleField: 'summary' },
  events: { label: 'Events — calendar', fields: [['title','Title'],['description','Description','textarea'],['event_date','Event date','datetime-local'],['location','Location'],['image_url','Image URL','url'],['registration_required','Registration required','checkbox']], titleField: 'title', subtitleField: 'event_date' },
  gallery_categories: { label: 'Gallery — categories', fields: [['name','Category name']] },
  gallery_images: { label: 'Gallery — images', fields: [['category_id','Category','relation','gallery_categories','name'],['title','Title'],['image_url','Image URL','url']], titleField: 'title', subtitleField: 'image_url' },
  admissions_information: { label: 'Admissions — information', singleton: true, fields: [['overview','Overview','textarea'],['requirements','Requirements (separate with commas or new lines)','textarea'],['application_process','Application process (separate steps with new lines)','textarea'],['application_open','Applications open','checkbox'],['application_deadline','Application deadline','date']], titleField: 'overview', subtitleField: 'application_deadline' },
  downloads: { label: 'Admissions & News — downloads', fields: [['title','Title'],['description','Description','textarea'],['file_url','File URL','url'],['category','Category']], titleField: 'title', subtitleField: 'category' },
  contact_messages: { label: 'Contact — messages', updateOnly: true, fields: [['is_read','Mark as read','checkbox']], titleField: 'subject', subtitleField: 'message' },
  technical_subjects: { label: 'Technical — subjects', fields: [['subject_name','Subject name'],['description','Description','textarea'],['career_path','Career path','textarea'],['image_url','Image URL','url']] },
  workshop_projects: { label: 'Technical — workshop projects', fields: [['subject_id','Technical subject','relation','technical_subjects','subject_name'],['title','Title'],['description','Description','textarea'],['image_url','Image URL','url'],['project_date','Project date','date']] },
  sports: { label: 'Sports — programmes', fields: [['sport_name','Sport name'],['description','Description','textarea'],['coach_name','Coach name'],['image_url','Image URL','url']] },
  cultural_activities: { label: 'Sports — cultural activities', fields: [['activity_name','Activity name'],['description','Description','textarea'],['facilitator','Facilitator'],['image_url','Image URL','url']] },
  achievements: { label: 'Sports — achievements', fields: [['title','Title'],['description','Description','textarea'],['achievement_date','Achievement date','date'],['category','Category'],['image_url','Image URL','url']] },
  fixtures: { label: 'Sports — fixtures and results', fields: [['sport_id','Sport','relation','sports','sport_name'],['opponent','Opponent'],['fixture_date','Fixture date','datetime-local'],['venue','Venue'],['result','Result'],['status','Status']] }
};
var contentInitialized = false;
var currentContentRows = [];

function initializeContentManager() {
  if (contentInitialized) return;
  contentInitialized = true;
  var select = $('content-type');
  select.innerHTML = Object.keys(contentConfigs).map(function (table) {
    return '<option value="' + esc(table) + '">' + esc(contentConfigs[table].label) + '</option>';
  }).join('');
  select.addEventListener('change', loadContentManager);
  $('content-form').addEventListener('submit', saveManagedContent);
  $('content-cancel').addEventListener('click', resetContentForm);
  $('content-list').addEventListener('click', handleContentAction);
  loadContentManager();
}

function inputId(name) { return 'managed-' + name; }

async function renderContentFields(config) {
  var html = [];
  for (var i = 0; i < config.fields.length; i += 1) {
    var field = config.fields[i];
    var name = field[0], label = field[1], type = field[2] || 'text';
    var control;
    if (type === 'textarea') control = '<textarea id="' + inputId(name) + '"></textarea>';
    else if (type === 'checkbox') control = '<input type="checkbox" id="' + inputId(name) + '">';
    else if (type === 'relation') {
      var relation = await supabase.from(field[3]).select('id,' + field[4]).order(field[4]);
      control = '<select id="' + inputId(name) + '"><option value="">— None —</option>' + (relation.data || []).map(function (item) {
        return '<option value="' + esc(item.id) + '">' + esc(item[field[4]]) + '</option>';
      }).join('') + '</select>';
    } else control = '<input type="' + esc(type) + '" id="' + inputId(name) + '">';
    html.push('<div class="admin-field"><label for="' + inputId(name) + '">' + esc(label) + '</label>' + control + '</div>');
  }
  $('content-fields').innerHTML = html.join('');
}

async function loadContentManager() {
  var table = $('content-type').value;
  var config = contentConfigs[table];
  resetContentForm();
  await renderContentFields(config);
  $('content-list-title').textContent = config.label;
  updateRelatedPageControls(table);
  if (!$('admin-split-preview').hidden) loadSplitPreview();
  var result = await supabase.from(table).select('*').order(config.fields[0][0], { ascending: true });
  if (result.error) {
    $('content-list').innerHTML = '<p class="admin-empty">Could not load this content: ' + esc(result.error.message) + '</p>';
    return;
  }
  currentContentRows = result.data || [];
  $('content-form').hidden = Boolean(config.updateOnly);
  if (!currentContentRows.length) {
    $('content-list').innerHTML = '<p class="admin-empty">No content has been added yet.</p>';
    return;
  }
  $('content-list').innerHTML = currentContentRows.map(function (row) {
    var title = row[config.titleField || config.fields[0][0]] || (table === 'contact_messages' ? 'General enquiry' : 'Content record');
    var subtitle = row[config.subtitleField || (config.fields[1] ? config.fields[1][0] : 'id')] || '';
    var status = table === 'contact_messages' ? (row.is_read ? 'Read · ' : 'Unread · ') : '';
    if (table === 'contact_messages') subtitle = status + (row.name || 'Unknown sender') + (row.email ? ' · ' + row.email : '') + (row.phone ? ' · ' + row.phone : '') + ' — ' + (row.message || '');
    else subtitle = status + subtitle;
    return '<div class="achievement-row"><div><h3>' + esc(title) + '</h3><p>' + esc(subtitle) + '</p></div><div class="admin-table__actions"><button class="btn btn--outline btn--sm" data-content-edit="' + esc(row.id) + '">' + (table === 'contact_messages' ? 'Review' : 'Edit') + '</button><button class="btn btn--danger btn--sm" data-content-delete="' + esc(row.id) + '">Delete</button></div></div>';
  }).join('');
  if (config.singleton && currentContentRows[0]) editManagedContent(currentContentRows[0].id);
}

function resetContentForm() {
  $('content-id').value = '';
  $('content-form').reset();
  var config = contentConfigs[$('content-type').value];
  $('content-form-title').textContent = config ? 'Add ' + config.label : 'Add content';
  $('content-submit').textContent = 'Add content';
  $('content-cancel').hidden = true;
  $('content-error').hidden = true;
}

function editManagedContent(id) {
  var config = contentConfigs[$('content-type').value];
  var row = currentContentRows.find(function (item) { return item.id === id; });
  if (!row) return;
  $('content-id').value = row.id;
  $('content-form').hidden = false;
  config.fields.forEach(function (field) {
    var input = $(inputId(field[0]));
    if (!input) return;
    if ((field[2] || '') === 'checkbox') input.checked = Boolean(row[field[0]]);
    else if ((field[2] || '') === 'datetime-local' && row[field[0]]) input.value = String(row[field[0]]).slice(0, 16);
    else input.value = row[field[0]] == null ? '' : row[field[0]];
  });
  $('content-form-title').textContent = 'Edit ' + config.label;
  $('content-submit').textContent = 'Save changes';
  $('content-cancel').hidden = Boolean(config.singleton);
}

async function refreshManagedPreviews() {
  previewLoaded = false;
  await loadPreviewDashboard(true);
  if (!$('admin-split-preview').hidden) loadSplitPreview();
  if ($('preview-dialog').open) openPreview(sitePages[activePageIndex].key);
}

async function saveManagedContent(event) {
  event.preventDefault();
  var table = $('content-type').value;
  var config = contentConfigs[table];
  var submit = $('content-submit');
  var payload = {};
  config.fields.forEach(function (field) {
    var input = $(inputId(field[0]));
    var type = field[2] || 'text';
    if (type === 'checkbox') payload[field[0]] = input.checked;
    else if (type === 'number') payload[field[0]] = input.value ? Number(input.value) : null;
    else payload[field[0]] = input.value.trim() || null;
  });
  var id = $('content-id').value;
  submit.disabled = true;
  submit.textContent = id ? 'Saving changes…' : 'Adding content…';
  $('content-error').hidden = true;
  var result = id ? await supabase.from(table).update(payload).eq('id', id) : await supabase.from(table).insert(payload);
  submit.disabled = false;
  if (result.error) {
    submit.textContent = id ? 'Save changes' : 'Add content';
    showMsg($('content-error'), result.error.message, true);
    return;
  }
  showMsg($('global-msg'), id ? 'Content updated.' : 'Content added.', false);
  await loadContentManager();
  await refreshManagedPreviews();
}

async function handleContentAction(event) {
  var editButton = event.target.closest('[data-content-edit]');
  var deleteButton = event.target.closest('[data-content-delete]');
  if (editButton) {
    editManagedContent(editButton.getAttribute('data-content-edit'));
    $('content-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (deleteButton) {
    if (!window.confirm('Delete this content record? This cannot be undone.')) return;
    deleteButton.disabled = true;
    deleteButton.textContent = 'Deleting…';
    var result = await supabase.from($('content-type').value).delete().eq('id', deleteButton.getAttribute('data-content-delete'));
    if (result.error) {
      deleteButton.disabled = false;
      deleteButton.textContent = 'Delete';
      showMsg($('content-error'), result.error.message, true);
      return;
    }
    showMsg($('global-msg'), 'Content deleted.', false);
    await loadContentManager();
    await refreshManagedPreviews();
  }
}

/* =========================================================
   PAGE PREVIEW CENTER
   ========================================================= */
var sitePages = [
  { key: 'home', name: 'Home', route: 'index.html', tables: ['homepage_content','homepage_slides','homepage_statistics','events','news_articles'] },
  { key: 'about', name: 'About Us', route: 'about.html', tables: ['school_information','leadership_team'] },
  { key: 'academics', name: 'Academics', route: 'academics.html', tables: ['academic_departments','academic_calendar','subjects','timetables'] },
  { key: 'technical', name: 'Technical Subjects', route: 'technical.html', tables: ['technical_subjects','workshop_projects'] },
  { key: 'sports', name: 'Sports & Culture', route: 'sports-culture.html', tables: ['sports','cultural_activities','achievements','fixtures'] },
  { key: 'news', name: 'News', route: 'news.html', tables: ['news_categories','news_articles','downloads'] },
  { key: 'gallery', name: 'Gallery', route: 'gallery.html', tables: ['gallery_categories','gallery_images'] },
  { key: 'admissions', name: 'Admissions', route: 'admissions.html', tables: ['admissions_information','downloads'] },
  { key: 'contact', name: 'Contact Us', route: 'contact.html', tables: ['school_information','contact_messages'] }
];
var tablePageMap = {};
sitePages.forEach(function (page) { page.tables.forEach(function (table) { if (!tablePageMap[table]) tablePageMap[table] = page.key; }); });
tablePageMap.downloads = 'admissions';
var pageRecords = {};
var activePageIndex = 0;
var previewLoaded = false;
var lastPreviewFocus = null;

function pageByKey(key) { return sitePages.find(function (page) { return page.key === key; }) || sitePages[0]; }
function routeUrl(route) { return new URL(route, window.location.href).href; }
function allPageRows(page) { return page.tables.reduce(function (rows, table) { return rows.concat(pageRecords[table] || []); }, []); }
function hasUsefulValue(value) { return value !== null && value !== undefined && String(value).trim() !== ''; }
function validLink(value) { try { new URL(value, window.location.href); return true; } catch (error) { return false; } }

async function loadPreviewDashboard(force) {
  if (previewLoaded && !force) return;
  previewLoaded = true;
  $('preview-pages').innerHTML = '<p class="admin-empty">Loading page information…</p>';
  var tables = [];
  sitePages.forEach(function (page) { page.tables.forEach(function (table) { if (tables.indexOf(table) < 0) tables.push(table); }); });
  await Promise.all(tables.map(async function (table) {
    var result = await supabase.from(table).select('*');
    pageRecords[table] = result.error ? [] : (result.data || []);
    pageRecords[table]._error = result.error ? result.error.message : '';
  }));
  renderPreviewDashboard();
}

function pageHealth(page) {
  var rows = allPageRows(page);
  var issues = [];
  var hidden = 0;
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (key) {
      var value = row[key];
      if ((key.indexOf('image') >= 0 || key.indexOf('photo') >= 0) && !hasUsefulValue(value)) issues.push('Missing image');
      if ((key.indexOf('url') >= 0 || key.indexOf('link') >= 0) && hasUsefulValue(value) && !validLink(value)) issues.push('Invalid link');
    });
    if (row.is_active === false || row.is_published === false || row.published === false) hidden += 1;
  });
  if (!rows.length) issues.push('No managed content');
  return { rows: rows.length, issues: Array.from(new Set(issues)), hidden: hidden, status: issues.length ? 'Review' : 'Healthy' };
}

function latestDate(page) {
  var dates = [];
  allPageRows(page).forEach(function (row) {
    ['updated_at','created_at','published_at','event_date','project_date'].forEach(function (key) {
      if (row[key] && !isNaN(Date.parse(row[key]))) dates.push(new Date(row[key]));
    });
  });
  if (!dates.length) return 'Not available';
  dates.sort(function (a, b) { return b - a; });
  return dates[0].toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderPreviewDashboard(query) {
  query = String(query || '').trim().toLowerCase();
  var matched = sitePages.filter(function (page) {
    if (!query) return true;
    var content = [page.name, page.route].concat(page.tables).concat(allPageRows(page).map(function (row) { return Object.values(row).join(' '); })).join(' ').toLowerCase();
    return content.indexOf(query) >= 0;
  });
  var totalRecords = sitePages.reduce(function (sum, page) { return sum + pageHealth(page).rows; }, 0);
  var reviewCount = sitePages.filter(function (page) { return pageHealth(page).status === 'Review'; }).length;
  $('preview-summary').innerHTML = '<div><strong>' + sitePages.length + '</strong><span>Public pages</span></div><div><strong>' + totalRecords + '</strong><span>Managed records</span></div><div><strong>' + (sitePages.length - reviewCount) + '</strong><span>Healthy pages</span></div><div><strong>' + reviewCount + '</strong><span>Need review</span></div>';
  $('preview-search-count').textContent = query ? matched.length + ' page' + (matched.length === 1 ? '' : 's') : '';
  $('preview-updated').textContent = 'Content check completed ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('preview-pages').innerHTML = matched.length ? matched.map(function (page) {
    var health = pageHealth(page);
    return '<article class="preview-page-card"><div class="preview-page-card__top"><span class="preview-page-index">' + String(sitePages.indexOf(page) + 1).padStart(2, '0') + '</span><span class="preview-status preview-status--' + health.status.toLowerCase() + '">' + health.status + '</span></div><h3>' + esc(page.name) + '</h3><p>/' + esc(page.route) + '</p><dl><div><dt>Records</dt><dd>' + health.rows + '</dd></div><div><dt>Updated</dt><dd>' + esc(latestDate(page)) + '</dd></div></dl>' + (health.issues.length ? '<p class="preview-issue">' + esc(health.issues.join(' · ')) + '</p>' : '<p class="preview-good">No content issues detected</p>') + '<div class="admin-actions preview-card-actions"><button class="btn btn--primary btn--sm" data-open-preview="' + page.key + '">Preview</button><button class="btn btn--outline btn--sm" data-manage-page="' + page.key + '">Manage</button><button class="btn btn--outline btn--sm" data-add-page="' + page.key + '">Add</button><a class="btn btn--outline btn--sm" href="' + esc(page.route) + '" target="_blank" rel="noopener">Live</a></div></article>';
  }).join('') : '<div class="admin-card preview-empty"><h3>No matching pages</h3><p>Try a page name, section, article, event, or subject.</p></div>';
  $('preview-sitemap').innerHTML = '<div class="sitemap-home">Ogwini CTHS</div><div class="sitemap-branches">' + matched.map(function (page) { return '<button type="button" data-open-preview="' + page.key + '"><strong>' + esc(page.name) + '</strong><span>' + page.tables.length + ' content sources</span></button>'; }).join('') + '</div>';
}

function previewMetaHtml(page) {
  var health = pageHealth(page);
  return '<div class="preview-meta__section"><span class="preview-status preview-status--' + health.status.toLowerCase() + '">' + health.status + '</span><h3>Page details</h3><dl><div><dt>Route</dt><dd>/' + esc(page.route) + '</dd></div><div><dt>Managed records</dt><dd>' + health.rows + '</dd></div><div><dt>Last updated</dt><dd>' + esc(latestDate(page)) + '</dd></div><div><dt>Hidden records</dt><dd>' + health.hidden + '</dd></div></dl></div><div class="preview-meta__section"><h3>Edit page sections</h3><div class="preview-section-actions">' + page.tables.map(function (table) { return '<button type="button" class="preview-section-button" data-manage-table="' + esc(table) + '" data-manage-page="' + page.key + '"><span>' + esc((contentConfigs[table] && contentConfigs[table].label) || table.replace(/_/g, ' ')) + '</span><strong>' + (pageRecords[table] || []).length + '</strong></button>'; }).join('') + '</div></div><div class="preview-meta__section"><h3>Health notes</h3><p>' + esc(health.issues.length ? health.issues.join('. ') : 'All available managed content checks passed.') + '</p></div>';
}

function openPreview(key) {
  var page = pageByKey(key);
  activePageIndex = sitePages.indexOf(page);
  lastPreviewFocus = document.activeElement;
  $('preview-dialog-title').textContent = page.name;
  $('preview-live-link').href = page.route;
  $('preview-meta').innerHTML = previewMetaHtml(page);
  $('preview-loading').hidden = false;
  $('preview-frame').src = routeUrl(page.route) + '?preview=' + Date.now();
  if (!$('preview-dialog').open) $('preview-dialog').showModal();
}
function navigatePreview(direction) { activePageIndex = (activePageIndex + direction + sitePages.length) % sitePages.length; openPreview(sitePages[activePageIndex].key); }
function closePreview() { $('preview-dialog').close(); if (lastPreviewFocus) lastPreviewFocus.focus(); }

function preferredPageTable(page, addNew) {
  var editable = page.tables.filter(function (table) { return table === 'subjects' || table === 'timetables' || Boolean(contentConfigs[table]); });
  if (!addNew) return editable[0];
  return editable.find(function (table) {
    if (table === 'subjects' || table === 'timetables') return true;
    return !contentConfigs[table].singleton && !contentConfigs[table].updateOnly;
  }) || editable[0];
}

async function managePageContent(pageKey, table, addNew) {
  var page = pageByKey(pageKey);
  table = table || preferredPageTable(page, addNew);
  if (!table) {
    showMsg($('global-msg'), 'This page does not have an editable content section.', true);
    return;
  }
  if ($('preview-dialog').open) $('preview-dialog').close();
  $('admin-manage-context').hidden = false;
  $('admin-manage-page').textContent = page.name;
  $('admin-manage-context').setAttribute('data-page-key', page.key);
  if (table === 'subjects') {
    activateAdminTab('subjects');
    if (addNew) resetSubjectForm();
    $('subject-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (table === 'timetables') {
    activateAdminTab('timetables');
    if (addNew) resetTimetableForm();
    $('timetable-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  activateAdminTab('content');
  $('content-type').value = table;
  await loadContentManager();
  if (addNew && !contentConfigs[table].singleton && !contentConfigs[table].updateOnly) resetContentForm();
  var split = $('admin-split-preview');
  if (split.hidden) {
    split.hidden = false;
    $('split-preview-btn').setAttribute('aria-pressed', 'true');
    $('split-preview-btn').textContent = 'Close preview';
    $('admin-editor-layout').classList.add('is-split');
  }
  loadSplitPreview();
  $('content-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateRelatedPageControls(table) {
  var page = pageByKey(tablePageMap[table]);
  $('related-page-btn').textContent = 'View ' + page.name;
  $('related-page-btn').setAttribute('data-related-page', page.key);
}
function loadSplitPreview() {
  var page = pageByKey(tablePageMap[$('content-type').value]);
  $('split-preview-frame').src = routeUrl(page.route) + '?draft=' + Date.now();
  $('draft-preview-note').hidden = false;
}
function patchDraftPreview() {
  var frame = $('split-preview-frame');
  if (frame.hidden || !frame.contentDocument) return;
  var config = contentConfigs[$('content-type').value];
  var textNodes = Array.from(frame.contentDocument.querySelectorAll('h1,h2,h3,h4,p,a,span,li'));
  var textIndex = 0;
  config.fields.forEach(function (field) {
    var input = $(inputId(field[0]));
    if (!input || input.type === 'checkbox' || !hasUsefulValue(input.value)) return;
    var name = field[0];
    if (name.indexOf('image') >= 0 || name.indexOf('photo') >= 0) {
      var image = frame.contentDocument.querySelector('main img, .hero img');
      if (image) image.src = input.value;
    } else if (name.indexOf('link') >= 0 || name.indexOf('url') >= 0) {
      var link = frame.contentDocument.querySelector('main a');
      if (link && validLink(input.value)) link.href = input.value;
    } else if (textIndex < textNodes.length) {
      textNodes[textIndex].textContent = input.value;
      textIndex += 1;
    }
  });
}

$('preview-pages').addEventListener('click', function (event) {
  var previewButton = event.target.closest('[data-open-preview]');
  var manageButton = event.target.closest('[data-manage-page]');
  var addButton = event.target.closest('[data-add-page]');
  if (previewButton) openPreview(previewButton.getAttribute('data-open-preview'));
  else if (addButton) managePageContent(addButton.getAttribute('data-add-page'), null, true);
  else if (manageButton) managePageContent(manageButton.getAttribute('data-manage-page'));
});
$('preview-sitemap').addEventListener('click', function (event) { var key = event.target.closest('[data-open-preview]'); if (key) openPreview(key.getAttribute('data-open-preview')); });
$('preview-meta').addEventListener('click', function (event) {
  var button = event.target.closest('[data-manage-table]');
  if (button) managePageContent(button.getAttribute('data-manage-page'), button.getAttribute('data-manage-table'));
});
$('preview-search').addEventListener('input', function () { renderPreviewDashboard(this.value); });
document.querySelectorAll('[data-preview-view]').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('[data-preview-view]').forEach(function (item) { item.classList.remove('is-active'); }); button.classList.add('is-active'); var map = button.getAttribute('data-preview-view') === 'map'; $('preview-pages').hidden = map; $('preview-sitemap').hidden = !map; }); });
$('preview-close').addEventListener('click', closePreview);
$('preview-dialog').addEventListener('click', function (event) { if (event.target === $('preview-dialog')) closePreview(); });
$('preview-frame').addEventListener('load', function () { $('preview-loading').hidden = true; });
$('preview-prev').addEventListener('click', function () { navigatePreview(-1); });
$('preview-next').addEventListener('click', function () { navigatePreview(1); });
$('preview-refresh').addEventListener('click', async function () { previewLoaded = false; await loadPreviewDashboard(true); openPreview(sitePages[activePageIndex].key); });
$('preview-manage').addEventListener('click', function () { managePageContent(sitePages[activePageIndex].key); });
$('return-to-preview').addEventListener('click', function () {
  var key = $('admin-manage-context').getAttribute('data-page-key') || 'home';
  $('admin-manage-context').hidden = true;
  activateAdminTab('preview');
  openPreview(key);
});
document.querySelectorAll('[data-device]').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('[data-device]').forEach(function (item) { item.classList.remove('is-active'); }); button.classList.add('is-active'); $('preview-frame').style.width = button.getAttribute('data-device') + 'px'; }); });
$('related-page-btn').addEventListener('click', function () { openPreview(this.getAttribute('data-related-page')); });
$('split-preview-btn').addEventListener('click', function () { var panel = $('admin-split-preview'); panel.hidden = !panel.hidden; this.setAttribute('aria-pressed', String(!panel.hidden)); this.textContent = panel.hidden ? 'Split preview' : 'Close preview'; $('admin-editor-layout').classList.toggle('is-split', !panel.hidden); if (!panel.hidden) loadSplitPreview(); else $('draft-preview-note').hidden = true; });
$('split-refresh-btn').addEventListener('click', loadSplitPreview);
$('split-preview-frame').addEventListener('load', patchDraftPreview);
$('content-fields').addEventListener('input', patchDraftPreview);
$('content-fields').addEventListener('change', patchDraftPreview);

/* ---------- init ---------- */
refreshSession();
