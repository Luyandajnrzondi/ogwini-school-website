import { supabase } from './supabase-client.js';

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const paragraphs = (value) => String(value || '').split(/\n+/).filter(Boolean).map((line) => `<p>${esc(line)}</p>`).join('');
const items = (value) => String(value || '').split(/\n|,|;/).map((item) => item.trim()).filter(Boolean);

function renderProcess(value) {
  const steps = items(value);
  return steps.length ? steps.map((step, index) => `<div class="step" data-step="${String(index + 1).padStart(2, '0')}"><h3>Step ${index + 1}</h3><p>${esc(step)}</p></div>`).join('') : '<p class="admin-empty">The application process has not been published yet.</p>';
}

async function loadAdmissions() {
  const [{ data: info, error: infoError }, { data: downloads, error: downloadError }] = await Promise.all([
    supabase.from('admissions_information').select('*').limit(1).maybeSingle(),
    supabase.from('downloads').select('*').order('uploaded_at', { ascending: false })
  ]);

  if (infoError || !info) {
    document.getElementById('admissions-status').textContent = 'Admissions information is temporarily unavailable';
    document.getElementById('admissions-overview').innerHTML = '<p>Please contact the school office for current admissions information.</p>';
    document.getElementById('admissions-requirements').innerHTML = '<p>Requirements have not been published yet.</p>';
    document.getElementById('admissions-process').innerHTML = '<p class="admin-empty">The application process has not been published yet.</p>';
  } else {
    document.getElementById('admissions-status').textContent = info.application_open ? 'Applications are open' : 'Applications are currently closed';
    document.getElementById('admissions-overview').innerHTML = paragraphs(info.overview) || '<p>No admissions overview has been published.</p>';
    document.getElementById('admissions-requirements').innerHTML = items(info.requirements).length
      ? `<div class="doc-checklist">${items(info.requirements).map((item) => `<div class="doc-item"><span aria-hidden="true">✓</span><span>${esc(item)}</span></div>`).join('')}</div>`
      : '<p>Requirements have not been published yet.</p>';
    document.getElementById('admissions-process').innerHTML = renderProcess(info.application_process);
    document.getElementById('admissions-deadline').textContent = info.application_deadline
      ? `Application deadline: ${new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${info.application_deadline}T00:00:00`))}`
      : 'No application deadline has been announced.';
    document.getElementById('admissions-actions').innerHTML = info.application_open
      ? '<a href="contact.html" class="btn btn--primary">Contact Admissions</a>'
      : '<a href="contact.html" class="btn btn--outline">Ask About Admissions</a>';
  }

  const relevant = (downloads || []).filter((item) => /admission|application|prospectus/i.test(`${item.category || ''} ${item.title || ''}`));
  const container = document.getElementById('admissions-downloads');
  if (downloadError) container.innerHTML = '<p class="admin-empty">Downloads are temporarily unavailable.</p>';
  else if (!relevant.length) container.innerHTML = '<p class="admin-empty">No admissions resources have been published yet.</p>';
  else container.innerHTML = relevant.map((item) => `<div class="download-card"><div class="download-card__meta"><div><h3>${esc(item.title)}</h3><p>${esc(item.description || item.category || 'Admissions resource')}</p></div></div><a href="${esc(item.file_url)}" class="btn btn--outline" target="_blank" rel="noopener">Download</a></div>`).join('');
}

loadAdmissions();
