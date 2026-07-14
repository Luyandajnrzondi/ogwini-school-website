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
document.querySelectorAll('.admin-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    var name = tab.getAttribute('data-tab');
    document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('is-active'); });
    tab.classList.add('is-active');
    document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('is-active'); });
    $('panel-' + name).classList.add('is-active');
  });
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
  loadSubjects();
});

$('subjects-tbody').addEventListener('click', async function (e) {
  var editId = e.target.getAttribute('data-edit-subject');
  var delId = e.target.getAttribute('data-del-subject');

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
    loadSubjects();
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
  loadTimetables();
});

$('timetables-tbody').addEventListener('click', async function (e) {
  var editId = e.target.getAttribute('data-edit-timetable');
  var delId = e.target.getAttribute('data-del-timetable');

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
    loadTimetables();
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

async function saveManagedContent(event) {
  event.preventDefault();
  var table = $('content-type').value;
  var config = contentConfigs[table];
  var payload = {};
  config.fields.forEach(function (field) {
    var input = $(inputId(field[0]));
    var type = field[2] || 'text';
    if (type === 'checkbox') payload[field[0]] = input.checked;
    else if (type === 'number') payload[field[0]] = input.value ? Number(input.value) : null;
    else payload[field[0]] = input.value.trim() || null;
  });
  var id = $('content-id').value;
  var result = id ? await supabase.from(table).update(payload).eq('id', id) : await supabase.from(table).insert(payload);
  if (result.error) { showMsg($('content-error'), result.error.message, true); return; }
  showMsg($('global-msg'), id ? 'Content updated.' : 'Content added.', false);
  loadContentManager();
}

async function handleContentAction(event) {
  var editId = event.target.getAttribute('data-content-edit');
  var deleteId = event.target.getAttribute('data-content-delete');
  if (editId) editManagedContent(editId);
  if (deleteId) {
    if (!window.confirm('Delete this content record? This cannot be undone.')) return;
    var result = await supabase.from($('content-type').value).delete().eq('id', deleteId);
    if (result.error) { showMsg($('content-error'), result.error.message, true); return; }
    showMsg($('global-msg'), 'Content deleted.', false);
    loadContentManager();
  }
}

/* ---------- init ---------- */
refreshSession();
