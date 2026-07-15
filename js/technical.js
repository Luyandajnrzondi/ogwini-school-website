import { supabase } from './supabase-client.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const message = (text) => `<p class="admin-empty">${esc(text)}</p>`;

async function loadTechnicalContent() {
  const [subjectsResult, projectsResult] = await Promise.all([
    supabase.from('technical_subjects').select('id, subject_name, description, career_path, image_url').order('subject_name'),
    supabase.from('workshop_projects').select('id, title, description, image_url, project_date, technical_subjects(subject_name)').order('project_date', { ascending: false })
  ]);

  const subjectsEl = document.getElementById('technical-subjects');
  const careersEl = document.getElementById('career-pathways');
  const projectsEl = document.getElementById('workshop-projects');
  const mediaEl = document.getElementById('project-media');

  if (subjectsResult.error) {
    subjectsEl.innerHTML = message('Technical subjects could not be loaded.');
    careersEl.innerHTML = message('Career pathways could not be loaded.');
  } else {
    const subjects = subjectsResult.data || [];
    subjectsEl.innerHTML = subjects.length ? subjects.map((subject) => `
      <article class="tech-card">
        ${subject.image_url ? `<img src="${esc(subject.image_url)}" alt="${esc(subject.subject_name)}" loading="lazy">` : ''}
        <h3>${esc(subject.subject_name)}</h3>
        <p>${esc(subject.description || 'Description coming soon.')}</p>
      </article>`).join('') : message('No technical subjects have been published yet.');

    const careers = subjects.filter((subject) => subject.career_path);
    careersEl.innerHTML = careers.length ? careers.map((subject) => `
      <div class="pathway-row">
        <div><p class="pathway-title">${esc(subject.subject_name)}</p><p class="pathway-desc">${esc(subject.career_path)}</p></div>
      </div>`).join('') : message('No career pathways have been published yet.');
  }

  if (projectsResult.error) {
    projectsEl.innerHTML = message('Workshop projects could not be loaded.');
    return;
  }
  const projects = projectsResult.data || [];
  projectsEl.innerHTML = projects.length ? projects.map((project) => `
    <article class="achievement-row">
      <div>
        <h3>${esc(project.title)}</h3>
        <p>${esc(project.description || '')}</p>
        <p class="eyebrow">${esc(project.technical_subjects?.subject_name || 'Technical project')}${project.project_date ? ` · ${esc(new Date(`${project.project_date}T00:00:00`).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short' }))}` : ''}</p>
      </div>
    </article>`).join('') : message('No workshop projects have been published yet.');

  const featured = projects.find((project) => project.image_url);
  if (featured) {
    mediaEl.hidden = false;
    mediaEl.innerHTML = `<img src="${esc(featured.image_url)}" alt="${esc(featured.title)}" loading="lazy">`;
  }
}

loadTechnicalContent();
