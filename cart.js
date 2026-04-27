/**
 * Carrinho flutuante - Manga Sekai Shop
 * Promoções: FRETE GRÁTIS (1) | 1 GRÁTIS (3º) | 2 GRÁTIS (3º e 5º – pague 3, 2 grátis)
 */
(function () {
  const STORAGE_KEY = 'manga_sekai_cart';
  const STORAGE_KEY_QUADROS = 'manga_sekai_cart_quadros'; // quadros não entram na lógica de promo (1 grátis, etc.)
  const FULL_PRICE_KEY = 'manga_sekai_full_price';
  const PRICE_SALE = 37.10;
  const PRICE_REGULAR = 99.00;
  const QUADRO_PRICE = 19.99;

  function isFullPrice() {
    try {
      return localStorage.getItem(FULL_PRICE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function getLightboxPrice(item) {
    if (!item || item.isQuadro) return parsePrice(item?.priceSale);
    // Usar o priceSale salvo no item (ex.: upsell 30% off), senão o preço padrão
    return parsePrice(item?.priceSale) || PRICE_SALE;
  }

  // Quadros order bumper por anime – o primeiro item do carrinho define qual quadro oferecer
  const QUADRO_PRICE_PROMO = 49.99; // preço riscado (de R$ 49,99 por R$ 19,99) em todos os quadros
  const QUADROS_BY_ANIME = [
    { animeKeys: ['naruto', 'sasuke', 'kakashi', 'itachi', 'gaara', 'minato', 'jiraiya', 'obito', 'shisui', 'madara', 'pain', 'might guy'], quadro: { name: 'Quadro Naruto "Eyes"', image: 'assets/quadro-naruto.png', price: QUADRO_PRICE, priceRegular: QUADRO_PRICE_PROMO } },
    { animeKeys: ['luffy', 'zoro', 'one piece', 'ace', 'chopper', 'nami', 'sanji', 'law', 'trafalgar'], quadro: { name: 'Quadro Roronoa Zoro', image: 'https://www.quadrorama.com.br/imagens/quadro-decorativo/?quadro=2024/01/Roronoa-Zoro-1.png', price: QUADRO_PRICE, priceRegular: QUADRO_PRICE_PROMO } },
    { animeKeys: ['gojo', 'sukuna', 'jujutsu', 'yuji', 'megumi', 'nobara', 'toji', 'geto'], quadro: { name: 'Quadro Satoru Gojo "Dual Face"', image: 'assets/quadro-gojo.png', price: QUADRO_PRICE, priceRegular: QUADRO_PRICE_PROMO } },
    { animeKeys: ['goku', 'vegeta', 'dragon ball', 'gohan', 'piccolo', 'freezer', 'broly', 'bulma', 'trunks'], quadro: { name: 'Quadro Goku & Mestre Kame', image: 'https://www.quadrorama.com.br/imagens/quadro-decorativo/?quadro=2026/01/Goku-e-Mestre-Kame-branca_18c5fd6b.png', price: QUADRO_PRICE, priceRegular: QUADRO_PRICE_PROMO } },
    { animeKeys: ['demon slayer', 'tanjiro', 'kimetsu', 'zenitsu', 'inosuke', 'nezuko', 'giyu', 'shinobu', 'rengoku', 'muzan'], quadro: { name: 'Quadro Tanjiro "Respiração"', image: 'https://www.quadrorama.com.br/imagens/quadro-decorativo/?quadro=2024/05/2-1.png', price: QUADRO_PRICE, priceRegular: QUADRO_PRICE_PROMO } },
  ];

  /** Retorna o quadro a oferecer com base no primeiro item do carrinho (anime da light box). */
  function getRecommendedQuadro(items) {
    if (!items || items.length === 0) return null;
    const first = items[0];
    const search = ((first.name || '') + ' ' + (first.url || '')).toLowerCase();
    const found = QUADROS_BY_ANIME.find(({ animeKeys }) => animeKeys.some(k => search.includes(k)));
    return found ? found.quadro : null;
  }

  /** Oferta especial: segunda lightbox com 30% OFF quando o lead tem só 1 no carrinho */
  const UPSELL_DISCOUNT = 0.3;
  const UPSELL_PRICE = Math.round(PRICE_SALE * (1 - UPSELL_DISCOUNT) * 100) / 100;
  const UPSELL_DURATION_MS = 5 * 60 * 1000;
  const UPSELL_BY_ANIME = [
    { animeKeys: ['naruto', 'sasuke', 'kakashi', 'itachi', 'gaara', 'minato', 'jiraiya', 'obito', 'shisui', 'madara', 'pain', 'might guy'], product: { name: 'Sasuke Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/L-4-2.jpg?v=1749255142&width=533', slug: 'sasuke-box-light.html' } },
    { animeKeys: ['luffy', 'zoro', 'one piece', 'ace', 'chopper', 'nami', 'sanji', 'law', 'trafalgar'], product: { name: 'Zoro Light Box', image: 'https://mangasekaishop.com/cdn/shop/files/L-2-2.jpg?v=1755452790&width=533', slug: 'zoro-box-light.html' } },
    { animeKeys: ['goku', 'vegeta', 'dragon ball', 'gohan', 'piccolo', 'freezer', 'broly', 'bulma', 'trunks'], product: { name: 'Vegeta Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/L-41-3.jpg?v=1749255057&width=533', slug: 'vegeta-box-light.html' } },
    { animeKeys: ['gojo', 'sukuna', 'jujutsu', 'yuji', 'megumi', 'nobara', 'toji', 'geto'], product: { name: 'Sukuna Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/L-10-2.jpg?v=1749255185&width=533', slug: 'sukuna-box-light.html' } },
    { animeKeys: ['demon slayer', 'tanjiro', 'kimetsu', 'zenitsu', 'inosuke', 'nezuko', 'giyu', 'shinobu', 'rengoku', 'muzan'], product: { name: 'Giyu Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/H02343e4314184e339948c2b9b4500c64v.jpg?v=1749255017&width=533', slug: 'giyu-box-light.html' } },
    { animeKeys: ['eren', 'levi', 'mikasa', 'attack on titan', 'shingeki', 'titan'], product: { name: 'Levi Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/L-26-2.jpg?v=1749255002&width=533', slug: 'levi-box-light.html' } }
  ];
  const UPSELL_DEFAULT = { name: 'Itachi Light Box', image: 'https://mangahikarishop.com/cdn/shop/files/51-2.webp?v=1749255210&width=533', slug: 'itachi-box-light.html' };

  function getUpsellOffer(items) {
    if (!items || items.length !== 1) return null;
    const first = items[0];
    const search = ((first.name || '') + ' ' + (first.url || '')).toLowerCase();
    const found = UPSELL_BY_ANIME.find(({ animeKeys }) => animeKeys.some(k => search.includes(k)));
    const product = found ? found.product : UPSELL_DEFAULT;
    const base = getBasePath();
    return {
      name: product.name,
      image: product.image,
      url: base + 'products/' + product.slug,
      priceSale: UPSELL_PRICE,
      priceRegular: PRICE_SALE,
      frameColor: 'Branco'
    };
  }

  function getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateCartUI();
  }

  function getQuadrosCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_QUADROS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveQuadrosCart(quadros) {
    localStorage.setItem(STORAGE_KEY_QUADROS, JSON.stringify(quadros));
    updateCartUI();
  }

  function removeQuadroFromCart(id) {
    const quadros = getQuadrosCart().filter(q => String(q.id) !== String(id));
    saveQuadrosCart(quadros);
  }

  function getQuadrosTotal() {
    return getQuadrosCart().reduce((acc, q) => acc + parsePrice(q.priceSale), 0);
  }

  function parsePrice(str) {
    if (typeof str === 'number') return str;
    const n = String(str).replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(n) || PRICE_SALE;
  }

  function formatPrice(n) {
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  /** Regras de promo: 1=frete grátis, 3=3º grátis, 5=3º e 5º grátis (pague 3, 2 grátis) */
  function getPromoDiscount(items) {
    const total = items.length;
    if (total < 3) return 0;
    let discount = 0;
    if (total >= 3) discount += getLightboxPrice(items[2]);
    if (total >= 5) discount += getLightboxPrice(items[4]);
    return discount;
  }

  function getSubtotal(items) {
    const sum = items.reduce((acc, i) => acc + getLightboxPrice(i), 0);
    return sum - getPromoDiscount(items);
  }

  function getProgress(items) {
    const n = items.length;
    var nextMsg;
    if (n < 1) nextMsg = 'Adicione 1 para ganhar frete grátis!';
    else if (n < 3) nextMsg = n === 2 ? 'A próxima Light Box será GRÁTIS!' : 'Adicione mais 2 para ganhar 1 GRÁTIS!';
    else if (n < 5) nextMsg = 'Adicione mais ' + (5 - n) + ' para ganhar 2 GRÁTIS!';
    else nextMsg = 'Você desbloqueou todas as promoções!';
    return {
      level: n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0,
      nextMsg: nextMsg
    };
  }

  function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/products/')) return '../';
    return path === '/' || path.endsWith('.html') || path === '' ? '' : '';
  }

  function onProgressActivateClick() {
    closeCart(); // Fecha o carrinho para o popup da promo ficar visível
    setTimeout(function () {
      if (typeof window.mangaSekaiShowPromoPopup === 'function') {
        window.mangaSekaiShowPromoPopup();
      } else {
        window.location.href = getBasePath() + 'index.html?activate_promo=1';
      }
    }, 150);
  }

  function onProgressActivateKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onProgressActivateClick();
    }
  }

  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function buildQuadroSlide(quadro, selectedFrameColor) {
    const base = getBasePath();
    const imgSrc = quadro.image.startsWith('http') ? quadro.image : base + quadro.image;
    const priceHtml = quadro.priceRegular
      ? `<s>${formatPrice(quadro.priceRegular)}</s> ${formatPrice(quadro.price)}`
      : formatPrice(quadro.price);
    const priceRegularAttr = quadro.priceRegular ? ` data-price-regular="${quadro.priceRegular}"` : '';
    const frame = (selectedFrameColor === 'Preto' ? 'Preto' : 'Branco');
    const optBranco = frame === 'Branco' ? '<option value="Branco" selected>Branco</option>' : '<option value="Branco">Branco</option>';
    const optPreto = frame === 'Preto' ? '<option value="Preto" selected>Preto</option>' : '<option value="Preto">Preto</option>';
    const nameAttr = escapeAttr(quadro.name);
    return `
      <div class="cart-recommendation__slide">
        <img src="${imgSrc}" alt="${nameAttr}" loading="lazy">
        <div class="cart-recommendation__info">
          <h4>${quadro.name}</h4>
          <p class="cart-recommendation__dims">30×42 cm</p>
          <div class="cart-recommendation__price">${priceHtml}</div>
          <div class="cart-recommendation__opts">
            <label class="cart-recommendation__label">Cor da borda</label>
            <select class="cart-recommendation__frame">${optBranco}${optPreto}</select>
          </div>
          <button type="button" class="cart-recommendation__add" data-name="${nameAttr}" data-image="${imgSrc}" data-price="${quadro.price}"${priceRegularAttr}>Adicionar ao carrinho</button>
        </div>
      </div>
    `;
  }

  function createCartDrawer() {
    const html = `
      <div class="cart-drawer__overlay" id="cart-overlay" aria-hidden="true"></div>
      <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-label="Carrinho" aria-hidden="true">
        <div class="cart-drawer__inner">
          <header class="cart-drawer__header">
            <h2 class="cart-drawer__title">Meu carrinho <span class="cart-drawer__count" id="cart-count-label">• 0 itens</span></h2>
            <button type="button" class="cart-drawer__close" id="cart-close" aria-label="Fechar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 17" width="20" height="20"><path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor"/></svg>
            </button>
          </header>

          <div class="cart-drawer__promo-area">
            <div class="cart-drawer__progress" id="cart-progress-wrap">
              <p class="cart-drawer__progress-msg" id="cart-progress-msg">Adicione 1 para ganhar frete grátis!</p>
              <div class="cart-drawer__progress-bar">
                <div class="cart-drawer__progress-fill" id="cart-progress-fill"></div>
                <span class="cart-drawer__progress-dot cart-drawer__progress-dot--1" data-level="1"></span>
                <span class="cart-drawer__progress-dot cart-drawer__progress-dot--2" data-level="2"></span>
                <span class="cart-drawer__progress-dot cart-drawer__progress-dot--3" data-level="3"></span>
              </div>
              <div class="cart-drawer__progress-labels">
                <span data-level="1">Frete grátis 🚚</span>
                <span data-level="2">1 GRÁTIS 🎁</span>
                <span data-level="3">2 GRÁTIS 🎁</span>
              </div>
            </div>
            <div class="cart-drawer__promo-card" id="cart-promo-card" aria-hidden="true" hidden>
              <p class="cart-drawer__promo-card-title">🎁 OFERTA BLOQUEADA</p>
              <p class="cart-drawer__promo-card-text">Ative a promoção para pagar<br>o valor promocional <strong>(R$ 37,10)</strong></p>
              <button type="button" class="cart-drawer__promo-card-btn" id="cart-promo-card-activate">ATIVAR PROMOÇÃO</button>
            </div>
          </div>

          <div class="cart-drawer__items-wrap">
            <ul class="cart-drawer__items" id="cart-items-list"></ul>
          </div>

          <section class="cart-drawer__recommendations" id="cart-recommendations-section">
            <h3>Leve um quadro do seu anime favorito!</h3>
            <div class="cart-recommendation">
              <div class="cart-recommendation__track" id="cart-recommendation-track"></div>
            </div>
          </section>

          <footer class="cart-drawer__footer">
            <div class="cart-drawer__discount" id="cart-discount-row" style="display:none">
              <span>Descontos</span>
              <span id="cart-discount-value">-R$ 0,00</span>
            </div>
            <div class="cart-drawer__quadros-wrap" id="cart-quadros-wrap" style="display:none"></div>
            <div class="cart-drawer__subtotal">
              <span>Subtotal</span>
              <span id="cart-subtotal-value">R$ 0,00</span>
            </div>
            <button type="button" class="cart-drawer__checkout" id="cart-checkout">Finalizar Compra</button>
          </footer>
        </div>
      </aside>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
    document.body.appendChild(wrap.lastElementChild);
  }

  function renderCartItems(items) {
    const list = document.getElementById('cart-items-list');
    if (!list) return;
    const base = getBasePath();

    if (items.length === 0) {
      list.innerHTML = '<li class="cart-drawer__empty">Seu carrinho está vazio. Adicione light boxes!</li>';
      return;
    }

    list.innerHTML = items.map((item, i) => {
      const isFree = (i === 2) || (i === 4);
      const priceSale = getLightboxPrice(item);
      const priceRegular = parsePrice(item.priceRegular);
      const singlePrice = priceSale === priceRegular || isFullPrice();
      const priceHtml = isFree
        ? '<span class="cart-drawer__item-free">Grátis</span>'
        : singlePrice
          ? `<span>${formatPrice(priceSale)}</span>`
          : `<span>${formatPrice(priceSale)}</span><s>${formatPrice(priceRegular)}</s>`;
      return `
        <li class="cart-drawer__item" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-drawer__item-img">
          <div class="cart-drawer__item-info">
            <h4>${item.name}</h4>
            <p class="cart-drawer__item-variant">${[item.frameColor ? 'Cor da borda: ' + item.frameColor : null, item.option != null && item.option !== '' ? 'Opção ' + item.option : null].filter(Boolean).join(' • ') || 'Cor da borda: Branco'}</p>
            <div class="cart-drawer__item-price">
              ${priceHtml}
            </div>
          </div>
          <button type="button" class="cart-drawer__item-remove" data-id="${item.id}" aria-label="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/><path d="M10 11v6M14 11v6"/></svg></button>
        </li>
      `;
    }).join('');

    list.querySelectorAll('.cart-drawer__item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
  }

  function updateCartUI() {
    const items = getCart();
    const countEls = document.querySelectorAll('.cart-count');
    countEls.forEach(el => { el.textContent = items.length; el.style.display = items.length ? '' : 'none'; });

    const label = document.getElementById('cart-count-label');
    if (label) label.textContent = '• ' + items.length + (items.length === 1 ? ' item' : ' itens');

    const progress = getProgress(items);
    const progressWrap = document.getElementById('cart-progress-wrap');
    const promoCard = document.getElementById('cart-promo-card');
    const fill = document.getElementById('cart-progress-fill');
    const msg = document.getElementById('cart-progress-msg');
    const locked = isFullPrice();

    if (locked) {
      progressWrap?.setAttribute('hidden', '');
      progressWrap?.setAttribute('aria-hidden', 'true');
      if (promoCard) {
        promoCard.removeAttribute('hidden');
        promoCard.removeAttribute('aria-hidden');
      }
    } else {
      progressWrap?.removeAttribute('hidden');
      progressWrap?.removeAttribute('aria-hidden');
      promoCard?.setAttribute('hidden', '');
      promoCard?.setAttribute('aria-hidden', 'true');
      if (msg) msg.textContent = progress.nextMsg;
      if (fill) fill.style.width = (progress.level / 3 * 100) + '%';
      document.querySelectorAll('.cart-drawer__progress-dot').forEach(dot => {
        const l = parseInt(dot.dataset.level, 10);
        dot.classList.toggle('is-unlocked', progress.level >= l);
      });
      document.querySelectorAll('.cart-drawer__progress-labels span').forEach((span, i) => {
        const l = i + 1;
        span.classList.toggle('is-unlocked', progress.level >= l);
      });
    }

    const quadros = getQuadrosCart();
    const quadrosTotal = getQuadrosTotal();
    const discount = getPromoDiscount(items);
    const itemsSubtotal = getSubtotal(items);
    const subtotal = itemsSubtotal + quadrosTotal;
    const discountRow = document.getElementById('cart-discount-row');
    const discountVal = document.getElementById('cart-discount-value');
    const subtotalVal = document.getElementById('cart-subtotal-value');
    const checkoutBtn = document.getElementById('cart-checkout');

    if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
    if (discountVal) discountVal.textContent = '-' + formatPrice(discount);
    const quadrosWrap = document.getElementById('cart-quadros-wrap');
    if (quadrosWrap) {
      if (quadros.length > 0) {
        quadrosWrap.style.display = 'block';
        quadrosWrap.innerHTML = quadros.map(q =>
          `<div class="cart-drawer__quadros-row" data-quadro-id="${q.id}">
            <span>${q.name}</span>
            <span>${formatPrice(parsePrice(q.priceSale))}</span>
            <button type="button" class="cart-drawer__quadro-remove" data-id="${q.id}" aria-label="Remover quadro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/><path d="M10 11v6M14 11v6"/></svg></button>
          </div>`
        ).join('');
        quadrosWrap.querySelectorAll('.cart-drawer__quadro-remove').forEach(btn => {
          btn.addEventListener('click', () => removeQuadroFromCart(btn.dataset.id));
        });
      } else {
        quadrosWrap.style.display = 'none';
        quadrosWrap.innerHTML = '';
      }
    }
    if (subtotalVal) subtotalVal.textContent = formatPrice(subtotal);
    if (checkoutBtn) checkoutBtn.textContent = 'Finalizar Compra';

    renderCartItems(items);

    // Recomenda um quadro conforme o anime do primeiro item do carrinho
    const track = document.getElementById('cart-recommendation-track');
    const section = document.getElementById('cart-recommendations-section');
    if (track && section) {
      const quadro = getRecommendedQuadro(items);
      if (quadro) {
        const currentSlide = track.querySelector('.cart-recommendation__slide');
        const currentName = currentSlide?.querySelector('.cart-recommendation__add')?.dataset?.name;
        const preservedFrame = (currentName === quadro.name) ? (currentSlide?.querySelector('.cart-recommendation__frame')?.value) : null;
        track.innerHTML = buildQuadroSlide(quadro, preservedFrame || 'Branco');
        section.style.display = '';
      } else {
        track.innerHTML = '';
        section.style.display = 'none';
      }
      bindRecommendations();
    }
  }

  function openCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); }
    if (overlay) { overlay.classList.add('is-visible'); overlay.setAttribute('aria-hidden', 'false'); }
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
    if (overlay) { overlay.classList.remove('is-visible'); overlay.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = '';
  }

  function addToCart(product, skipOpenCart) {
    const items = getCart();
    const id = 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const useFullPrice = isFullPrice();
    const item = {
      id,
      name: product.name,
      image: product.image,
      url: product.url,
      priceSale: useFullPrice ? PRICE_REGULAR : (product.priceSale ?? PRICE_SALE),
      priceRegular: useFullPrice ? PRICE_REGULAR : (product.priceRegular ?? PRICE_REGULAR),
      frameColor: product.frameColor || 'Branco'
    };
    if (product.option != null && product.option !== '') item.option = product.option;
    items.push(item);
    saveCart(items);
    if (!skipOpenCart) openCart();
  }

  function removeFromCart(id) {
    const items = getCart().filter(i => i.id !== id);
    saveCart(items);
  }

  function applyFullPriceLightboxPrices() {
    // Preço permanece sempre 37,10; não alteramos exibição por ter recusado a promo
  }

  /** Ao ativar a promoção: atualiza itens que estavam com preço cheio (R$ 99,00) para o valor promocional (R$ 37,10). */
  function applyPromoToExistingCartItems() {
    if (isFullPrice()) return;
    var items = getCart();
    var changed = false;
    items.forEach(function (item) {
      if (item.isQuadro) return;
      var sale = parsePrice(item.priceSale);
      if (sale === PRICE_REGULAR) {
        item.priceSale = PRICE_SALE;
        item.priceRegular = PRICE_REGULAR;
        changed = true;
      }
    });
    if (changed) saveCart(items);
  }

  let upsellPopupEl = null;
  let upsellTimerInterval = null;
  let upsellEndAt = 0;
  let upsellOnDeclineCallback = null;

  function createUpsellPopup() {
    if (document.getElementById('upsell-popup')) return;
    var box = document.createElement('div');
    box.id = 'upsell-popup';
    box.className = 'upsell-popup';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="upsell-popup__backdrop"></div>' +
      '<div class="upsell-popup__box" role="dialog" aria-label="Oferta especial" aria-modal="true">' +
      '<button type="button" class="upsell-popup__close" id="upsell-popup-close" aria-label="Fechar"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>' +
      '<div class="upsell-popup__header">' +
      '<h2 class="upsell-popup__title">Espera! Você está levando só um?</h2>' +
      '<p class="upsell-popup__subtitle">Quem leva um volta em uma semana atrás de mais – mas paga preço cheio. Não faça essa besteira.</p>' +
      '<p class="upsell-popup__timer-label">Oferta especial acaba em <strong id="upsell-timer">5:00</strong></p>' +
      '</div>' +
      '<div class="upsell-popup__product">' +
      '<img id="upsell-product-img" src="" alt="" class="upsell-popup__img" width="160" height="160">' +
      '<div class="upsell-popup__product-info">' +
      '<h3 id="upsell-product-name" class="upsell-popup__product-name"></h3>' +
      '<p class="upsell-popup__price"><s id="upsell-price-old">R$ 37,10</s> <span id="upsell-price-new" class="upsell-popup__price-sale">R$ 25,97</span></p>' +
      '<p class="upsell-popup__badge">30% de economia</p>' +
      '<label class="upsell-popup__frame-label">Cor da borda <select id="upsell-frame-color" class="upsell-popup__frame-select"><option value="Branco">Branco</option><option value="Preto">Preto</option></select></label>' +
      '</div>' +
      '</div>' +
      '<div class="upsell-popup__actions">' +
      '<button type="button" class="upsell-popup__btn-accept" id="upsell-btn-accept">Adicionar com 30% OFF</button>' +
      '<button type="button" class="upsell-popup__btn-decline" id="upsell-btn-decline">Não, vou levar só um</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(box);
    upsellPopupEl = box;

    function closeFromDecline() {
      if (typeof upsellOnDeclineCallback === 'function') {
        var cb = upsellOnDeclineCallback;
        upsellOnDeclineCallback = null;
        cb();
      }
      closeUpsellPopup();
    }
    var backdrop = box.querySelector('.upsell-popup__backdrop');
    var closeBtn = document.getElementById('upsell-popup-close');
    var declineBtn = document.getElementById('upsell-btn-decline');
    backdrop && backdrop.addEventListener('click', closeFromDecline);
    closeBtn && closeBtn.addEventListener('click', closeFromDecline);
    declineBtn && declineBtn.addEventListener('click', closeFromDecline);
  }

  function closeUpsellPopup() {
    if (upsellTimerInterval) { clearInterval(upsellTimerInterval); upsellTimerInterval = null; }
    upsellOnDeclineCallback = null;
    var el = document.getElementById('upsell-popup');
    if (el) { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); }
    document.body.style.overflow = '';
  }

  function showUpsellPopup(offer, onDecline) {
    createUpsellPopup();
    var el = document.getElementById('upsell-popup');
    if (!el) return;

    upsellOnDeclineCallback = typeof onDecline === 'function' ? onDecline : null;

    var img = document.getElementById('upsell-product-img');
    var nameEl = document.getElementById('upsell-product-name');
    var priceOld = document.getElementById('upsell-price-old');
    var priceNew = document.getElementById('upsell-price-new');
    if (img) { img.src = offer.image; img.alt = offer.name; }
    if (nameEl) nameEl.textContent = offer.name;
    if (priceOld) priceOld.textContent = formatPrice(offer.priceRegular);
    if (priceNew) priceNew.textContent = formatPrice(offer.priceSale);

    upsellEndAt = Date.now() + UPSELL_DURATION_MS;
    function updateTimer() {
      var left = Math.max(0, upsellEndAt - Date.now());
      var timerEl = document.getElementById('upsell-timer');
      if (timerEl) {
        var m = Math.floor(left / 60000);
        var s = Math.floor((left % 60000) / 1000);
        timerEl.textContent = m + ':' + String(s).padStart(2, '0');
      }
      if (left <= 0) {
        if (typeof upsellOnDeclineCallback === 'function') {
          var cb = upsellOnDeclineCallback;
          upsellOnDeclineCallback = null;
          cb();
        }
        closeUpsellPopup();
      }
    }
    if (upsellTimerInterval) clearInterval(upsellTimerInterval);
    updateTimer();
    upsellTimerInterval = setInterval(updateTimer, 1000);

    var frameSelect = document.getElementById('upsell-frame-color');
    var acceptBtn = document.getElementById('upsell-btn-accept');
    if (acceptBtn) {
      acceptBtn.onclick = function () {
        var frameColor = (frameSelect && frameSelect.value) || 'Branco';
        addToCart({
          name: offer.name,
          image: offer.image,
          url: offer.url,
          priceSale: offer.priceSale,
          priceRegular: offer.priceRegular,
          frameColor: frameColor
        }, true);
        closeUpsellPopup();
        window.location.href = getBasePath() + 'checkout.html';
      };
    }

    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function bindProductCard(btn) {
    const card = btn.closest('.product-card');
    if (!card) return;
    const link = card.querySelector('.product-card__link');
    const url = link?.href || link?.getAttribute('href') || '';
    const base = getBasePath();
    const finalUrl = url.startsWith('http') ? url : (url.startsWith('products/') ? base + url : base + 'products/' + url.split('/').pop());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = finalUrl;
    });
  }

  function bindProductPage(btn) {
    const page = document.querySelector('.product-page');
    if (!page) return;
    const title = page.querySelector('.product-page__title, h1');
    const img = page.querySelector('.product-gallery__main img, .product-page__gallery img, #product-main-image');
    const priceSale = page.querySelector('.price-item--sale');
    const priceReg = page.querySelector('.price-item--regular');
    const frameRadios = page.querySelectorAll('input[name="frame-color"]');
    const variantRadios = page.querySelectorAll('input[name="variant"]');
    const base = getBasePath();
    const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    const url = canonical.split('/').pop() || '';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      let frameColor = 'Branco';
      frameRadios.forEach(r => { if (r.checked) frameColor = r.nextElementSibling?.textContent || r.value || 'Branco'; });
      let option = '';
      variantRadios.forEach(r => { if (r.checked) option = r.value || ''; });
      const product = {
        name: title?.textContent?.trim() || 'Light Box',
        image: img?.src || img?.getAttribute('src') || '',
        url: base + 'products/' + url,
        priceSale: PRICE_SALE,
        priceRegular: PRICE_REGULAR,
        frameColor
      };
      if (option) product.option = option;
      addToCart(product);
    });
  }

  function addQuadroToCart(quadroItem) {
    const quadros = getQuadrosCart();
    quadros.push(quadroItem);
    saveQuadrosCart(quadros);
  }

  function bindRecommendations() {
    const quadrosNoCarrinho = getQuadrosCart();
    document.querySelectorAll('.cart-recommendation__add').forEach(btn => {
      const slide = btn.closest('.cart-recommendation__slide');
      const frameSelect = slide?.querySelector('.cart-recommendation__frame');
      const nomeQuadro = btn.dataset.name || '';
      const jaAdicionado = quadrosNoCarrinho.some(q => q.name === nomeQuadro);
      if (jaAdicionado) {
        btn.disabled = true;
        btn.textContent = 'Adicionado';
        btn.classList.add('is-added');
        if (frameSelect) frameSelect.disabled = true;
      } else {
        if (frameSelect) frameSelect.disabled = false;
      }
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const slide = btn.closest('.cart-recommendation__slide');
        const frameSelect = slide?.querySelector('.cart-recommendation__frame');
        const frameColor = frameSelect ? frameSelect.value : 'Branco';
        const price = parseFloat(btn.dataset.price) || QUADRO_PRICE;
        const priceRegular = btn.dataset.priceRegular ? parseFloat(btn.dataset.priceRegular) : price;
        btn.disabled = true;
        btn.textContent = 'Adicionando...';

        await new Promise(r => setTimeout(r, 600));

        addQuadroToCart({
          id: 'quadro_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name: btn.dataset.name,
          image: btn.dataset.image,
          priceSale: price,
          priceRegular: priceRegular,
          frameColor
        });

        btn.textContent = 'Adicionado';
        btn.classList.add('is-added');
      });
    });
  }

  function init() {
    createCartDrawer();
    updateCartUI();
    if (isFullPrice()) applyFullPriceLightboxPrices();
    window.applyFullPriceLightboxPrices = applyFullPriceLightboxPrices;

    document.querySelectorAll('.product-card__btn-add, .product-card__atc').forEach(bindProductCard);
    document.querySelectorAll('.product-form__atc').forEach(bindProductPage);

    const cartIcon = document.querySelector('#cart-toggle, .header__icon--cart, a[href="/cart"]');
    if (cartIcon) {
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
      });
      if (cartIcon.tagName === 'A') cartIcon.href = '#';
    }

    window.addEventListener('manga_sekai_promo_activated', () => {
      applyPromoToExistingCartItems();
      updateCartUI();
      if (typeof window.applyFullPriceLightboxPrices === 'function') window.applyFullPriceLightboxPrices();
    });

    document.getElementById('cart-close')?.addEventListener('click', closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
    document.getElementById('cart-promo-card-activate')?.addEventListener('click', onProgressActivateClick);
    document.getElementById('cart-checkout')?.addEventListener('click', function () {
      const items = getCart();
      const quadros = getQuadrosCart();
      if (items.length === 0 && quadros.length === 0) return;
      try { if (typeof fbq === 'function') fbq('track', 'InitiateCheckout'); } catch (_) {}
      const base = getBasePath();
      if (items.length === 1 && quadros.length === 0) {
        var offer = getUpsellOffer(items);
        if (offer) {
          closeCart();
          showUpsellPopup(offer, function onDecline() {
            window.location.href = base + 'checkout.html';
          });
          return;
        }
      }
      window.location.href = base + 'checkout.html';
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (document.getElementById('upsell-popup')?.classList.contains('is-open')) closeUpsellPopup();
        else closeCart();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
