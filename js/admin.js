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

/* ---------- init ---------- */
refreshSession();
