/* =========================================================
   OGWINI CTHS — Academics page dynamic data loader
   Pulls Subjects (grouped by department), the Academic
   Calendar and Timetables from Supabase. Anything changed
   in the Admin page is reflected here automatically.
   ========================================================= */
import { supabase } from './supabase-client.js';

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function gradeLabel(start, end) {
  if (start && end && start !== end) return 'Gr ' + start + '\u2013' + end;
  if (start) return 'Gr ' + start;
  if (end) return 'Gr ' + end;
  return '';
}

/* ---------- Subjects grouped by department ---------- */
async function loadSubjects() {
  var container = document.getElementById('subjects-container');
  if (!container) return;

  var deptRes = await supabase
    .from('academic_departments')
    .select('id, department_name')
    .order('department_name', { ascending: true });

  var subjRes = await supabase
    .from('subjects')
    .select('id, department_id, subject_name, grade_start, grade_end')
    .order('subject_name', { ascending: true });

  if (deptRes.error || subjRes.error) {
    container.innerHTML = '<p class="data-state">Subjects are currently unavailable.</p>';
    return;
  }

  var departments = deptRes.data || [];
  var subjects = subjRes.data || [];

  if (!subjects.length) {
    container.innerHTML = '<p class="data-state">No subjects have been published yet.</p>';
    return;
  }

  // Group subjects by department id
  var byDept = {};
  subjects.forEach(function (s) {
    var key = s.department_id || 'other';
    (byDept[key] = byDept[key] || []).push(s);
  });

  var html = '';
  departments.forEach(function (dept) {
    var list = byDept[dept.id];
    if (!list || !list.length) return;
    html += renderDeptBlock(dept.department_name, list);
  });

  if (byDept.other && byDept.other.length) {
    html += renderDeptBlock('Other Subjects', byDept.other);
  }

  container.innerHTML = html || '<p class="data-state">No subjects have been published yet.</p>';
}

function renderDeptBlock(label, list) {
  var pills = list.map(function (s) {
    var g = gradeLabel(s.grade_start, s.grade_end);
    return '<span class="subject-pill">' + esc(s.subject_name) +
      (g ? ' <small class="subject-pill__grade">' + esc(g) + '</small>' : '') + '</span>';
  }).join('');
  return '<div class="subject-department reveal is-visible">' +
    '<div class="subject-department__label">' + esc(label) + '</div>' +
    '<div class="subject-department__list">' + pills + '</div></div>';
}

/* ---------- Academic calendar ---------- */
async function loadCalendar() {
  var container = document.getElementById('calendar-container');
  if (!container) return;

  var res = await supabase
    .from('academic_calendar')
    .select('id, title, category, start_date')
    .order('start_date', { ascending: true, nullsFirst: false });

  if (res.error) {
    container.innerHTML = '<p class="data-state">The calendar is currently unavailable.</p>';
    return;
  }

  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">No calendar events have been published yet.</p>';
    return;
  }

  container.innerHTML = rows.map(function (row) {
    var day = '';
    var month = '';
    if (row.start_date) {
      var d = new Date(row.start_date + 'T00:00:00');
      if (!isNaN(d)) { day = d.getDate(); month = MONTHS[d.getMonth()]; }
    }
    return '<div class="event-row">' +
      '<div class="event-row__date"><span class="day">' + esc(day) + '</span><span class="month">' + esc(month) + '</span></div>' +
      '<div class="event-row__title">' + esc(row.title) + '</div>' +
      '<div class="event-row__cat">' + esc(row.category || '') + '</div></div>';
  }).join('');
}

/* ---------- Timetables ---------- */
async function loadTimetables() {
  var container = document.getElementById('timetables-container');
  if (!container) return;

  var res = await supabase
    .from('timetables')
    .select('id, grade, file_url, uploaded_at')
    .order('grade', { ascending: true });

  if (res.error) {
    container.innerHTML = '<p class="data-state">Timetables are currently unavailable.</p>';
    return;
  }

  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">No timetables have been uploaded yet.</p>';
    return;
  }

  container.innerHTML = rows.map(function (row) {
    var label = row.grade ? esc(row.grade) : 'Timetable';
    if (row.file_url) {
      return '<a class="timetable-item" href="' + esc(row.file_url) + '" target="_blank" rel="noopener">' +
        '<span class="timetable-item__label">' + label + '</span>' +
        '<span class="timetable-item__action">Download</span></a>';
    }
    return '<div class="timetable-item"><span class="timetable-item__label">' + label + '</span></div>';
  }).join('');
}

loadSubjects();
loadCalendar();
loadTimetables();
