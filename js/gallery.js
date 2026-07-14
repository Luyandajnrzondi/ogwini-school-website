import { supabase } from './supabase-client.js';

const filters = document.getElementById('gallery-filters');
const grid = document.getElementById('gallery-images');
const lightbox = document.querySelector('.lightbox');
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const slugify = (value) => String(value || 'uncategorised').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
let currentIndex = 0;

function visibleItems() {
  return [...grid.querySelectorAll('.gallery-item:not(.is-hidden)')];
}

function showAt(index) {
  const items = visibleItems();
  if (!items.length) return;
  currentIndex = (index + items.length) % items.length;
  const image = items[currentIndex].querySelector('img');
  lightbox.querySelector('img').src = image.src;
  lightbox.querySelector('img').alt = image.alt;
  lightbox.querySelector('.lightbox__cap').textContent = image.alt;
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
}

function initializeInteractions() {
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;
    filters.querySelectorAll('.filter-btn').forEach((item) => item.classList.toggle('is-active', item === button));
    grid.querySelectorAll('.gallery-item').forEach((item) => item.classList.toggle('is-hidden', button.dataset.filter !== 'all' && item.dataset.category !== button.dataset.filter));
  });
  grid.addEventListener('click', (event) => {
    const item = event.target.closest('.gallery-item');
    if (!item) return;
    currentIndex = visibleItems().indexOf(item);
    showAt(currentIndex);
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
  lightbox.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox__nav--prev').addEventListener('click', () => showAt(currentIndex - 1));
  lightbox.querySelector('.lightbox__nav--next').addEventListener('click', () => showAt(currentIndex + 1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showAt(currentIndex - 1);
    if (event.key === 'ArrowRight') showAt(currentIndex + 1);
  });
}

async function loadGallery() {
  const [{ data: categories, error: categoryError }, { data: images, error: imageError }] = await Promise.all([
    supabase.from('gallery_categories').select('id,name').order('name'),
    supabase.from('gallery_images').select('id,title,image_url,uploaded_at,category_id,gallery_categories(name)').order('uploaded_at', { ascending: false })
  ]);
  if (categoryError || imageError) {
    grid.innerHTML = `<p class="admin-empty">Gallery is temporarily unavailable. ${esc(categoryError?.message || imageError?.message)}</p>`;
    return;
  }
  filters.innerHTML = '<button class="filter-btn is-active" data-filter="all">All</button>' + (categories || []).map((category) => `<button class="filter-btn" data-filter="${esc(slugify(category.name))}">${esc(category.name)}</button>`).join('');
  if (!images?.length) {
    grid.innerHTML = '<p class="admin-empty">No gallery images have been published yet.</p>';
    return;
  }
  grid.innerHTML = images.map((image) => {
    const title = image.title || image.gallery_categories?.name || 'Ogwini school activity';
    return `<button class="gallery-item" type="button" data-category="${esc(slugify(image.gallery_categories?.name))}"><img src="${esc(image.image_url)}" alt="${esc(title)}" loading="lazy"><span class="gallery-item__cap">${esc(title)}</span></button>`;
  }).join('');
  initializeInteractions();
}

loadGallery();
