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

  /** Cupons: código (uppercase) -> { actual: % real, display: % exibido ao lead } */
  const COUPONS = { NEWYEAR10: { actual: 9.5, display: 10 } };
  var appliedCoupon = null;

  function getCouponByCode(code) {
    if (!code || typeof code !== 'string') return null;
    var upper = code.trim().toUpperCase();
    var c = COUPONS[upper];
    if (!c) return null;
    var data = typeof c === 'object' ? c : { actual: c, display: c };
    return { code: upper, percent: data.actual, displayPercent: data.display };
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

  /** Código de frete: SOMENTE altera #shippingOptions, hidden/display de #shippingHint, #shippingLoading, #shippingOptions */
  var shippingGuardObserver = null;

  function renderShippingOptionsContent() {
    var container = document.getElementById('shippingOptions');
    if (!container) return;
    container.innerHTML = '<label class="checkout-form__shipping-option"><input type="radio" name="shipping" value="express"><span class="checkout-form__shipping-label"><strong>Entrega Expressa</strong><span class="checkout-form__shipping-days">1 à 3 dias úteis</span></span><span class="checkout-form__shipping-price">R$ 19,90</span></label><label class="checkout-form__shipping-option"><input type="radio" name="shipping" value="free" checked><span class="checkout-form__shipping-label"><strong>Entrega Grátis</strong><span class="checkout-form__shipping-days">3 à 5 dias úteis</span></span><span class="checkout-form__shipping-price checkout-form__shipping-price--free">Grátis</span></label>';
  }

  function syncShippingUIState() {
    var stateSelect = document.getElementById('checkout-state');
    var hintEl = document.getElementById('shippingHint');
    var loadingEl = document.getElementById('shippingLoading');
    var optionsEl = document.getElementById('shippingOptions');
    var stateVal = stateSelect ? (stateSelect.value || '').trim() : '';
    var freightLoaded = !!stateVal;

    if (!freightLoaded) {
      if (hintEl) { hintEl.hidden = false; }
      if (loadingEl) { loadingEl.hidden = true; }
      if (optionsEl) { optionsEl.hidden = true; }
    } else {
      if (hintEl) { hintEl.hidden = true; }
      if (loadingEl) { loadingEl.hidden = true; }
      if (optionsEl) {
        renderShippingOptionsContent();
        optionsEl.hidden = false;
      }
      updateCheckoutShippingAndTotal();
    }
  }

  function showShippingLoading() {
    var hintEl = document.getElementById('shippingHint');
    var loadingEl = document.getElementById('shippingLoading');
    var optionsEl = document.getElementById('shippingOptions');
    if (hintEl) hintEl.hidden = true;
    if (loadingEl) loadingEl.hidden = false;
    if (optionsEl) optionsEl.hidden = true;
  }

  function hideShippingLoading() {
    var loadingEl = document.getElementById('shippingLoading');
    if (loadingEl) loadingEl.hidden = true;
  }

  function startShippingGuard() {
    var customerFields = document.getElementById('customerFields');
    if (!customerFields || shippingGuardObserver) return;
    shippingGuardObserver = new MutationObserver(function (mutations) {
      if (mutations.length) {
        console.warn('[shipping] DOM modificado fora de #shippingBlock durante cálculo de frete');
        console.trace();
      }
    });
    shippingGuardObserver.observe(customerFields, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'style', 'class'] });
  }

  function stopShippingGuard() {
    if (shippingGuardObserver) {
      shippingGuardObserver.disconnect();
      shippingGuardObserver = null;
    }
  }

  function showShippingLoadingThenMethods(onDone) {
    startShippingGuard();
    showShippingLoading();
    setTimeout(function () {
      hideShippingLoading();
      var optionsEl = document.getElementById('shippingOptions');
      if (optionsEl) {
        renderShippingOptionsContent();
        optionsEl.hidden = false;
      }
      updateCheckoutShippingAndTotal();
      stopShippingGuard();
      if (typeof onDone === 'function') onDone();
    }, 1800);
  }

  function renderShippingMethods() {
    syncShippingUIState();
  }

  function maskPhone(input) {
    if (!input) return;
    let v = digitsOnly(input.value);
    if (v.startsWith('55') && v.length > 11) v = v.slice(2);
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

  function digitsOnly(val) {
    return (val || '').replace(/\D/g, '');
  }

  function validatePhone(phone) {
    let d = digitsOnly(phone);
    if (d.startsWith('55') && d.length > 11) d = d.slice(2);
    return d.length >= 10 && d.length <= 11;
  }

  function showError(field, msg) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (el) { el.textContent = msg; el.closest('.checkout-form__field')?.classList.add('has-error'); }
  }

  function clearErrors() {
    document.querySelectorAll('.checkout-form__error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
  }

  function setCheckoutStep(stepNumber) {
    var container = document.getElementById('checkoutSteps');
    if (!container || stepNumber < 1 || stepNumber > 3) return;
    container.setAttribute('data-step', String(stepNumber));
    var steps = container.querySelectorAll('.step');
    steps.forEach(function (step, i) {
      var num = i + 1;
      step.classList.remove('is-done', 'is-active');
      step.removeAttribute('aria-current');
      if (num < stepNumber) step.classList.add('is-done');
      else if (num === stepNumber) {
        step.classList.add('is-active');
        step.setAttribute('aria-current', 'step');
      }
    });
  }

  function goToStep(stepNum) {
    var stepPersonal = document.getElementById('stepPersonal');
    var stepDelivery = document.getElementById('stepDelivery');
    var stepPayment = document.getElementById('stepPayment');
    if (!stepPersonal || !stepDelivery || !stepPayment) return;
    setCheckoutStep(stepNum);
    stepPersonal.classList.toggle('step-checkout__card--active', stepNum === 1);
    stepPersonal.classList.toggle('step-checkout__card--collapsed', stepNum !== 1);
    stepPersonal.setAttribute('aria-expanded', stepNum === 1 ? 'true' : 'false');
    stepPersonal.querySelector('.step-checkout__card-teaser')?.classList.toggle('step-checkout__card-teaser--hidden', stepNum === 1);
    stepPersonal.querySelector('.step-checkout__card-content')?.classList.toggle('step-checkout__card-content--hidden', stepNum !== 1);
    if (stepNum === 2) updateStepPersonalSummary();
    stepDelivery.classList.toggle('step-checkout__card--active', stepNum === 2);
    stepDelivery.classList.toggle('step-checkout__card--collapsed', stepNum !== 2);
    stepDelivery.setAttribute('aria-expanded', stepNum === 2 ? 'true' : 'false');
    stepDelivery.querySelector('.step-checkout__card-teaser')?.classList.toggle('step-checkout__card-teaser--hidden', stepNum === 2);
    stepDelivery.querySelector('.step-checkout__card-content')?.classList.toggle('step-checkout__card-content--hidden', stepNum !== 2);
    if (stepNum === 1 || stepNum === 3) updateStepDeliverySummary();
    if (stepNum === 2) {
      var btnEscolher = document.getElementById('btnEscolherFrete');
      var btnCont2 = document.getElementById('btnStep2Continue');
      if (btnEscolher) { btnEscolher.style.display = ''; btnEscolher.disabled = true; }
      if (btnCont2) btnCont2.style.display = 'none';
      checkDeliveryAddressComplete();
    }
    stepPayment.classList.toggle('step-checkout__card--active', stepNum === 3);
    stepPayment.classList.toggle('step-checkout__card--collapsed', stepNum !== 3);
    stepPayment.setAttribute('aria-expanded', stepNum === 3 ? 'true' : 'false');
    stepPayment.querySelector('.step-checkout__card-teaser')?.classList.toggle('step-checkout__card-teaser--hidden', stepNum === 3);
    stepPayment.querySelector('.step-checkout__card-content')?.classList.toggle('step-checkout__card-content--hidden', stepNum !== 3);
  }

  function validateStep1(formCustomer) {
    var email = formCustomer?.querySelector('input[name="email"]')?.value?.trim() || '';
    var phoneInput = document.getElementById('checkout-phone');
    var phoneDigits = phoneInput ? digitsOnly(phoneInput.value) : '';
    var phone = phoneInput ? phoneInput.value.trim() : '';
    var firstName = formCustomer?.querySelector('input[name="first_name"]')?.value?.trim() || '';
    var cpf = formCustomer?.querySelector('input[name="cpf"]')?.value?.trim() || '';
    clearErrors();
    var valid = true;
    if (!email) { showError('email', 'Email é obrigatório'); valid = false; }
    else if (!validateEmail(email)) { showError('email', 'Email inválido'); valid = false; }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) { showError('phone', 'Telefone inválido (mín. 10 dígitos)'); valid = false; }
    else if (phone && !validatePhone(phone)) { showError('phone', 'Telefone inválido'); valid = false; }
    if (!firstName) { showError('firstName', 'Nome é obrigatório'); valid = false; }
    if (!cpf) { showError('cpf', 'CPF é obrigatório'); valid = false; }
    else if (!validateCpf(cpf)) { showError('cpf', 'CPF inválido'); valid = false; }
    return valid;
  }

  function checkPersonalComplete() {
    var fn = document.getElementById('checkout-first-name')?.value?.trim() || '';
    var em = document.getElementById('checkout-email')?.value?.trim() || '';
    var ph = document.getElementById('checkout-phone')?.value?.trim() || '';
    var cpf = document.getElementById('checkout-cpf')?.value?.trim() || '';
    var ok = fn && em && validateEmail(em) && cpf && validateCpf(cpf) && (!ph || validatePhone(ph));
    var btn = document.getElementById('btnStep1Continue');
    if (btn) btn.disabled = !ok;
  }

  function validateStep2(formShipping) {
    var postalCode = formShipping?.querySelector('input[name="postalCode"]')?.value?.trim() || '';
    var address = formShipping?.querySelector('input[name="address"]')?.value?.trim() || '';
    var addressNumber = formShipping?.querySelector('input[name="addressNumber"]')?.value?.trim() || '';
    var neighborhood = formShipping?.querySelector('input[name="neighborhood"]')?.value?.trim() || '';
    var city = formShipping?.querySelector('input[name="city"]')?.value?.trim() || '';
    var state = formShipping?.querySelector('select[name="state"]')?.value || '';
    var shippingSelected = formShipping?.querySelector('input[name="shipping"]:checked');
    clearErrors();
    var valid = true;
    if (!postalCode) { showError('postalCode', 'CEP é obrigatório'); valid = false; }
    else if (postalCode.replace(/\D/g, '').length !== 8) { showError('postalCode', 'CEP deve ter 8 dígitos'); valid = false; }
    if (!address) { showError('address', 'Endereço é obrigatório'); valid = false; }
    if (!addressNumber) { showError('addressNumber', 'Número é obrigatório'); valid = false; }
    if (!neighborhood) { showError('neighborhood', 'Bairro é obrigatório'); valid = false; }
    if (!city) { showError('city', 'Cidade é obrigatória'); valid = false; }
    if (!state) { showError('state', 'Estado é obrigatório'); valid = false; }
    if (!shippingSelected) {
      alert('Selecione um método de envio antes de continuar.');
      valid = false;
    }
    return valid;
  }

  function updateStepPersonalSummary() {
    var fn = document.getElementById('checkout-first-name')?.value?.trim() || '';
    var em = document.getElementById('checkout-email')?.value?.trim() || '';
    var ph = document.getElementById('checkout-phone')?.value?.trim() || '';
    var cpf = document.getElementById('checkout-cpf')?.value?.trim() || '';
    var nameEl = document.getElementById('summaryName');
    var emailEl = document.getElementById('summaryEmail');
    var phoneEl = document.getElementById('summaryPhone');
    var cpfEl = document.getElementById('summaryCpf');
    if (nameEl) nameEl.textContent = fn || '—';
    if (emailEl) emailEl.textContent = em || '—';
    if (phoneEl) phoneEl.textContent = ph || '—';
    if (cpfEl) cpfEl.textContent = cpf || '—';
  }

  function updateStepDeliverySummary() {
    var address = document.getElementById('checkout-address')?.value?.trim() || '';
    var number = document.getElementById('checkout-address-number')?.value?.trim() || '';
    var neighborhood = document.getElementById('checkout-neighborhood')?.value?.trim() || '';
    var city = document.getElementById('checkout-city')?.value?.trim() || '';
    var stateVal = document.getElementById('checkout-state')?.value || '';
    var postalCode = document.getElementById('checkout-postalCode')?.value?.replace(/\D/g, '') || '';
    var addrEl = document.getElementById('summaryAddress');
    var neighborhoodCityEl = document.getElementById('summaryNeighborhoodCity');
    var cepEl = document.getElementById('summaryCep');
    var hintEl = document.getElementById('stepDeliveryHint');
    var descEl = document.getElementById('stepDeliveryDesc');
    var summaryEl = document.getElementById('stepDeliveryDataSummary');
    var btnEditDelivery = document.getElementById('btnEditDelivery');
    var hasData = address && number && neighborhood && city && stateVal && postalCode.length === 8;
    if (hintEl) hintEl.style.display = hasData ? 'none' : '';
    if (descEl) descEl.style.display = hasData ? '' : 'none';
    if (summaryEl) summaryEl.style.display = hasData ? '' : 'none';
    if (btnEditDelivery) btnEditDelivery.style.display = hasData ? '' : 'none';
    var addrLine = [address, number].filter(Boolean).join(', ') || '—';
    var cityState = stateVal && city ? city + '/' + stateVal : city || stateVal || '—';
    var cepFormatted = postalCode.length === 8 ? postalCode : '—';
    if (addrEl) addrEl.textContent = addrLine;
    if (neighborhoodCityEl) neighborhoodCityEl.textContent = [neighborhood, cityState].filter(Boolean).join(', ') || '—';
    if (cepEl) cepEl.textContent = cepFormatted;
  }

  var cepModalShownAt = 0;
  var phoneSnapshotBeforeCep = '';

  function protectPhoneAfterCep() {
    var phoneEl = document.getElementById('checkout-phone');
    if (!phoneEl) return;
    var cur = digitsOnly(phoneEl.value);
    if (phoneSnapshotBeforeCep !== '' && cur !== phoneSnapshotBeforeCep) {
      phoneEl.value = phoneSnapshotBeforeCep;
      maskPhone(phoneEl);
      console.warn('Phone altered after CEP fill – restored from snapshot', new Error().stack);
    }
  }

  function showCepLoadingModal() {
    cepModalShownAt = Date.now();
    var modal = document.getElementById('cep-loading-modal');
    if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  }
  function hideCepLoadingModal() {
    var minVisible = 2400;
    var elapsed = Date.now() - cepModalShownAt;
    var delay = Math.max(0, minVisible - elapsed);
    var modal = document.getElementById('cep-loading-modal');
    function close() {
      if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
    }
    if (delay > 0) setTimeout(close, delay);
    else close();
  }

  function applyCepToForm(data) {
    var addr = document.getElementById('checkout-address');
    var neigh = document.getElementById('checkout-neighborhood');
    var city = document.getElementById('checkout-city');
    var state = document.getElementById('checkout-state');
    var street = data.street || data.logradouro || '';
    var neighborhood = data.neighborhood || data.bairro || '';
    var cityName = data.city || data.localidade || '';
    var stateUf = data.state || data.uf || '';
    if (addr) addr.value = street;
    if (neigh) neigh.value = neighborhood;
    if (city) city.value = cityName;
    if (state) state.value = stateUf;
    var revealEl = document.getElementById('addressFieldsReveal');
    if (revealEl) revealEl.removeAttribute('hidden');
    checkDeliveryAddressComplete();
    runProtectPhoneAndLog();
  }

  function showCepNotFound(statusEl) {
    if (statusEl) statusEl.textContent = 'CEP não encontrado';
    var revealEl = document.getElementById('addressFieldsReveal');
    if (revealEl) revealEl.setAttribute('hidden', '');
    runProtectPhoneAndLog();
  }

  function fetchCep(cep) {
    var digitsCep = digitsOnly(cep);
    if (digitsCep.length !== 8) return;
    // Não usar innerHTML/replaceWith/outerHTML no form nem form.reset() durante o CEP.

    var phoneEl = document.getElementById('checkout-phone');
    phoneSnapshotBeforeCep = phoneEl ? digitsOnly(phoneEl.value) : '';

    var statusEl = document.getElementById('cepStatus');
    if (statusEl) statusEl.textContent = 'Procurando CEP...';
    showCepLoadingModal();

    function onSuccess(data) {
      hideCepLoadingModal();
      if (statusEl) statusEl.textContent = '';
      if (data.erro) {
        showCepNotFound(statusEl);
        return;
      }
      applyCepToForm(data);
    }

    function onError() {
      hideCepLoadingModal();
      if (statusEl) statusEl.textContent = 'Erro ao buscar';
      var revealEl = document.getElementById('addressFieldsReveal');
      if (revealEl) revealEl.setAttribute('hidden', '');
      checkDeliveryAddressComplete();
      runProtectPhoneAndLog();
    }

    // BrasilAPI (multi-provider, incl. fallback) — primary
    fetch('https://brasilapi.com.br/api/cep/v1/' + digitsCep)
      .then(function (r) {
        if (r.ok) return r.json();
        if (r.status === 404) return null;
        throw new Error('BrasilAPI error');
      })
      .then(function (data) {
        if (data) {
          onSuccess(data);
          return;
        }
        // Fallback: ViaCEP
        return fetch('https://viacep.com.br/ws/' + digitsCep + '/json/').then(function (r) { return r.json(); });
      })
      .then(function (data) {
        if (!data) return;
        if (data.erro) {
          hideCepLoadingModal();
          if (statusEl) statusEl.textContent = 'CEP não encontrado';
          showCepNotFound(statusEl);
          return;
        }
        onSuccess(data);
      })
      .catch(function () {
        onError();
      });
  }

  function runProtectPhoneAndLog() {
    var phoneEl = document.getElementById('checkout-phone');
    var after = phoneEl ? digitsOnly(phoneEl.value) : '';
    console.log('phone before/after CEP', phoneSnapshotBeforeCep, after);
    if (phoneSnapshotBeforeCep !== '' && after !== phoneSnapshotBeforeCep) {
      console.warn('Phone altered after CEP fill', new Error().stack);
    }
    protectPhoneAfterCep();
    setTimeout(protectPhoneAfterCep, 0);
    setTimeout(protectPhoneAfterCep, 150);
  }

  function checkDeliveryAddressComplete() {
    var cep = document.getElementById('checkout-postalCode')?.value?.replace(/\D/g, '') || '';
    var address = document.getElementById('checkout-address')?.value?.trim() || '';
    var number = document.getElementById('checkout-address-number')?.value?.trim() || '';
    var neighborhood = document.getElementById('checkout-neighborhood')?.value?.trim() || '';
    var btn = document.getElementById('btnEscolherFrete');
    var complete = cep.length === 8 && address && number && neighborhood;
    if (btn) { btn.disabled = !complete; }
  }

  var AUTOFILL_SYNC_INPUT_IDS = ['checkout-first-name', 'checkout-email', 'checkout-phone'];

  function syncPlaceholdersAndHasValue() {
    AUTOFILL_SYNC_INPUT_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var wrapper = input.closest('.checkout-form__field') || input.closest('.checkout-form__input-wrap') || input.parentElement;
      var hasValue = (input.value || '').trim().length > 0;
      if (id === 'checkout-first-name') {
        var fakePh = document.getElementById('checkout-first-name-placeholder');
        if (fakePh) fakePh.classList.toggle('is-hidden', hasValue);
      } else {
        if (!input.hasAttribute('data-placeholder')) input.setAttribute('data-placeholder', input.placeholder || '');
        input.placeholder = hasValue ? '' : (input.getAttribute('data-placeholder') || '');
      }
      if (wrapper) {
        if (hasValue) wrapper.classList.add('has-value');
        else wrapper.classList.remove('has-value');
      }
    });
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

    [0, 100, 300, 800].forEach(function (ms) { setTimeout(syncPlaceholdersAndHasValue, ms); });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncPlaceholdersAndHasValue);
      window.addEventListener('load', syncPlaceholdersAndHasValue);
    } else {
      syncPlaceholdersAndHasValue();
    }
    document.addEventListener('animationstart', function (e) {
      if (e.animationName === 'onAutoFillStart' || e.animationName === 'onAutoFillCancel') syncPlaceholdersAndHasValue();
    }, true);
    AUTOFILL_SYNC_INPUT_IDS.forEach(function (id) {
      var input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', syncPlaceholdersAndHasValue);
        input.addEventListener('change', syncPlaceholdersAndHasValue);
        input.addEventListener('blur', syncPlaceholdersAndHasValue);
      }
    });

    formCustomer?.querySelector('input[name="phone"]')?.addEventListener('input', function (e) {
      var el = e.target;
      maskPhone(el);
      phoneSnapshotBeforeCep = digitsOnly(el.value);
      checkPersonalComplete();
    });
    formCustomer?.querySelector('input[name="phone"]')?.addEventListener('change', function (e) {
      phoneSnapshotBeforeCep = digitsOnly(e.target.value);
    });
    formCustomer?.querySelector('input[name="cpf"]')?.addEventListener('input', function (e) { maskCpf(e.target); checkPersonalComplete(); });
    formCustomer?.addEventListener('input', checkPersonalComplete);
    formCustomer?.addEventListener('change', checkPersonalComplete);
    checkPersonalComplete();

    (function syncNamePlaceholder() {
      var inp = document.getElementById('checkout-first-name');
      var ph = document.getElementById('checkout-first-name-placeholder');
      if (!inp || !ph) return;
      function update() {
        ph.classList.toggle('is-hidden', (inp.value || '').trim().length > 0);
      }
      inp.addEventListener('input', update);
      inp.addEventListener('change', update);
      update();
    })();
    (function syncCardNamePlaceholder() {
      var inp = document.getElementById('checkout-card-name');
      var ph = document.getElementById('checkout-card-name-placeholder');
      if (!inp || !ph) return;
      inp.setAttribute('readonly', 'readonly');
      function update() {
        var hasVal = (inp.value || '').trim().length > 0;
        ph.classList.toggle('is-hidden', hasVal);
      }
      inp.addEventListener('focus', function () {
        inp.removeAttribute('readonly');
        update();
      });
      inp.addEventListener('input', update);
      inp.addEventListener('change', update);
      inp.addEventListener('blur', update);
      update();
      [100, 300, 600].forEach(function (ms) { setTimeout(update, ms); });
    })();
    formShipping?.querySelector('input[name="postalCode"]')?.addEventListener('input', function (e) {
      maskCep(e.target);
      var digits = e.target.value.replace(/\D/g, '');
      if (digits.length === 8) fetchCep(e.target.value);
    });
    formShipping?.querySelectorAll('input[name="address"], input[name="addressNumber"], input[name="neighborhood"]').forEach(function (inp) {
      inp.addEventListener('input', checkDeliveryAddressComplete);
    });
    updateStepDeliverySummary();

    document.getElementById('btnEditPersonal')?.addEventListener('click', function () { goToStep(1); });
    document.getElementById('btnEditDelivery')?.addEventListener('click', function () { goToStep(2); });
    document.getElementById('btnEscolherFrete')?.addEventListener('click', function () {
      var btnContinue = document.getElementById('btnStep2Continue');
      var btnShipping = document.getElementById('btnEscolherFrete');
      if (btnShipping) btnShipping.style.display = 'none';
      showShippingLoadingThenMethods(function () {
        if (btnContinue) btnContinue.style.display = '';
      });
    });

    function updateSubmitButtonText() {
      var btn = document.getElementById('checkout-submit');
      if (!btn) return;
      var payment = formShipping?.querySelector('input[name="payment"]:checked')?.value;
      btn.textContent = payment === 'pix' ? 'Ir para Mercado Pago' : 'Finalizar compra';
    }
    updateSubmitButtonText();
    formShipping?.querySelectorAll('input[name="payment"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        updateSubmitButtonText();
        if (radio.value === 'card') updateParcelasOptions();
      });
    });
    formShipping?.addEventListener('change', function (e) {
      if (e.target && e.target.getAttribute('name') === 'shipping') updateCheckoutShippingAndTotal();
    });

    (function () {
      var stateSelect = document.getElementById('checkout-state');
      syncShippingUIState();
      stateSelect?.addEventListener('change', function () {
        var val = stateSelect ? (stateSelect.value || '').trim() : '';
        if (val) showShippingLoadingThenMethods();
        else syncShippingUIState();
      });
    })();

    formShipping?.querySelector('input[name="cardNumber"]')?.addEventListener('input', function (e) { maskCardNumber(e.target); });
    formShipping?.querySelector('input[name="cardExpiry"]')?.addEventListener('input', function (e) { maskExpiry(e.target); });

    document.getElementById('btnStep1Continue')?.addEventListener('click', function () {
      if (validateStep1(formCustomer)) {
        updateStepPersonalSummary();
        goToStep(2);
      }
    });
    document.getElementById('btnStep2Continue')?.addEventListener('click', function () {
      if (validateStep2(formShipping)) goToStep(3);
    });

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
        alert('Cupom ' + coupon.code + ' aplicado! Você ganhou ' + (coupon.displayPercent != null ? coupon.displayPercent : coupon.percent) + '% de desconto.');
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
      var phoneElSubmit = document.getElementById('checkout-phone');
      var phoneRawSubmit = phoneElSubmit ? digitsOnly(phoneElSubmit.value) : '';
      var phone = phoneElSubmit ? phoneElSubmit.value.trim() : '';
      var firstName = formCustomer?.querySelector('input[name="first_name"]')?.value?.trim() || '';
      var cpf = formCustomer?.querySelector('input[name="cpf"]')?.value?.trim() || '';
      var postalCode = formShipping?.querySelector('input[name="postalCode"]')?.value?.trim() || '';
      var address = formShipping?.querySelector('input[name="address"]')?.value?.trim() || '';
      var city = formShipping?.querySelector('input[name="city"]')?.value?.trim() || '';
      var state = formShipping?.querySelector('select[name="state"]')?.value || '';
      var payment = formShipping?.querySelector('input[name="payment"]:checked')?.value;

      let valid = true;
      if (!email) { showError('email', 'Email é obrigatório'); valid = false; }
      else if (!validateEmail(email)) { showError('email', 'Email inválido'); valid = false; }
      /* Telefone não é obrigatório aqui: gateway recebe número padrão. Obrigatório só no step Dados Pessoais (Continuar). */
      if (!firstName) { showError('firstName', 'Nome é obrigatório'); valid = false; }
      if (!cpf) { showError('cpf', 'CPF é obrigatório'); valid = false; }
      else if (!validateCpf(cpf)) { showError('cpf', 'CPF inválido'); valid = false; }
      var addressNumber = formShipping?.querySelector('input[name="addressNumber"]')?.value?.trim() || '';
      var neighborhood = formShipping?.querySelector('input[name="neighborhood"]')?.value?.trim() || '';
      if (!postalCode) { showError('postalCode', 'CEP é obrigatório'); valid = false; }
      else if (postalCode.replace(/\D/g, '').length !== 8) { showError('postalCode', 'CEP deve ter 8 dígitos'); valid = false; }
      if (!address) { showError('address', 'Endereço é obrigatório'); valid = false; }
      if (!addressNumber) { showError('addressNumber', 'Número é obrigatório'); valid = false; }
      if (!neighborhood) { showError('neighborhood', 'Bairro é obrigatório'); valid = false; }
      if (!city) { showError('city', 'Cidade é obrigatória'); valid = false; }
      if (!state) { showError('state', 'Estado é obrigatório'); valid = false; }
      var shippingSelected = formShipping?.querySelector('input[name="shipping"]:checked');
      if (!shippingSelected) {
        alert('Selecione um método de envio antes de continuar.');
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
        var items = getCart();
        var quadros = getQuadrosCart();
        var subtotal = getSubtotal(items);
        var quadrosTotal = getQuadrosTotal();
        var subtotalComQuadros = subtotal + quadrosTotal;
        var couponDiscount = getCouponDiscount(subtotalComQuadros);
        var shipping = getShippingCost();
        var total = subtotalComQuadros - couponDiscount + shipping;
        var apiItems = [];
        items.forEach(function (item, i) {
          var isFree = i === 2 || i === 4;
          var price = isFree ? 0 : getLightboxPrice(item);
          apiItems.push({ name: item.name, price: price, quantity: 1, tangible: true, id: item.id });
        });
        quadros.forEach(function (q) {
          apiItems.push({ name: q.name, price: parsePrice(q.priceSale), quantity: 1, tangible: true, id: q.id });
        });
        var phoneForApi = phoneRawSubmit.length >= 10 ? phoneRawSubmit : '11999999999';
        if (phoneForApi.startsWith('55') && phoneForApi.length > 11) phoneForApi = phoneForApi.slice(2);
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
        var complement = formShipping?.querySelector('input[name="complement"]')?.value?.trim() || '';
        var shippingForApi = null;
        if (address && addressNumber && neighborhood && city && state && postalCode) {
          shippingForApi = {
            name: firstName,
            street: address,
            number: addressNumber,
            complement: complement || undefined,
            neighborhood: neighborhood,
            city: city,
            state: (state || '').trim().slice(0, 2).toUpperCase(),
            zipCode: (postalCode || '').replace(/\D/g, '').slice(0, 8)
          };
        }
        var checkoutData = {
          total: total,
          items: apiItems,
          customer: {
            name: firstName,
            email: email,
            phone: phoneForApi,
            document: { number: (cpf || '').replace(/\D/g, ''), type: 'cpf' }
          },
          shipping: shippingForApi,
          trackingParameters: trackingParameters,
          couponCode: appliedCoupon || null
        };
        try {
          localStorage.setItem('manga_sekai_checkout_email', email || '');
          localStorage.setItem('manga_sekai_checkout_data', JSON.stringify(checkoutData));
        } catch (_) {}
        var mpModal = document.getElementById('checkout-mp-redirect-modal');
        if (mpModal) {
          mpModal.classList.add('is-open');
          mpModal.removeAttribute('aria-hidden');
          mpModal.setAttribute('aria-busy', 'true');
        }
        var delay = 2500 + Math.random() * 500;
        setTimeout(function () {
          window.location.href = 'mercado-pago.html';
        }, delay);
        return;
      }

      if (payment === 'card') {
        var expiryParts = cardExpiry.split('/');
        var expiryMonth = (expiryParts[0] || '').padStart(2, '0');
        var expiryYear = expiryParts[1] ? '20' + expiryParts[1].trim() : '';
        var cardItems = getCart();
        var cardQuadros = getQuadrosCart();
        var cardSubtotal = getCardSubtotal(cardItems);
        var cardQuadrosTotal = getQuadrosTotal();
        var cardCouponDiscount = getCouponDiscount(getSubtotal(cardItems) + cardQuadrosTotal);
        var cardShipping = getShippingCost();
        var cardTotal = Math.max(0, cardSubtotal + cardQuadrosTotal - cardCouponDiscount + cardShipping);
        var parcelas = parseInt(document.getElementById('checkout-parcelas')?.value || '1', 10);
        var cardApiItems = [];
        cardItems.forEach(function (item, i) {
          var isFree = i === 2 || i === 4;
          cardApiItems.push({ name: item.name, price: isFree ? 0 : PRICE_CARD, quantity: 1, id: item.id });
        });
        cardQuadros.forEach(function (q) {
          cardApiItems.push({ name: q.name, price: parsePrice(q.priceSale), quantity: 1, id: q.id });
        });
        var cardPhoneForApi = phoneRawSubmit.length >= 10 ? phoneRawSubmit : '11999999999';
        if (cardPhoneForApi.startsWith('55') && cardPhoneForApi.length > 11) cardPhoneForApi = cardPhoneForApi.slice(2);
        var cardModal = document.getElementById('checkout-modal');
        var cardLoading = document.getElementById('checkout-modal-loading');
        var cardError = document.getElementById('checkout-modal-error');
        if (cardModal) { cardModal.setAttribute('aria-hidden', 'false'); cardModal.classList.add('checkout-modal--open'); }
        if (cardLoading) cardLoading.style.display = '';
        if (cardError) cardError.style.display = 'none';
        fetch('/api/create-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(cardTotal * 100),
            installments: parcelas || 1,
            items: cardApiItems,
            customer: {
              name: firstName,
              email: email,
              phone: cardPhoneForApi,
              document: { number: (cpf || '').replace(/\D/g, ''), type: 'cpf' }
            },
            card: {
              number: cardNumber,
              expiry_month: expiryMonth,
              expiry_year: expiryYear,
              cvv: cardCvv,
              holder_name: cardName.toUpperCase()
            }
          })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (cardLoading) cardLoading.style.display = 'none';
          if (!data.success || data.status === 'declined' || data.status === 'failed') {
            if (cardError) cardError.style.display = '';
            return;
          }
          try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(STORAGE_KEY_QUADROS); } catch (_) {}
          window.location.href = 'obrigado.html?email=' + encodeURIComponent(email);
        })
        .catch(function () {
          if (cardLoading) cardLoading.style.display = 'none';
          if (cardError) cardError.style.display = '';
        });
        return;
      }

      alert('Pedido recebido! Em breve você receberá a confirmação por email e telefone.\n\n(Esta é uma demonstração - integração com gateway em breve.)');
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = 'index.html';
    });

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
