/* =========================================================
   OGWINI CTHS — Home page dynamic data loader
   Pulls the hero/welcome text, statistics, latest news and
   upcoming events from Supabase. Everything shown here is
   managed from the Admin page.
   ========================================================= */
import { supabase } from './supabase-client.js';

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el && value != null && String(value).trim() !== '') {
    el.textContent = value;
  }
}

function formatDate(value) {
  if (!value) return { day: '', month: '' };
  var d = new Date(value);
  if (isNaN(d)) return { day: '', month: '' };
  return { day: d.getDate(), month: MONTHS[d.getMonth()] };
}

function longDate(value) {
  if (!value) return '';
  var d = new Date(value);
  if (isNaN(d)) return '';
  return d.getDate() + ' ' + ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] +
    ' ' + d.getFullYear();
}

/* ---------- Hero + welcome text ---------- */
async function loadHomepageContent() {
  var res = await supabase
    .from('homepage_content')
    .select('hero_title, hero_subtitle, welcome_message, principal_message')
    .from('school_information')
    .select('principal_name')
    .limit(1)
    .maybeSingle();

  if (res.error || !res.data) return;
  var c = res.data;
  setText('home-hero-title', c.hero_title);
  setText('home-hero-motto', c.hero_subtitle ? '\u201C' + c.hero_subtitle + '\u201D' : '');
  setText('home-hero-lede', c.welcome_message);
  setText('home-principal-message', c.principal_message);
  if (s.principal_name) setText('home-principal-name', s.principal_name);
}

/* ---------- Statistics ---------- */
async function loadStatistics() {
  var container = document.getElementById('home-stats');
  if (!container) return;

  var res = await supabase
    .from('homepage_statistics')
    .select('title, value, display_order')
    .order('display_order', { ascending: true });

  if (res.error) {
    container.innerHTML = '<p class="data-state">Statistics are currently unavailable.</p>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">No statistics have been published yet.</p>';
    return;
  }
  container.innerHTML = rows.map(function (row) {
    return '<div class="stat">' +
      '<span class="stat__num">' + esc(row.value) + '</span>' +
      '<p class="stat__label">' + esc(row.title) + '</p></div>';
  }).join('');
}

/* ---------- Latest news ---------- */
async function loadNews() {
  var container = document.getElementById('home-news');
  if (!container) return;

  var res = await supabase
    .from('news_articles')
    .select('title, slug, summary, published_at, news_categories(name)')
    .order('published_at', { ascending: false })
    .limit(3);

  if (res.error) {
    container.innerHTML = '<p class="data-state">News is currently unavailable.</p>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">No news has been published yet.</p>';
    return;
  }
  container.innerHTML = rows.map(function (row) {
    var cat = row.news_categories && row.news_categories.name ? row.news_categories.name : 'News';
    var link = row.slug ? 'news.html#' + esc(row.slug) : 'news.html';
    return '<article class="news-card bracket-frame reveal is-visible">' +
      '<span class="news-card__tag">' + esc(cat) + '</span>' +
      '<span class="news-card__date">' + esc(longDate(row.published_at)) + '</span>' +
      '<h3>' + esc(row.title) + '</h3>' +
      '<p>' + esc(row.summary || '') + '</p>' +
      '<a href="' + link + '" class="read-more">Read more ' +
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>' +
      '</article>';
  }).join('');
}

/* ---------- Upcoming events ---------- */
async function loadEvents() {
  var container = document.getElementById('home-events');
  if (!container) return;

  var nowIso = new Date().toISOString();
  var res = await supabase
    .from('events')
    .select('title, event_date, location')
    .gte('event_date', nowIso)
    .order('event_date', { ascending: true })
    .limit(4);

  if (res.error) {
    container.innerHTML = '<p class="data-state">Events are currently unavailable.</p>';
    return;
  }
  var rows = res.data || [];
  if (!rows.length) {
    container.innerHTML = '<p class="data-state">No upcoming events have been published yet.</p>';
    return;
  }
  container.innerHTML = rows.map(function (row) {
    var d = formatDate(row.event_date);
    return '<div class="event-row">' +
      '<div class="event-row__date"><span class="day">' + esc(d.day) + '</span><span class="month">' + esc(d.month) + '</span></div>' +
      '<div class="event-row__title">' + esc(row.title) + '</div>' +
      '<div class="event-row__cat">' + esc(row.location || 'Event') + '</div></div>';
  }).join('');
}

loadHomepageContent();
loadStatistics();
loadNews();
loadEvents();
loadSchoolInfo();
