window.pixelId = "6971ae2caf494da0e99c8028";
(function () {
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
  document.head.appendChild(a);
})();
window.tikTokPixelId = "697eb4acd4886f567540c7a7";
(function () {
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel-tiktok.js");
  document.head.appendChild(a);
})();

document.addEventListener('DOMContentLoaded', () => {
  var path = window.location.pathname || '';
  if (path === '/' || path === '' || path.endsWith('index.html')) {
    try { if (typeof fbq === 'function') fbq('track', 'PageView'); } catch (_) {}
  }

  var p = new URLSearchParams(window.location.search);
  var hasTracking = p.get('utm_source') || p.get('utm_campaign') || p.get('utm_medium') || p.get('utm_content') || p.get('utm_term') || p.get('src') || p.get('sck');
  if (hasTracking) {
    try {
      sessionStorage.setItem('manga_sekai_tracking', JSON.stringify({
        src: p.get('src') || null,
        sck: p.get('sck') || null,
        utm_source: p.get('utm_source') || null,
        utm_campaign: p.get('utm_campaign') || null,
        utm_medium: p.get('utm_medium') || null,
        utm_content: p.get('utm_content') || null,
        utm_term: p.get('utm_term') || null
      }));
    } catch (_) {}
  }

  // Renderiza ícones de pagamento no rodapé (banco de dados: payment-icons.js)
  if (typeof renderPaymentIcons === 'function') {
    renderPaymentIcons('.footer__payment-list');
  }

  const menuToggle = document.getElementById('menu-toggle');
  const menuDrawer = document.getElementById('menu-drawer');
  const menuClose = document.getElementById('menu-close');
  const menuOverlay = document.getElementById('menu-overlay');

  function openMenu() {
    menuDrawer?.classList.add('is-open');
    menuOverlay?.classList.add('is-visible');
    menuToggle?.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    menuDrawer?.classList.remove('is-open');
    menuOverlay?.classList.remove('is-visible');
    menuToggle?.classList.remove('is-active');
    document.body.style.overflow = '';
  }
  menuToggle?.addEventListener('click', () => menuDrawer?.classList.contains('is-open') ? closeMenu() : openMenu());
  menuClose?.addEventListener('click', closeMenu);
  menuOverlay?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // Carrossel - mobile: 1 slide, padding 24px
  const carouselTrack = document.querySelector('.carousel__track');
  const carouselCards = document.querySelectorAll('.testimonial-card');
  const prevBtn = document.querySelector('.carousel__arrow--prev');
  const nextBtn = document.querySelector('.carousel__arrow--next');
  if (carouselTrack && carouselCards.length > 0) {
    let currentIndex = 0;
    const totalSlides = carouselCards.length;
    function getSlidesToShow() {
      if (window.innerWidth >= 990) return 5;
      if (window.innerWidth >= 750) return 3;
      return 1;
    }
    function updateCarousel() {
      const slidesToShow = getSlidesToShow();
      const maxIndex = Math.max(0, totalSlides - slidesToShow);
      currentIndex = Math.min(currentIndex, maxIndex);
      const cardWidth = carouselCards[0].offsetWidth;
      const gap = window.innerWidth >= 750 ? 40 : 15;
      carouselTrack.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;
    }
    prevBtn?.addEventListener('click', () => { currentIndex = Math.max(0, currentIndex - 1); updateCarousel(); });
    nextBtn?.addEventListener('click', () => { const maxIndex = Math.max(0, totalSlides - getSlidesToShow()); currentIndex = Math.min(maxIndex, currentIndex + 1); updateCarousel(); });
    window.addEventListener('resize', () => { currentIndex = Math.min(currentIndex, Math.max(0, totalSlides - getSlidesToShow())); updateCarousel(); });
    updateCarousel();
  }

  // Carrossel Anime Worlds - desktop 4, mobile 2
  const animeTrack = document.querySelector('.anime-carousel__track');
  const animeCards = document.querySelectorAll('.anime-worlds-card');
  const animePrev = document.querySelector('.anime-carousel__arrow--prev');
  const animeNext = document.querySelector('.anime-carousel__arrow--next');
  if (animeTrack && animeCards.length > 0) {
    let animeIndex = 0;
    const totalAnime = animeCards.length;
    function getAnimeSlidesToShow() {
      if (window.innerWidth >= 750) return 4;
      return 2;
    }
    function updateAnimeCarousel() {
      const slidesToShow = getAnimeSlidesToShow();
      const maxIndex = Math.max(0, totalAnime - slidesToShow);
      animeIndex = Math.min(animeIndex, maxIndex);
      const cardWidth = animeCards[0].offsetWidth;
      const gap = window.innerWidth >= 750 ? 16 : 6;
      animeTrack.style.transform = `translateX(-${animeIndex * (cardWidth + gap)}px)`;
    }
    animePrev?.addEventListener('click', () => { animeIndex = Math.max(0, animeIndex - 1); updateAnimeCarousel(); });
    animeNext?.addEventListener('click', () => { const maxIndex = Math.max(0, totalAnime - getAnimeSlidesToShow()); animeIndex = Math.min(maxIndex, animeIndex + 1); updateAnimeCarousel(); });
    window.addEventListener('resize', () => { animeIndex = Math.min(animeIndex, Math.max(0, totalAnime - getAnimeSlidesToShow())); updateAnimeCarousel(); });
    updateAnimeCarousel();
  }

  // Carrossel Most Popular - desktop 4, mobile 2
  const productsTrack = document.querySelector('.products-carousel__track');
  const productCards = document.querySelectorAll('.product-card');
  const productsPrev = document.querySelector('.products-carousel__arrow--prev');
  const productsNext = document.querySelector('.products-carousel__arrow--next');
  if (productsTrack && productCards.length > 0) {
    let productsIndex = 0;
    const totalProducts = productCards.length;
    function getProductsSlidesToShow() {
      if (window.innerWidth >= 750) return 4;
      return 2;
    }
    function updateProductsCarousel() {
      const slidesToShow = getProductsSlidesToShow();
      const maxIndex = Math.max(0, totalProducts - slidesToShow);
      productsIndex = Math.min(productsIndex, maxIndex);
      const cardWidth = productCards[0].offsetWidth;
      const gap = window.innerWidth >= 750 ? 24 : 15;
      productsTrack.style.transform = `translateX(-${productsIndex * (cardWidth + gap)}px)`;
    }
    productsPrev?.addEventListener('click', () => { productsIndex = Math.max(0, productsIndex - 1); updateProductsCarousel(); });
    productsNext?.addEventListener('click', () => { const maxIndex = Math.max(0, totalProducts - getProductsSlidesToShow()); productsIndex = Math.min(maxIndex, productsIndex + 1); updateProductsCarousel(); });
    window.addEventListener('resize', () => { productsIndex = Math.min(productsIndex, Math.max(0, totalProducts - getProductsSlidesToShow())); updateProductsCarousel(); });
    updateProductsCarousel();
  }

  // Carrossel Mix & Match - desktop 4, mobile 2
  const mixMatchTrack = document.querySelector('.mix-match__track');
  const mixMatchSlides = document.querySelectorAll('.mix-match__slide');
  const mixMatchPrev = document.querySelector('.mix-match__arrow--prev');
  const mixMatchNext = document.querySelector('.mix-match__arrow--next');
  if (mixMatchTrack && mixMatchSlides.length > 0) {
    let mixMatchIndex = 0;
    const totalMixMatch = mixMatchSlides.length;
    function getMixMatchSlidesToShow() {
      if (window.innerWidth >= 768) return 4;
      return 2;
    }
    function updateMixMatchCarousel() {
      const slidesToShow = getMixMatchSlidesToShow();
      const maxIndex = Math.max(0, totalMixMatch - slidesToShow);
      mixMatchIndex = Math.min(mixMatchIndex, maxIndex);
      const slideWidth = mixMatchSlides[0].offsetWidth;
      const gap = window.innerWidth >= 768 ? 28 : 12;
      mixMatchTrack.style.transform = `translateX(-${mixMatchIndex * (slideWidth + gap)}px)`;
    }
    mixMatchPrev?.addEventListener('click', () => { mixMatchIndex = Math.max(0, mixMatchIndex - 1); updateMixMatchCarousel(); });
    mixMatchNext?.addEventListener('click', () => { const maxIndex = Math.max(0, totalMixMatch - getMixMatchSlidesToShow()); mixMatchIndex = Math.min(maxIndex, mixMatchIndex + 1); updateMixMatchCarousel(); });
    window.addEventListener('resize', () => { mixMatchIndex = Math.min(mixMatchIndex, Math.max(0, totalMixMatch - getMixMatchSlidesToShow())); updateMixMatchCarousel(); });
    updateMixMatchCarousel();
  }

  // Slider Dia/Noite - arrastável
  const dayNightSlider = document.querySelector('.day-night__slider');
  const dayNightHandle = document.querySelector('.day-night__handle');
  const dayNightImgNight = document.querySelector('.day-night__img--night');
  if (dayNightSlider && dayNightHandle && dayNightImgNight) {
    let isDragging = false;
    function setPosition(percent) {
      const p = Math.max(0, Math.min(100, percent));
      dayNightImgNight.style.clipPath = `inset(0 0 0 ${p}%)`;
      dayNightHandle.style.left = `${p}%`;
    }
    function getPercentFromEvent(e) {
      const rect = dayNightSlider.getBoundingClientRect();
      const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      return ((x - rect.left) / rect.width) * 100;
    }
    dayNightHandle.addEventListener('mousedown', (e) => { e.preventDefault(); isDragging = true; });
    dayNightSlider.addEventListener('mousedown', (e) => { if (e.target.closest('.day-night__handle')) return; isDragging = true; setPosition(getPercentFromEvent(e)); });
    document.addEventListener('mousemove', (e) => { if (!isDragging) return; setPosition(getPercentFromEvent(e)); });
    document.addEventListener('mouseup', () => { isDragging = false; });
    dayNightHandle.addEventListener('touchstart', (e) => { isDragging = true; }, { passive: true });
    dayNightSlider.addEventListener('touchstart', (e) => { if (e.target.closest('.day-night__handle')) return; isDragging = true; setPosition(getPercentFromEvent(e)); }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (!isDragging) return; e.preventDefault(); setPosition(getPercentFromEvent(e)); }, { passive: false });
    document.addEventListener('touchend', () => { isDragging = false; });
    setPosition(50);
  }

  // Tabs Perfect for your
  const tabBtns = document.querySelectorAll('.perfect-for__tab-btn');
  const panels = document.querySelectorAll('.perfect-for__panel');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = btn.getAttribute('data-index');
      tabBtns.forEach((b) => b.classList.remove('perfect-for__tab-btn--active'));
      panels.forEach((p) => p.classList.remove('perfect-for__panel--active'));
      btn.classList.add('perfect-for__tab-btn--active');
      const target = document.querySelector(`.perfect-for__panel[data-index="${index}"]`);
      target?.classList.add('perfect-for__panel--active');
    });
  });

  // Garantir autoplay dos vídeos (alguns navegadores exigem)
  document.querySelectorAll('.videos__video-wrap video').forEach((v) => {
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
  });

  // Carrossel vantagens de compra - autoplay 3s, 1 mobile / 2 tablet / 4 desktop
  const advTrack = document.querySelector('.advantages__track');
  const advCards = document.querySelectorAll('.advantage-card');
  const advPrev = document.querySelector('.advantages__arrow--prev');
  const advNext = document.querySelector('.advantages__arrow--next');
  let advIndex = 0;
  let advInterval;
  const ADV_INTERVAL_MS = 3000;

  function getAdvSlidesToShow() {
    if (window.innerWidth >= 990) return 4;
    if (window.innerWidth >= 750) return 2;
    return 1;
  }

  function updateAdvCarousel() {
    const slidesToShow = getAdvSlidesToShow();
    const maxIndex = Math.max(0, advCards.length - slidesToShow);
    advIndex = Math.min(advIndex, maxIndex);
    const cardWidth = advCards[0]?.offsetWidth || 0;
    const gap = window.innerWidth >= 750 ? 40 : 15;
    if (advTrack && advCards.length > 0) {
      advTrack.style.transform = `translateX(-${advIndex * (cardWidth + gap)}px)`;
    }
  }

  function nextAdv() {
    const slidesToShow = getAdvSlidesToShow();
    const maxIndex = Math.max(0, advCards.length - slidesToShow);
    advIndex = advIndex >= maxIndex ? 0 : advIndex + 1;
    updateAdvCarousel();
  }

  if (advTrack && advCards.length > 0) {
    advPrev?.addEventListener('click', () => {
      const slidesToShow = getAdvSlidesToShow();
      const maxIndex = Math.max(0, advCards.length - slidesToShow);
      advIndex = advIndex <= 0 ? maxIndex : advIndex - 1;
      updateAdvCarousel();
      clearInterval(advInterval);
      advInterval = setInterval(nextAdv, ADV_INTERVAL_MS);
    });
    advNext?.addEventListener('click', () => {
      nextAdv();
      clearInterval(advInterval);
      advInterval = setInterval(nextAdv, ADV_INTERVAL_MS);
    });
    window.addEventListener('resize', () => {
      advIndex = Math.min(advIndex, Math.max(0, advCards.length - getAdvSlidesToShow()));
      updateAdvCarousel();
    });
    updateAdvCarousel();
    advInterval = setInterval(nextAdv, ADV_INTERVAL_MS);
  }
});
