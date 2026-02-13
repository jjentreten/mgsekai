/**
 * Página de coleções - renderiza o grid de animes e interações
 */
const STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0,0,256,256" fill="currentColor" aria-hidden="true"><g transform="scale(0.05)"><path d="M10.2,48.6c-0.2,0 -0.4,-0.1 -0.6,-0.2c-0.3,-0.2 -0.5,-0.7 -0.4,-1.1l4.4,-16.4l-13.2,-10.7c-0.4,-0.2 -0.5,-0.7 -0.4,-1.1c0.1,-0.4 0.5,-0.7 0.9,-0.7l17,-0.9l6.1,-15.9c0.2,-0.3 0.6,-0.6 1,-0.6c0.4,0 0.8,0.3 0.9,0.6l6.1,15.9l17,0.9c0.4,0 0.8,0.3 0.9,0.7c0.1,0.4 0,0.8 -0.3,1.1l-13.2,10.7l4.4,16.4c0.1,0.4 0,0.8 -0.4,1.1c-0.3,0.2 -0.8,0.3 -1.1,0l-14.3,-9.2l-14.3,9.2c-0.2,0.2 -0.3,0.2 -0.5,0.2z"/></g></svg>';

function renderCollectionItems() {
  const grid = document.getElementById('collection-grid');
  if (!grid || typeof ANIME_COLLECTIONS === 'undefined') return;

  const stars = Array(5).fill(STAR_SVG).join('');
  grid.innerHTML = ANIME_COLLECTIONS.map((item) => `
    <a href="${item.href}" class="collection-item" data-link="${item.href}">
      <div class="collection-item__image">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>
      <div class="collection-item__title-overlay">
        <h3 class="collection-item__title">${item.title}</h3>
      </div>
      <div class="collection-item__content">
        <div class="collection-item__content-inner">
          <h3 class="collection-item__content-title">${item.title}</h3>
          <div class="collection-item__stars">${stars}</div>
          <p class="collection-item__description"><em>${item.description}</em></p>
        </div>
      </div>
    </a>
  `).join('');
}

function initCollectionPage() {
  renderCollectionItems();
  initScrollToTop();
  initCollectionHover();
}

function initScrollToTop() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;
  btn.style.display = 'none';

  window.addEventListener('scroll', () => {
    btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initCollectionHover() {
  document.querySelectorAll('.collection-item').forEach((el) => {
    el.addEventListener('mouseenter', () => el.classList.add('is-active'));
    el.addEventListener('mouseleave', () => el.classList.remove('is-active'));
    el.addEventListener('focus', () => el.classList.add('is-active'));
    el.addEventListener('blur', () => el.classList.remove('is-active'));
  });
}

document.addEventListener('DOMContentLoaded', initCollectionPage);
