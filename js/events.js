import { supabase } from './supabase-client.js';

const upcomingContainer = document.getElementById('upcoming-events');
const pastContainer = document.getElementById('past-events');
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const formatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function renderEvent(event) {
  const date = event.event_date ? new Date(event.event_date) : null;
  const day = date ? date.toLocaleDateString('en-ZA', { day: '2-digit' }) : '--';
  const month = date ? date.toLocaleDateString('en-ZA', { month: 'short' }) : 'TBC';
  return `<article class="event-row">
    <div class="event-row__date"><span class="day">${esc(day)}</span><span class="month">${esc(month)}</span></div>
    <div>
      <h3 class="event-row__title">${esc(event.title)}</h3>
      <p>${esc(event.description || 'More information will be shared soon.')}</p>
      <p class="form-note">${esc(date ? formatter.format(date) : 'Date to be confirmed')}${event.location ? ` · ${esc(event.location)}` : ''}</p>
    </div>
    <span class="event-row__cat">${event.registration_required ? 'Registration required' : 'Open event'}</span>
  </article>`;
}

async function loadEvents() {
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
  if (error) {
    upcomingContainer.innerHTML = '<p class="admin-empty">Events are temporarily unavailable.</p>';
    pastContainer.innerHTML = '';
    return;
  }
  const now = new Date();
  const upcoming = (data || []).filter((item) => !item.event_date || new Date(item.event_date) >= now);
  const past = (data || []).filter((item) => item.event_date && new Date(item.event_date) < now).reverse();
  upcomingContainer.innerHTML = upcoming.length ? upcoming.map(renderEvent).join('') : '<p class="admin-empty">No upcoming events have been published.</p>';
  pastContainer.innerHTML = past.length ? past.map(renderEvent).join('') : '<p class="admin-empty">No past events are available.</p>';
}

loadEvents();
