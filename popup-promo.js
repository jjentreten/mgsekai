/**
 * Popup Promo - Captura email do lead para ativar promoção
 * Aparece após 3s, apenas uma vez por lead (localStorage).
 * Ao ativar desconto: exibe barra com countdown de 15 min (escassez).
 */
(function () {
  const STORAGE_KEY = 'manga_sekai_popup_shown';
  const OFFER_ACTIVATED_KEY = 'manga_sekai_offer_activated_at';
  const FULL_PRICE_KEY = 'manga_sekai_full_price';
  const DELAY_MS = 3000;
  const COUNTDOWN_MINUTES = 15;
  const COUNTDOWN_MS = COUNTDOWN_MINUTES * 60 * 1000;
  const EXTRA_MINUTES = 5;
  const EXTRA_MS = EXTRA_MINUTES * 60 * 1000;

  function hasBeenShown() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function markAsShown() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (_) {}
  }

  function getActivatedAt() {
    try {
      const v = localStorage.getItem(OFFER_ACTIVATED_KEY);
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  }

  function setActivatedAt(ts) {
    try {
      localStorage.setItem(OFFER_ACTIVATED_KEY, String(ts));
    } catch (_) {}
  }

  function clearActivatedAt() {
    try {
      localStorage.removeItem(OFFER_ACTIVATED_KEY);
    } catch (_) {}
  }

  function formatCountdown(msLeft) {
    if (msLeft <= 0) return '0:00';
    const totalSec = Math.ceil(msLeft / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function showOfferBar() {
    const bar = document.getElementById('offer-countdown');
    const timeEl = document.getElementById('offer-countdown-time');
    if (!bar || !timeEl) return;

    bar.removeAttribute('hidden');
    bar.classList.add('is-active');
    document.body.classList.add('offer-countdown-visible');
  }

  function hideOfferBar() {
    const bar = document.getElementById('offer-countdown');
    if (!bar) return;
    bar.setAttribute('hidden', '');
    bar.classList.remove('is-active');
    document.body.classList.remove('offer-countdown-visible');
  }

  function updateCountdownUI(msLeft) {
    const timeEl = document.getElementById('offer-countdown-time');
    if (timeEl) timeEl.textContent = formatCountdown(msLeft);
  }

  let countdownInterval = null;

  function showExpiredPopup(onAccept, onRefuse) {
    const existing = document.getElementById('popup-timer-expired');
    if (existing) return existing;

    const popup = document.createElement('div');
    popup.id = 'popup-timer-expired';
    popup.className = 'popup-expired';
    popup.setAttribute('aria-hidden', 'false');
    popup.innerHTML = '<div class="popup-expired__backdrop"></div><div class="popup-expired__box" role="dialog" aria-label="Sua promoção acabou" aria-modal="true"><p class="popup-expired__message">Oh não! Sua promoção acabou... :(</p><p class="popup-expired__message popup-expired__message--sub">Iremos te dar mais 5 minutos!</p><div class="popup-expired__actions"><button type="button" class="popup-expired__btn popup-expired__btn--accept">Ok</button><button type="button" class="popup-expired__btn popup-expired__btn--refuse">Não, obrigado</button></div></div>';
    document.body.appendChild(popup);

    const backdrop = popup.querySelector('.popup-expired__backdrop');
    const btnAccept = popup.querySelector('.popup-expired__btn--accept');
    const btnRefuse = popup.querySelector('.popup-expired__btn--refuse');

    function finish() {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
      setTimeout(function () { popup.remove(); }, 300);
    }

    btnAccept.addEventListener('click', function () { finish(); if (typeof onAccept === 'function') onAccept(); });
    btnRefuse.addEventListener('click', function () { finish(); if (typeof onRefuse === 'function') onRefuse(); });
    backdrop.addEventListener('click', function () { finish(); if (typeof onRefuse === 'function') onRefuse(); });

    requestAnimationFrame(function () { popup.classList.add('is-open'); });
    return popup;
  }

  function startCountdown(activatedAt, durationMs) {
    const ms = typeof durationMs === 'number' ? durationMs : COUNTDOWN_MS;
    function tick() {
      const now = Date.now();
      const endAt = activatedAt + ms;
      const msLeft = endAt - now;

      if (msLeft <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = null;
        updateCountdownUI(0);
        showExpiredPopup(
          function () {
            var newAt = Date.now();
            setActivatedAt(newAt);
            showOfferBar();
            startCountdown(newAt, EXTRA_MS);
          },
          function () {
            clearActivatedAt();
            hideOfferBar();
          }
        );
        return;
      }

      updateCountdownUI(msLeft);
    }

    tick();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(tick, 1000);
  }

  function activateOffer() {
    const now = Date.now();
    setActivatedAt(now);
    showOfferBar();
    startCountdown(now);
  }

  function initOfferBar() {
    const activatedAt = getActivatedAt();
    if (activatedAt == null) return;

    const now = Date.now();
    const endAt = activatedAt + COUNTDOWN_MS;
    if (now >= endAt) {
      clearActivatedAt();
      hideOfferBar();
      return;
    }

    showOfferBar();
    startCountdown(activatedAt);
  }

  function show() {
    const popup = document.getElementById('popup-promo');
    if (popup) {
      popup.classList.add('is-open');
      popup.setAttribute('aria-hidden', 'false');
    }
  }

  /** Permite reabrir o popup (ex.: ao clicar em "Ativar promoção" no carrinho). */
  function showIfAvailable() {
    if (document.getElementById('popup-promo')) {
      show();
    } else {
      const path = window.location.pathname || '';
      const base = path.indexOf('/products/') !== -1 ? '../' : '';
      window.location.href = base + 'index.html?activate_promo=1';
    }
  }

  function hide() {
    const popup = document.getElementById('popup-promo');
    if (popup) {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
    }
  }

  function setFullPrice() {
    try {
      localStorage.setItem(FULL_PRICE_KEY, '1');
    } catch (_) {}
  }

  function clearFullPrice() {
    try {
      localStorage.removeItem(FULL_PRICE_KEY);
    } catch (_) {}
  }

  function closeAndMark() {
    hide();
    markAsShown();
  }

  function init() {
    const popup = document.getElementById('popup-promo');
    window.mangaSekaiShowPromoPopup = showIfAvailable;
    if (!popup) return;

    initOfferBar();

    const closeBtn = document.getElementById('popup-promo-close');
    const backdrop = popup.querySelector('.popup-promo__backdrop');
    const form = document.getElementById('popup-promo-form');
    const skipBtn = document.getElementById('popup-promo-skip');

    closeBtn?.addEventListener('click', closeAndMark);
    backdrop?.addEventListener('click', closeAndMark);
    skipBtn?.addEventListener('click', () => {
      setFullPrice();
      closeAndMark();
      if (typeof window.applyFullPriceLightboxPrices === 'function') {
        window.applyFullPriceLightboxPrices();
      }
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('popup-promo-email');
      const email = emailInput?.value?.trim();
      if (!email) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
      clearFullPrice();
      closeAndMark();
      activateOffer();
      try {
        window.dispatchEvent(new CustomEvent('manga_sekai_promo_activated'));
      } catch (_) {}
    });

    if (!hasBeenShown()) {
      setTimeout(show, DELAY_MS);
    } else if (typeof window !== 'undefined' && window.location.search.includes('activate_promo=1')) {
      show();
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('activate_promo');
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      } catch (_) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
