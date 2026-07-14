/* =========================================================
   OGWINI CTHS — About page dynamic data loader
   Pulls school information (history, vision, mission,
   principal's message) and the leadership team from
   Supabase. Managed from the Admin page.
   ========================================================= */
import { supabase } from './supabase-client.js';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (w) { return w.charAt(0).toUpperCase(); })
    .join('');
}

/* Replace a container's paragraphs with DB text (split on blank lines). */
function fillProse(id, value) {
  var el = document.getElementById(id);
  if (!el || value == null || String(value).trim() === '') return;
  var paras = String(value).split(/\n{2,}|\r\n\r\n/).filter(function (p) { return p.trim(); });
  el.innerHTML = paras.map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el && value != null && String(value).trim() !== '') el.textContent = value;
}

/* ---------- School information ---------- */
async function loadSchoolInfo() {
  var res = await supabase
    .from('school_information')
    .select('history, vision, mission, principal_name, principal_message')
    .limit(1)
    .maybeSingle();

  if (res.error || !res.data) return;
  var s = res.data;
  fillProse('about-history', s.history);
  setText('about-vision', s.vision);
  setText('about-mission', s.mission);
  fillProse('about-principal-message', s.principal_message);
  if (s.principal_name) setText('about-principal-name', s.principal_name);
}

/* ---------- Leadership team ---------- */
async function loadLeadership() {
  var container = document.getElementById('leadership-container');
  if (!container) return;

  var res = await supabase
    .from('leadership_team')
    .select('name, position, photo_url, display_order')
    .order('display_order', { ascending: true });

  if (res.error) {
    container.innerHTML = '<p class="data-state">The leadership team is currently unavailable.</p>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">Leadership team members have not been published yet.</p>';
    return;
  }
  container.innerHTML = rows.map(function (p) {
    var photo = p.photo_url
      ? '<div class="person__photo"><img src="' + esc(p.photo_url) + '" alt="Portrait of ' + esc(p.name) + '"></div>'
      : '<div class="person__photo" style="display:flex;align-items:center;justify-content:center;font-family:var(--font-display,Fraunces,serif);font-size:2rem;font-weight:600;color:var(--green-forest,#0e6b3a);background:rgba(14,107,58,0.08);">' + esc(initials(p.name)) + '</div>';
    return '<div class="person reveal is-visible">' +
      photo +
      '<h3>' + esc(p.name) + '</h3>' +
      '<p class="person__role">' + esc(p.position || '') + '</p></div>';
  }).join('');
}

loadSchoolInfo();
loadLeadership();
