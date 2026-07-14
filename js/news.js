import { supabase } from './supabase-client.js';

const container = document.getElementById('news-articles');
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : 'Date to be confirmed';

async function loadNews() {
  const { data, error } = await supabase
    .from('news_articles')
    .select('id,title,slug,summary,content,featured_image,author,published_at,is_featured,news_categories(name)')
    .order('published_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="admin-empty">News is temporarily unavailable. ${esc(error.message)}</p>`;
    return;
  }
  if (!data?.length) {
    container.innerHTML = '<p class="admin-empty">No news articles have been published yet.</p>';
    return;
  }

  container.innerHTML = data.map((article) => {
    const slug = article.slug || article.id;
    const category = article.news_categories?.name || 'School News';
    const text = article.content || article.summary || '';
    return `<article class="news-card bracket-frame reveal is-visible" id="${esc(slug)}">
      ${article.featured_image ? `<img class="news-card__image" src="${esc(article.featured_image)}" alt="${esc(article.title)}" loading="lazy">` : ''}
      <span class="news-card__tag">${esc(category)}</span>
      <span class="news-card__date">${esc(formatDate(article.published_at))}</span>
      <h3>${esc(article.title)}</h3>
      <p>${esc(text)}</p>
      ${article.author ? `<p class="form-note">By ${esc(article.author)}</p>` : ''}
    </article>`;
  }).join('');

  const requested = decodeURIComponent(window.location.hash.slice(1));
  if (requested) {
    const article = document.getElementById(requested);
    if (article) {
      article.classList.add('is-featured');
      article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

loadNews();
