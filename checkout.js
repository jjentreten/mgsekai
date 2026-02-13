/**
 * Checkout - Manga Sekai Shop
 * Carrega carrinho do localStorage, exibe resumo e processa formulário.
 * Timer da oferta (sincronizado com a loja) abaixo da logo.
 */
(function () {
  const STORAGE_KEY = 'manga_sekai_cart';
  const STORAGE_KEY_QUADROS = 'manga_sekai_cart_quadros';
  const FULL_PRICE_KEY = 'manga_sekai_full_price';
  const OFFER_ACTIVATED_KEY = 'manga_sekai_offer_activated_at';
  const COUNTDOWN_MINUTES = 15;
  const COUNTDOWN_MS = COUNTDOWN_MINUTES * 60 * 1000;
  const EXTRA_MINUTES = 5;
  const EXTRA_MS = EXTRA_MINUTES * 60 * 1000;
  const PRICE_SALE = 37.10;
  const PRICE_REGULAR = 99.00;
  const PRICE_CARD = 84.10;

  /** Cupons: código (uppercase) -> percentual de desconto */
  const COUPONS = { NEWYEAR10: 10 };
  var appliedCoupon = null;

  function getCouponByCode(code) {
    if (!code || typeof code !== 'string') return null;
    var upper = code.trim().toUpperCase();
    return COUPONS[upper] != null ? { code: upper, percent: COUPONS[upper] } : null;
  }

  function getCouponDiscount(subtotal) {
    var coupon = getCouponByCode(appliedCoupon);
    if (!coupon || subtotal <= 0) return 0;
    return Math.round(subtotal * (coupon.percent / 100) * 100) / 100;
  }

  function isFullPrice() {
    try {
      return localStorage.getItem(FULL_PRICE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function getLightboxPrice(item) {
    if (!item || item.isQuadro) return parsePrice(item?.priceSale);
    return parsePrice(item?.priceSale) || PRICE_SALE;
  }

  function getCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function getQuadrosCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_QUADROS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
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

  function getCardSubtotal(items) {
    if (items.length === 0) return 0;
    const total = items.length;
    let discount = 0;
    if (total >= 3) discount += PRICE_CARD;
    if (total >= 5) discount += PRICE_CARD;
    return total * PRICE_CARD - discount;
  }

  function renderSummary(items) {
    const container = document.getElementById('checkout-items');
    const discountRow = document.getElementById('checkout-discount-row');
    const discountVal = document.getElementById('checkout-discount-value');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const subtotalLabel = document.getElementById('checkout-subtotal-label');
    const totalEl = document.getElementById('checkout-total');
    const savingsRow = document.getElementById('checkout-savings-row');
    const savingsVal = document.getElementById('checkout-savings-value');
    const quadros = getQuadrosCart();
    const quadrosTotal = getQuadrosTotal();

    if (!container) return;

    if (items.length === 0 && quadros.length === 0) {
      container.innerHTML = '<p class="checkout-summary__empty">Seu carrinho está vazio. <a href="index.html">Continuar comprando</a></p>';
      if (subtotalEl) subtotalEl.textContent = 'R$ 0,00';
      if (totalEl) totalEl.textContent = 'R$ 0,00';
      if (discountRow) discountRow.style.display = 'none';
      if (savingsRow) savingsRow.style.display = 'none';
      return;
    }

    const promoDiscount = getPromoDiscount(items);
    const itemsSubtotal = getSubtotal(items);
    const subtotal = itemsSubtotal + quadrosTotal;
    const couponDiscount = getCouponDiscount(subtotal);
    const totalDiscount = promoDiscount + couponDiscount;
    const totalAfterDiscount = subtotal - couponDiscount;

    let html = items.map((item, i) => {
      const isFree = (i === 2) || (i === 4);
      const variantLine = [item.frameColor ? 'Cor: ' + item.frameColor : null, item.option ? 'Opção ' + item.option : null].filter(Boolean).join(' • ');
      const priceSale = getLightboxPrice(item);
      const priceRegular = parsePrice(item.priceRegular);
      const singlePrice = priceSale === priceRegular || isFullPrice();
      const priceHtml = isFree
        ? '<span class="checkout-summary__item-free">Grátis</span>'
        : singlePrice
          ? formatPrice(priceSale)
          : `<span>${formatPrice(priceSale)}</span> <s>${formatPrice(priceRegular)}</s>`;
      return `
        <div class="checkout-summary__item">
          <div class="checkout-summary__item-img-wrap">
            <img src="${item.image}" alt="${item.name}" class="checkout-summary__item-img">
            <span class="checkout-summary__item-qty">1</span>
          </div>
          <div class="checkout-summary__item-info">
            <h4>${item.name}</h4>
            ${variantLine ? `<p class="checkout-summary__item-variant">${variantLine}</p>` : ''}
            ${isFree ? '<p class="checkout-summary__item-promo">PROMO [-' + formatPrice(priceSale) + ']</p>' : ''}
            <div class="checkout-summary__item-price">
              ${priceHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    quadros.forEach((q) => {
      const variantLine = q.frameColor ? 'Cor: ' + q.frameColor : '';
      html += `
        <div class="checkout-summary__item">
          <div class="checkout-summary__item-img-wrap">
            <img src="${q.image}" alt="${q.name}" class="checkout-summary__item-img">
            <span class="checkout-summary__item-qty">1</span>
          </div>
          <div class="checkout-summary__item-info">
            <h4>${q.name}</h4>
            ${variantLine ? `<p class="checkout-summary__item-variant">${variantLine}</p>` : ''}
            <div class="checkout-summary__item-price">${formatPrice(parsePrice(q.priceSale))}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    const totalItens = items.length + quadros.length;
    if (discountRow) discountRow.style.display = totalDiscount > 0 ? 'flex' : 'none';
    if (discountVal) discountVal.textContent = '-' + formatPrice(totalDiscount);
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (subtotalLabel) subtotalLabel.textContent = 'Subtotal • ' + totalItens + ' ' + (totalItens === 1 ? 'item' : 'itens');
    if (totalEl) totalEl.textContent = formatPrice(totalAfterDiscount);
    if (savingsRow) savingsRow.style.display = totalDiscount > 0 ? 'flex' : 'none';
    if (savingsVal) savingsVal.textContent = formatPrice(totalDiscount);
  }

  const SHIPPING_EXPRESS_PRICE = 19.90;
  /** Telefone sempre enviado à gateway, independente do que o lead preenche no checkout */
  const GATEWAY_PHONE = '(11) 99999-9999';


  function getShippingCost() {
    const selected = document.querySelector('input[name="shipping"]:checked');
    return selected?.value === 'express' ? SHIPPING_EXPRESS_PRICE : 0;
  }

  function updateCheckoutShippingAndTotal() {
    const shippingValueEl = document.getElementById('checkout-shipping-value');
    const totalEl = document.getElementById('checkout-total');
    if (!shippingValueEl || !totalEl) return;
    const items = getCart();
    const quadrosTotal = getQuadrosTotal();
    const subtotal = getSubtotal(items) + quadrosTotal;
    const couponDiscount = getCouponDiscount(subtotal);
    const shipping = getShippingCost();
    shippingValueEl.textContent = shipping > 0 ? formatPrice(shipping) : 'Grátis';
    totalEl.textContent = formatPrice(subtotal - couponDiscount + shipping);
    updateParcelasOptions();
  }

  function updateParcelasOptions() {
    var select = document.getElementById('checkout-parcelas');
    if (!select) return;
    const items = getCart();
    const cardSubtotal = getCardSubtotal(items);
    const quadrosTotal = getQuadrosTotal();
    const subtotalForCoupon = getSubtotal(items) + quadrosTotal;
    const couponDiscount = getCouponDiscount(subtotalForCoupon);
    const shipping = getShippingCost();
    const cardTotal = Math.max(0, cardSubtotal + quadrosTotal - couponDiscount + shipping);
    const minParcel = cardTotal * 0.2;
    const maxParcelas = minParcel > 0 ? Math.min(12, Math.floor(cardTotal / minParcel)) : 1;
    var numParcelas = Math.max(1, isNaN(maxParcelas) ? 1 : maxParcelas);
    select.replaceChildren();
    for (var n = 1; n <= numParcelas; n++) {
      const valor = cardTotal / n;
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n === 1 ? '1x de ' + formatPrice(valor) + ' *' : n + 'x de ' + formatPrice(valor) + ' *';
      select.appendChild(opt);
    }
  }

  function renderShippingMethods() {
    var placeholderText = document.getElementById('checkout-shipping-placeholder-text');
    var methodsEl = document.getElementById('shippingMethods');
    var placeholder = document.getElementById('checkout-shipping-placeholder');
    if (!placeholder) return;
    placeholder.classList.add('checkout-form__shipping-placeholder--loaded');
    if (placeholderText) placeholderText.hidden = true;
    if (methodsEl) methodsEl.hidden = false;
    updateCheckoutShippingAndTotal();
  }

  function maskPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    input.value = v;
  }

  function maskCep(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
    input.value = v;
  }

  function maskCpf(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = v;
  }

  function validateCpf(cpf) {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === parseInt(digits[10]);
  }

  function maskCardNumber(input) {
    let v = input.value.replace(/\D/g, '');
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = v;
  }

  function maskExpiry(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
    input.value = v;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  }

  function showError(field, msg) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (el) { el.textContent = msg; el.closest('.checkout-form__field')?.classList.add('has-error'); }
  }

  function clearErrors() {
    document.querySelectorAll('.checkout-form__error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  }

  function init() {
    var p = new URLSearchParams(window.location.search);
    var hasTracking = p.get('utm_source') || p.get('utm_campaign') || p.get('utm_medium') || p.get('utm_content') || p.get('utm_term') || p.get('src') || p.get('sck');
    if (hasTracking) {
      try {
        sessionStorage.setItem('manga_sekai_tracking', JSON.stringify({
          src: p.get('src'),
          sck: p.get('sck'),
          utm_source: p.get('utm_source'),
          utm_campaign: p.get('utm_campaign'),
          utm_medium: p.get('utm_medium'),
          utm_content: p.get('utm_content'),
          utm_term: p.get('utm_term')
        }));
      } catch (_) {}
    }

    const items = getCart();
    renderSummary(items);
    updateParcelasOptions();

    var formCustomer = document.getElementById('formCustomer');
    var formShipping = document.getElementById('formShipping');

    /** [DEBUG] Instrumentação: MutationObserver + value setter para identificar o que altera inputs do cliente após CEP/frete */
    (function () {
      window.__cepFetchDone = false;
      var customerIds = ['checkout-first-name', 'checkout-last-name', 'checkout-email', 'checkout-phone', 'checkout-cpf'];
      var customerFields = document.getElementById('customerFields');
      if (customerFields) {
        var mo = new MutationObserver(function (mutations) {
          if (mutations.length > 0) {
            console.warn('[CHECKOUT DEBUG] #customerFields DOM alterado após CEP/frete!', mutations);
            console.trace('[CHECKOUT DEBUG] Stack:');
          }
        });
        mo.observe(customerFields, { childList: true, subtree: true, attributes: true, characterData: true });
      }
      customerIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        try {
          var proto = Object.getPrototypeOf(el);
          var desc = Object.getOwnPropertyDescriptor(proto, 'value') || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
          if (!desc || !desc.set) return;
          var origSet = desc.set;
          Object.defineProperty(el, 'value', {
            get: desc.get,
            set: function (v) {
              if (window.__cepFetchDone) {
                var cur = desc.get ? desc.get.call(this) : this.getAttribute('value');
                if (String(v) !== String(cur)) {
                  console.warn('[CHECKOUT DEBUG] Input', id, 'value alterado para', JSON.stringify(v), 'após CEP/frete. Função/arquivo:');
                  console.trace();
                }
              }
              origSet.call(this, v);
            },
            configurable: true,
            enumerable: true
          });
        } catch (e) { console.warn('[CHECKOUT DEBUG] Erro ao instrumentar', id, e); }
      });
    })();

    /** Restaura placeholders em Nome, Sobrenome e Nome no cartão - usa getElementById apenas, não roda durante CEP */
    var placeholderFields = [
      { id: 'checkout-first-name', placeholder: 'Nome' },
      { id: 'checkout-last-name', placeholder: 'Sobrenome' },
      { id: 'checkout-card-name', placeholder: 'Nome no cartão' }
    ];
    function restorePlaceholders() {
      placeholderFields.forEach(function (f) {
        var input = document.getElementById(f.id);
        if (!input) return;
        if (!input.value || !input.value.trim()) {
          input.value = '';
          input.setAttribute('placeholder', f.placeholder);
        }
      });
    }
    restorePlaceholders();
    [100, 300].forEach(function (ms) { setTimeout(restorePlaceholders, ms); });

    formShipping?.querySelectorAll('input[name="payment"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.value === 'card') updateParcelasOptions();
      });
    });
    formShipping?.addEventListener('change', function (e) {
      if (e.target && e.target.getAttribute('name') === 'shipping') updateCheckoutShippingAndTotal();
    });

    formCustomer?.querySelector('input[name="phone"]')?.addEventListener('input', function (e) { maskPhone(e.target); });
    formCustomer?.querySelector('input[name="cpf"]')?.addEventListener('input', function (e) { maskCpf(e.target); });
    var cepUi = document.getElementById('cep_ui');
    var cepInput = document.getElementById('checkout-cep');
    var cepOverlay = document.getElementById('checkout-cep-overlay');
    var isCepFetching = false;

    function formatCepMask(digits) {
      if (digits.length <= 5) return digits;
      return digits.slice(0, 5) + '-' + digits.slice(5, 8);
    }

    function syncCepUiToProxy() {
      if (!cepUi || !cepInput) return;
      var digits = (cepUi.value || '').replace(/\D/g, '').slice(0, 8);
      var formatted = formatCepMask(digits);
      cepUi.value = formatted;
      cepInput.value = digits;
      if (digits.length === 8 && !isCepFetching) fetchCep(digits);
    }

    cepUi?.addEventListener('input', function () {
      syncCepUiToProxy();
    });
    cepUi?.addEventListener('paste', function () {
      setTimeout(syncCepUiToProxy, 0);
    });

    document.getElementById('checkout-busca-cep')?.addEventListener('click', function () {
      syncCepUiToProxy();
      var digits = (cepInput?.value || '').replace(/\D/g, '');
      if (digits.length !== 8) {
        showError('postalCode', 'Digite um CEP válido (8 dígitos)');
        return;
      }
      if (!isCepFetching) fetchCep(digits);
    });

    function showCepOverlay(show) {
      if (cepOverlay) {
        if (show) cepOverlay.removeAttribute('hidden');
        else cepOverlay.setAttribute('hidden', '');
      }
    }

    function preserveAddressNumber(currentAddress, newStreet) {
      if (!currentAddress || !newStreet) return newStreet || '';
      var match = currentAddress.match(/[,;]\s*(\d[\d\s\-]*)$/);
      if (match) return (newStreet || '').trim() + ', ' + match[1].trim();
      match = currentAddress.match(/\s+n[º°.]?\s*(\d[\d\s\-]*)$/i);
      if (match) return (newStreet || '').trim() + ', ' + match[1].trim();
      return newStreet || '';
    }

    function fetchCep(cep) {
      isCepFetching = true;
      showCepOverlay(true);
      var placeholder = document.getElementById('checkout-shipping-placeholder');
      var placeholderText = document.getElementById('checkout-shipping-placeholder-text');
      var methodsEl = document.getElementById('shippingMethods');
      if (placeholder) placeholder.classList.remove('checkout-form__shipping-placeholder--loaded');
      if (placeholderText) placeholderText.textContent = 'Carregando fretes disponíveis...';
      if (placeholderText) placeholderText.hidden = false;
      if (methodsEl) methodsEl.hidden = true;
      var minDelay = new Promise(function (resolve) { setTimeout(resolve, 2500); });
      fetch('https://viacep.com.br/ws/' + cep + '/json/')
        .then(function (r) { return r.json(); })
        .then(function (data) { return Promise.all([minDelay, data]); })
        .then(function (result) {
          var data = result[1];
          isCepFetching = false;
          showCepOverlay(false);
          window.__cepFetchDone = true;
          if (data.erro) {
            showError('postalCode', 'CEP não encontrado');
            if (placeholderText) { placeholderText.textContent = 'Insira seu endereço para ver os métodos de envio disponíveis.'; placeholderText.hidden = false; }
            if (methodsEl) methodsEl.hidden = true;
            return;
          }
          clearErrors();
          var addressEl = document.getElementById('checkout-address');
          var cityEl = document.getElementById('checkout-city');
          var stateEl = document.getElementById('checkout-state');
          var logradouro = data.logradouro || '';
          if (addressEl) {
            var currentAddr = (addressEl.value || '').trim();
            addressEl.value = preserveAddressNumber(currentAddr, logradouro);
          }
          if (cityEl) cityEl.value = data.localidade || '';
          if (stateEl) stateEl.value = data.uf || '';
          if (cepUi) cepUi.focus();
          renderShippingMethods();
        })
        .catch(function () {
          minDelay.then(function () {
            isCepFetching = false;
            showCepOverlay(false);
            window.__cepFetchDone = true;
            showError('postalCode', 'Erro ao buscar CEP');
            if (placeholderText) { placeholderText.textContent = 'Insira seu endereço para ver os métodos de envio disponíveis.'; placeholderText.hidden = false; }
            if (methodsEl) methodsEl.hidden = true;
          });
        });
    }
    formShipping?.querySelector('input[name="cardNumber"]')?.addEventListener('input', function (e) { maskCardNumber(e.target); });
    formShipping?.querySelector('input[name="cardExpiry"]')?.addEventListener('input', function (e) { maskExpiry(e.target); });

    document.getElementById('checkout-apply-discount')?.addEventListener('click', () => {
      const input = document.getElementById('checkout-discount-input');
      const code = input?.value?.trim();
      if (!code) {
        alert('Digite um código de desconto.');
        return;
      }
      var coupon = getCouponByCode(code);
      if (coupon) {
        appliedCoupon = coupon.code;
        if (input) input.value = coupon.code;
        alert('Cupom ' + coupon.code + ' aplicado! Você ganhou ' + coupon.percent + '% de desconto.');
        renderSummary(getCart());
        updateCheckoutShippingAndTotal();
      } else {
        appliedCoupon = null;
        alert('Código de desconto não encontrado. Verifique e tente novamente.');
      }
    });

    const summaryToggle = document.getElementById('checkout-summary-toggle');
    if (summaryToggle) {
      summaryToggle.addEventListener('click', () => {
        const expanded = summaryToggle.getAttribute('aria-expanded') === 'true';
        summaryToggle.setAttribute('aria-expanded', !expanded);
      });
    }

    const itemsEl = document.getElementById('checkout-items');
    const scrollHint = document.getElementById('checkout-scroll-hint');
    if (itemsEl && scrollHint) {
      const checkScroll = () => {
        scrollHint.classList.toggle('is-visible', itemsEl.scrollHeight > itemsEl.clientHeight && getCart().length > 2);
      };
      requestAnimationFrame(checkScroll);
      new ResizeObserver(checkScroll).observe(itemsEl);
    }

    document.getElementById('checkout-submit')?.addEventListener('click', function () {
      if (getCart().length === 0) {
        alert('Seu carrinho está vazio. Adicione itens antes de finalizar.');
        return;
      }
      clearErrors();

      var email = formCustomer?.querySelector('input[name="email"]')?.value?.trim() || '';
      var phone = formCustomer?.querySelector('input[name="phone"]')?.value?.trim() || '';
      var firstName = formCustomer?.querySelector('input[name="first_name"]')?.value?.trim() || '';
      var lastName = formCustomer?.querySelector('input[name="last_name"]')?.value?.trim() || '';
      var cpf = formCustomer?.querySelector('input[name="cpf"]')?.value?.trim() || '';
      var postalCode = formShipping?.querySelector('input[name="postalCode"]')?.value?.trim() || '';
      var address = formShipping?.querySelector('input[name="address"]')?.value?.trim() || '';
      var city = formShipping?.querySelector('input[name="city"]')?.value?.trim() || '';
      var state = formShipping?.querySelector('select[name="state"]')?.value || '';
      var payment = formShipping?.querySelector('input[name="payment"]:checked')?.value;

      let valid = true;
      if (!email) { showError('email', 'Email é obrigatório'); valid = false; }
      else if (!validateEmail(email)) { showError('email', 'Email inválido'); valid = false; }
      if (!phone) { showError('phone', 'Telefone é obrigatório'); valid = false; }
      else if (!validatePhone(phone)) { showError('phone', 'Telefone inválido'); valid = false; }
      if (!firstName) { showError('firstName', 'Nome é obrigatório'); valid = false; }
      if (!lastName) { showError('lastName', 'Sobrenome é obrigatório'); valid = false; }
      if (!cpf) { showError('cpf', 'CPF é obrigatório'); valid = false; }
      else if (!validateCpf(cpf)) { showError('cpf', 'CPF inválido'); valid = false; }
      if (!postalCode) { showError('postalCode', 'CEP é obrigatório'); valid = false; }
      if (!address) { showError('address', 'Endereço é obrigatório'); valid = false; }
      if (!city) { showError('city', 'Cidade é obrigatória'); valid = false; }
      if (!state) { showError('state', 'Estado é obrigatório'); valid = false; }
      var shippingSelected = formShipping?.querySelector('input[name="shipping"]:checked');
      if (!shippingSelected) {
        alert('Informe seu CEP e selecione um método de envio antes de continuar.');
        valid = false;
      }

      if (payment === 'card') {
        var cardNumber = formShipping?.querySelector('input[name="cardNumber"]')?.value?.replace(/\s/g, '') || '';
        var cardExpiry = formShipping?.querySelector('input[name="cardExpiry"]')?.value || '';
        var cardCvv = formShipping?.querySelector('input[name="cardCvv"]')?.value || '';
        var cardName = formShipping?.querySelector('input[name="cardName"]')?.value?.trim() || '';
        if (cardNumber.length < 13) { valid = false; /* add error */ }
        if (!cardExpiry || cardExpiry.length < 5) { valid = false; }
        if (!cardCvv || cardCvv.length < 3) { valid = false; }
        if (!cardName) { valid = false; }
      }

      if (!valid) return;

      if (payment === 'pix') {
        const items = getCart();
        const quadros = getQuadrosCart();
        const subtotal = getSubtotal(items);
        const quadrosTotal = getQuadrosTotal();
        const subtotalComQuadros = subtotal + quadrosTotal;
        const couponDiscount = getCouponDiscount(subtotalComQuadros);
        const shipping = getShippingCost();
        const total = subtotalComQuadros - couponDiscount + shipping;
        const totalStr = total.toFixed(2).replace('.', ',');

        const apiItems = [];
        items.forEach(function (item, i) {
          const isFree = i === 2 || i === 4;
          const price = isFree ? 0 : getLightboxPrice(item);
          apiItems.push({ name: item.name, price: price, quantity: 1, tangible: true, id: item.id });
        });
        quadros.forEach(function (q) {
          const price = parsePrice(q.priceSale);
          apiItems.push({ name: q.name, price: price, quantity: 1, tangible: true, id: q.id });
        });

        const customer = {
          name: firstName + ' ' + lastName,
          email: email,
          phone: GATEWAY_PHONE,
          document: { number: cpf.replace(/\D/g, ''), type: 'cpf' }
        };

        var params = new URLSearchParams(window.location.search);
        var trackingParameters = {
          src: params.get('src') || null,
          sck: params.get('sck') || null,
          utm_source: params.get('utm_source') || null,
          utm_campaign: params.get('utm_campaign') || null,
          utm_medium: params.get('utm_medium') || null,
          utm_content: params.get('utm_content') || null,
          utm_term: params.get('utm_term') || null
        };
        try {
          var stored = sessionStorage.getItem('manga_sekai_tracking');
          if (stored) {
            var parsed = JSON.parse(stored);
            if (!trackingParameters.src && parsed.src) trackingParameters.src = parsed.src;
            if (!trackingParameters.sck && parsed.sck) trackingParameters.sck = parsed.sck;
            if (!trackingParameters.utm_source && parsed.utm_source) trackingParameters.utm_source = parsed.utm_source;
            if (!trackingParameters.utm_campaign && parsed.utm_campaign) trackingParameters.utm_campaign = parsed.utm_campaign;
            if (!trackingParameters.utm_medium && parsed.utm_medium) trackingParameters.utm_medium = parsed.utm_medium;
            if (!trackingParameters.utm_content && parsed.utm_content) trackingParameters.utm_content = parsed.utm_content;
            if (!trackingParameters.utm_term && parsed.utm_term) trackingParameters.utm_term = parsed.utm_term;
          }
        } catch (_) {}

        var submitBtn = document.getElementById('checkout-submit');
        const origText = submitBtn?.textContent;
        if (submitBtn) submitBtn.disabled = true;
        if (origText) submitBtn.textContent = 'Gerando PIX...';

        const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
        fetch(apiBase + '/api/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ total: total, items: apiItems, customer: customer, trackingParameters: trackingParameters })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success && (data.qrcode || data.secureUrl)) {
              try {
                sessionStorage.setItem('manga_sekai_pix_qrcode', data.qrcode || '');
                sessionStorage.setItem('manga_sekai_pix_secureUrl', data.secureUrl || '');
                sessionStorage.setItem('manga_sekai_pix_amount', String(total));
                if (data.transactionId) sessionStorage.setItem('manga_sekai_pix_transaction_id', String(data.transactionId));
                sessionStorage.setItem('manga_sekai_pix_email', email);
              } catch (_) {}
              window.location.href = 'pix-payment.html?total=' + encodeURIComponent(totalStr);
            } else {
              alert(data.error || 'Erro ao gerar PIX. Tente novamente.');
            }
          })
          .catch(function (err) {
            alert('Erro ao conectar. Verifique se o servidor está rodando e tente novamente.');
            console.error(err);
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
            if (origText) submitBtn.textContent = origText;
          });
        return;
      }

      if (payment === 'card') {
        showCardProcessingModal();
        return;
      }

      alert('Pedido recebido! Em breve você receberá a confirmação por email e telefone.\n\n(Esta é uma demonstração - integração com gateway em breve.)');
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = 'index.html';
    });

    function showCardProcessingModal() {
      const modal = document.getElementById('checkout-modal');
      const loading = document.getElementById('checkout-modal-loading');
      const error = document.getElementById('checkout-modal-error');
      const msgSecondary = document.getElementById('checkout-modal-msg-secondary');
      if (!modal || !loading || !error) return;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('checkout-modal--open');
      loading.style.display = '';
      error.style.display = 'none';
      msgSecondary.style.opacity = '0';

      setTimeout(() => {
        if (msgSecondary) msgSecondary.style.opacity = '1';
      }, 2200);

      setTimeout(() => {
        loading.style.display = 'none';
        error.style.display = '';
      }, 4500);
    }

    function closeCardModal() {
      const modal = document.getElementById('checkout-modal');
      if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('checkout-modal--open');
      }
    }

    document.getElementById('checkout-modal-btn-close')?.addEventListener('click', closeCardModal);
    document.querySelector('.checkout-modal__backdrop')?.addEventListener('click', closeCardModal);
    document.getElementById('checkout-modal-btn-pix')?.addEventListener('click', () => {
      const pixRadio = document.querySelector('input[name="payment"][value="pix"]');
      if (pixRadio) {
        pixRadio.checked = true;
        pixRadio.closest('.checkout-form__payment-option')?.scrollIntoView({ behavior: 'smooth' });
      }
      closeCardModal();
    });

    initCheckoutOfferCountdown();
  }

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

  function initCheckoutOfferCountdown() {
    const bar = document.getElementById('checkout-offer-countdown');
    const timeEl = document.getElementById('checkout-offer-time');
    if (!bar || !timeEl) return;

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

    let countdownInterval = null;
    let currentActivatedAt = getActivatedAt();
    let currentDurationMs = COUNTDOWN_MS;

    if (currentActivatedAt == null) return;

    const now = Date.now();
    const endAt = currentActivatedAt + currentDurationMs;
    if (now >= endAt) {
      clearActivatedAt();
      return;
    }

    bar.removeAttribute('hidden');
    bar.classList.add('is-visible');

    function runTick() {
      const now = Date.now();
      const endAt = currentActivatedAt + currentDurationMs;
      const msLeft = endAt - now;
      if (msLeft <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = null;
        timeEl.textContent = '0:00';
        showExpiredPopup(
          function () {
            currentActivatedAt = Date.now();
            currentDurationMs = EXTRA_MS;
            setActivatedAt(currentActivatedAt);
            bar.removeAttribute('hidden');
            bar.classList.add('is-visible');
            runTick();
            countdownInterval = setInterval(runTick, 1000);
          },
          function () {
            clearActivatedAt();
            bar.setAttribute('hidden', '');
            bar.classList.remove('is-visible');
          }
        );
        return;
      }
      timeEl.textContent = formatCountdown(msLeft);
    }

    runTick();
    countdownInterval = setInterval(runTick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
