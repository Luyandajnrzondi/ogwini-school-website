import { supabase } from './supabase-client.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const empty = (text) => `<p class="admin-empty">${esc(text)}</p>`;

async function loadSportsContent() {
  const [sportsResult, cultureResult, achievementsResult, fixturesResult] = await Promise.all([
    supabase.from('sports').select('id, sport_name, description, coach_name, image_url').order('sport_name'),
    supabase.from('cultural_activities').select('activity_name, description, facilitator, image_url').order('activity_name'),
    supabase.from('achievements').select('title, description, achievement_date, category, image_url').order('achievement_date', { ascending: false }),
    supabase.from('fixtures').select('opponent, fixture_date, venue, result, status, sports(sport_name)').order('fixture_date', { ascending: true })
  ]);

  const sportsEl = document.getElementById('sports-list');
  sportsEl.innerHTML = sportsResult.error ? empty('Sports could not be loaded.') : (sportsResult.data?.length
    ? sportsResult.data.map((sport) => `<span class="tag-pill" title="${esc([sport.description, sport.coach_name && `Coach: ${sport.coach_name}`].filter(Boolean).join(' · '))}">${esc(sport.sport_name)}</span>`).join('')
    : empty('No sports have been published yet.'));

  const cultureEl = document.getElementById('culture-list');
  cultureEl.innerHTML = cultureResult.error ? empty('Cultural activities could not be loaded.') : (cultureResult.data?.length
    ? cultureResult.data.map((activity) => `<span class="tag-pill" title="${esc([activity.description, activity.facilitator && `Facilitator: ${activity.facilitator}`].filter(Boolean).join(' · '))}">${esc(activity.activity_name)}</span>`).join('')
    : empty('No cultural activities have been published yet.'));

  const achievementsEl = document.getElementById('achievements-list');
  achievementsEl.innerHTML = achievementsResult.error ? empty('Achievements could not be loaded.') : (achievementsResult.data?.length
    ? achievementsResult.data.map((item) => `<article class="achievement-row">
        <div class="achievement-row__year">${esc(item.achievement_date ? new Date(`${item.achievement_date}T00:00:00`).getFullYear() : '—')}</div>
        <div><h3>${esc(item.title)}</h3><p>${esc(item.description || '')}</p>${item.category ? `<p class="eyebrow">${esc(item.category)}</p>` : ''}</div>
      </article>`).join('')
    : empty('No achievements have been published yet.'));

  const fixturesEl = document.getElementById('fixtures-list');
  fixturesEl.innerHTML = fixturesResult.error ? empty('Fixtures could not be loaded.') : (fixturesResult.data?.length
    ? fixturesResult.data.map((fixture) => {
        const date = fixture.fixture_date ? new Date(fixture.fixture_date) : null;
        const sport = fixture.sports?.sport_name || 'School sport';
        const details = [fixture.opponent && `vs. ${fixture.opponent}`, fixture.venue].filter(Boolean).join(' · ');
        return `<article class="event-row">
          <div class="event-row__date"><span class="day">${esc(date ? String(date.getDate()).padStart(2, '0') : '—')}</span><span class="month">${esc(date ? date.toLocaleDateString('en-ZA', { month: 'short' }) : '')}</span></div>
          <div class="event-row__title">${esc(sport)}${details ? ` — ${esc(details)}` : ''}${fixture.result ? `<br><small>${esc(fixture.result)}</small>` : ''}</div>
          <div class="event-row__cat">${esc(fixture.status || 'Upcoming')}</div>
        </article>`;
      }).join('')
    : empty('No fixtures or results have been published yet.'));
}

loadSportsContent();
