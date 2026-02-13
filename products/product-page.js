/**
 * Script da página de produto
 * - Troca de imagem ao selecionar variante
 * - Seleção de cor da moldura
 * - Carrossel de avaliações
 * - Ícones de pagamento
 */
document.addEventListener('DOMContentLoaded', () => {
  const mainImage = document.getElementById('product-main-image');
  const variantInputs = document.querySelectorAll('input[name="variant"]');
  const frameInputs = document.querySelectorAll('input[name="frame-color"]');
  const pillOptions = document.querySelectorAll('.product-form__option--pill');
  const swatchLabels = document.querySelectorAll('.product-form__swatch');

  // Ícones de pagamento na área do produto
  if (typeof renderPaymentIcons === 'function') {
    renderPaymentIcons('#product-payment-icons');
  }

  // Variante: trocar imagem principal
  function updateMainImage(src) {
    if (mainImage && src) {
      mainImage.src = src;
      mainImage.srcset = src.replace('width=800', 'width=1600') + ' 2x';
    }
  }

  const optionCurrent = document.querySelector('.product-form__option-current');
  function updateOptionDisplay(value) {
    if (optionCurrent) optionCurrent.textContent = value;
  }

  variantInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const src = input.dataset.image;
      updateMainImage(src);
      swatchLabels.forEach((l) => l.classList.remove('is-selected'));
      input.closest('.product-form__swatch')?.classList.add('is-selected');
      updateOptionDisplay(input.value);
    });
  });
  const checkedVariant = document.querySelector('input[name="variant"]:checked');
  if (checkedVariant) updateOptionDisplay(checkedVariant.value);

  // Cor da moldura: pill buttons
  frameInputs.forEach((input) => {
    input.addEventListener('change', () => {
      pillOptions.forEach((o) => o.classList.remove('is-selected'));
      input.closest('.product-form__option')?.classList.add('is-selected');
    });
  });

  // Carrossel de avaliações
  const reviewsTrack = document.querySelector('.product-reviews__track');
  const reviewsSlides = document.querySelectorAll('.product-reviews__slide');
  const reviewsPrev = document.querySelector('.product-reviews__arrow--prev');
  const reviewsNext = document.querySelector('.product-reviews__arrow--next');
  const reviewsDots = document.querySelectorAll('.product-reviews__dot');

  if (reviewsTrack && reviewsSlides.length > 0) {
    let reviewsIndex = 0;
    const totalReviews = reviewsSlides.length;

    function getSlidesToShow() {
      if (window.innerWidth >= 990) return 3;
      if (window.innerWidth >= 750) return 2;
      return 1;
    }

    function updateReviewsCarousel() {
      const slidesToShow = getSlidesToShow();
      const maxIndex = Math.max(0, totalReviews - slidesToShow);
      reviewsIndex = Math.min(reviewsIndex, maxIndex);
      const slideWidth = reviewsSlides[0]?.offsetWidth || 100;
      const gap = 24;
      reviewsTrack.style.transform = `translateX(-${reviewsIndex * (slideWidth + gap)}px)`;
      reviewsDots.forEach((d, i) => d.classList.toggle('is-active', i === reviewsIndex));
    }

    reviewsPrev?.addEventListener('click', () => {
      reviewsIndex = Math.max(0, reviewsIndex - 1);
      updateReviewsCarousel();
    });

    reviewsNext?.addEventListener('click', () => {
      const maxIndex = Math.max(0, totalReviews - getSlidesToShow());
      reviewsIndex = Math.min(maxIndex, reviewsIndex + 1);
      updateReviewsCarousel();
    });

    reviewsDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        reviewsIndex = parseInt(dot.dataset.index, 10);
        updateReviewsCarousel();
      });
    });

    window.addEventListener('resize', () => {
      reviewsIndex = Math.min(reviewsIndex, Math.max(0, totalReviews - getSlidesToShow()));
      updateReviewsCarousel();
    });
    updateReviewsCarousel();
  }

  // Carrossel de vídeos "Veja as light boxes em ação"
  const videosTrack = document.querySelector('.product-videos__track');
  const videosSlides = document.querySelectorAll('.product-videos__slide');
  const videosPrev = document.querySelector('.product-videos__btn--prev');
  const videosNext = document.querySelector('.product-videos__btn--next');

  if (videosTrack && videosSlides?.length > 0) {
    let videosIndex = 0;
    const totalVideos = videosSlides.length;

    function getVideosSlidesToShow() {
      if (window.innerWidth >= 990) return 3;
      if (window.innerWidth >= 750) return 2;
      return 1;
    }

    function updateVideosCarousel() {
      const slidesToShow = getVideosSlidesToShow();
      const maxIndex = Math.max(0, totalVideos - slidesToShow);
      videosIndex = Math.min(videosIndex, maxIndex);
      const slideWidth = videosSlides[0]?.offsetWidth || 100;
      const gap = 16;
      videosTrack.style.transform = `translateX(-${videosIndex * (slideWidth + gap)}px)`;
    }

    videosPrev?.addEventListener('click', () => {
      videosIndex = Math.max(0, videosIndex - 1);
      updateVideosCarousel();
    });

    videosNext?.addEventListener('click', () => {
      const maxIndex = Math.max(0, totalVideos - getVideosSlidesToShow());
      videosIndex = Math.min(maxIndex, videosIndex + 1);
      updateVideosCarousel();
    });

    window.addEventListener('resize', () => {
      videosIndex = Math.min(videosIndex, Math.max(0, totalVideos - getVideosSlidesToShow()));
      updateVideosCarousel();
    });
    updateVideosCarousel();
  }

  // Modal de vídeo
  const modal = document.getElementById('product-video-modal');
  const modalTrack = document.querySelector('.product-video-modal__track');
  const modalSlides = document.querySelectorAll('.product-video-modal__slide');
  const modalClose = document.querySelector('.product-video-modal__close');
  const modalPrev = document.querySelector('.product-video-modal__btn--prev');
  const modalNext = document.querySelector('.product-video-modal__btn--next');

  function openVideoModal(index) {
    if (!modal || !modalSlides.length) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    goToModalSlide(index);
  }

  function closeVideoModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modalSlides.forEach((slide) => {
      const video = slide.querySelector('video');
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }

  function goToModalSlide(index) {
    const i = Math.max(0, Math.min(index, modalSlides.length - 1));
    if (modalTrack) modalTrack.style.transform = `translateX(-${i * (100 / modalSlides.length)}%)`;

    modalSlides.forEach((slide, idx) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (idx === i) {
        const src = video.dataset.src;
        if (src && !video.src) {
          video.src = src;
        }
        video.muted = true;
        video.play().catch(() => {});
        const muteBtn = slide.querySelector('.product-video-modal__mute');
        const unmuteBtn = slide.querySelector('.product-video-modal__unmute');
        if (muteBtn) muteBtn.classList.remove('hidden');
        if (unmuteBtn) unmuteBtn.classList.add('hidden');
      } else {
        video.pause();
      }
    });
  }

  let modalIndex = 0;

  Array.from(videosSlides || []).forEach((slide) => {
    slide.addEventListener('click', () => {
      const idx = parseInt(slide.dataset.index, 10);
      modalIndex = idx;
      openVideoModal(idx);
    });
  });

  modalClose?.addEventListener('click', closeVideoModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeVideoModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeVideoModal();
  });

  modalPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    modalIndex = Math.max(0, modalIndex - 1);
    goToModalSlide(modalIndex);
  });

  modalNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    modalIndex = Math.min(modalSlides.length - 1, modalIndex + 1);
    goToModalSlide(modalIndex);
  });

  modalSlides?.forEach((slide) => {
    const soundBtn = slide.querySelector('.product-video-modal__sound');
    const video = slide.querySelector('video');
    const muteIcon = slide.querySelector('.product-video-modal__mute');
    const unmuteIcon = slide.querySelector('.product-video-modal__unmute');

    soundBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!video) return;
      video.muted = !video.muted;
      muteIcon?.classList.toggle('hidden', !video.muted);
      unmuteIcon?.classList.toggle('hidden', video.muted);
    });
  });

  // Carrossel "O que os clientes disseram"
  const testimonialsTrack = document.querySelector('.product-testimonials__track');
  const testimonialsSlides = document.querySelectorAll('.product-testimonials__slide');
  const testimonialsPrev = document.querySelector('.product-testimonials__btn--prev');
  const testimonialsNext = document.querySelector('.product-testimonials__btn--next');

  if (testimonialsTrack && testimonialsSlides?.length > 0) {
    let testimonialsIndex = 0;
    const totalTestimonials = testimonialsSlides.length;

    function getTestimonialsSlidesToShow() {
      if (window.innerWidth >= 990) return 3;
      if (window.innerWidth >= 750) return 2;
      return 1;
    }

    function updateTestimonialsCarousel() {
      const slidesToShow = getTestimonialsSlidesToShow();
      const maxIndex = Math.max(0, totalTestimonials - slidesToShow);
      testimonialsIndex = Math.min(testimonialsIndex, maxIndex);
      const slideWidth = testimonialsSlides[0]?.offsetWidth || 100;
      const gap = 20;
      testimonialsTrack.style.transform = `translateX(-${testimonialsIndex * (slideWidth + gap)}px)`;
    }

    testimonialsPrev?.addEventListener('click', () => {
      testimonialsIndex = Math.max(0, testimonialsIndex - 1);
      updateTestimonialsCarousel();
    });

    testimonialsNext?.addEventListener('click', () => {
      const maxIndex = Math.max(0, totalTestimonials - getTestimonialsSlidesToShow());
      testimonialsIndex = Math.min(maxIndex, testimonialsIndex + 1);
      updateTestimonialsCarousel();
    });

    window.addEventListener('resize', () => {
      testimonialsIndex = Math.min(testimonialsIndex, Math.max(0, totalTestimonials - getTestimonialsSlidesToShow()));
      updateTestimonialsCarousel();
    });
    updateTestimonialsCarousel();
  }

  // Carrossel promo combo
  const comboTrack = document.querySelector('.product-promo-combo__track');
  const comboSlides = document.querySelectorAll('.product-promo-combo__slide');
  const comboPrev = document.querySelector('.product-promo-combo__btn--prev');
  const comboNext = document.querySelector('.product-promo-combo__btn--next');
  const comboCurrent = document.querySelector('.product-promo-combo__current');
  const comboTotal = document.querySelector('.product-promo-combo__total');

  if (comboTrack && comboSlides?.length > 0) {
    let comboIndex = 0;
    const totalCombo = comboSlides.length;

    function getComboSlidesToShow() {
      return 2;
    }

    function updateComboCarousel() {
      const slidesToShow = getComboSlidesToShow();
      const maxIndex = Math.max(0, totalCombo - slidesToShow);
      comboIndex = Math.min(comboIndex, maxIndex);
      const slideWidth = comboSlides[0]?.offsetWidth || 100;
      const gap = 16;
      comboTrack.style.transform = `translateX(-${comboIndex * (slideWidth + gap)}px)`;
      if (comboCurrent) comboCurrent.textContent = comboIndex + 1;
      if (comboTotal) comboTotal.textContent = maxIndex + 1;
    }

    comboPrev?.addEventListener('click', () => {
      comboIndex = Math.max(0, comboIndex - 1);
      updateComboCarousel();
    });

    comboNext?.addEventListener('click', () => {
      const maxIndex = Math.max(0, totalCombo - getComboSlidesToShow());
      comboIndex = Math.min(maxIndex, comboIndex + 1);
      updateComboCarousel();
    });

    window.addEventListener('resize', () => {
      comboIndex = Math.min(comboIndex, Math.max(0, totalCombo - getComboSlidesToShow()));
      updateComboCarousel();
    });
    updateComboCarousel();
  }
});
