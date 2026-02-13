/**
 * PIX Payment Page - Manga Sekai Shop
 * Exibe QR Code e código copia e cola para pagamento PIX (Marcha Pay)
 * Faz polling do status e redireciona para obrigado.html quando pago
 */
(function () {
  const STORAGE_QRCODE = 'manga_sekai_pix_qrcode';
  const STORAGE_SECURE_URL = 'manga_sekai_pix_secureUrl';
  const STORAGE_AMOUNT = 'manga_sekai_pix_amount';
  const STORAGE_TRANSACTION_ID = 'manga_sekai_pix_transaction_id';
  const STORAGE_EMAIL = 'manga_sekai_pix_email';
  const POLL_INTERVAL_MS = 5000;

  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function formatPrice(n) {
    return 'R$ ' + Number(n).toFixed(2).replace('.', ',');
  }

  function startStatusPolling(transactionId, email) {
    if (!transactionId) return;
    var apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    var pollTimer = setInterval(function () {
      fetch(apiBase + '/api/pix-status/' + encodeURIComponent(transactionId))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.status === 'paid') {
            clearInterval(pollTimer);
            var url = 'obrigado.html';
            if (email) url += '?email=' + encodeURIComponent(email);
            window.location.href = url;
          }
        })
        .catch(function () {});
    }, POLL_INTERVAL_MS);
  }

  function init() {
    const totalParam = getParam('total');
    const amountEl = document.getElementById('pix-amount');
    const qrEl = document.getElementById('pix-qr');
    const codeEl = document.getElementById('pix-code');
    const copyBtn = document.getElementById('pix-copy-btn');
    const copyTextEl = copyBtn?.querySelector('.pix__copy-text');

    let pixCode = '';
    let amount = 0;

    try {
      pixCode = sessionStorage.getItem(STORAGE_QRCODE) || '';
      const storedAmount = sessionStorage.getItem(STORAGE_AMOUNT);
      amount = storedAmount ? parseFloat(String(storedAmount).replace(',', '.')) || 0 : 0;
    } catch (_) {}

    if (totalParam && !amount) {
      amount = parseFloat(String(totalParam).replace(',', '.')) || 0;
    }

    const displayAmount = amount > 0 ? amount : 0;
    if (amountEl) amountEl.textContent = formatPrice(displayAmount);

    if (!pixCode && displayAmount > 0) {
      document.querySelector('.pix__qr-section')?.insertAdjacentHTML('beforebegin',
        '<p class="pix__error" style="color:#e74c3c;margin-bottom:1rem;">Acesse esta página pelo checkout para gerar o PIX.</p>'
      );
      if (qrEl) qrEl.style.display = 'none';
      if (codeEl) codeEl.value = '';
      if (copyBtn) copyBtn.disabled = true;
      return;
    }

    if (codeEl) codeEl.value = pixCode;

    if (pixCode && qrEl) {
      const qrData = encodeURIComponent(pixCode);
      qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + qrData;
      qrEl.style.display = '';
    }

    if (copyBtn) {
      copyBtn.disabled = !pixCode;
      copyBtn.addEventListener('click', function () {
        if (!codeEl || !pixCode) return;
        codeEl.select();
        codeEl.setSelectionRange(0, 99999);
        navigator.clipboard?.writeText(codeEl.value).then(function () {
          copyBtn.classList.add('copied');
          if (copyTextEl) copyTextEl.textContent = 'Copiado!';
          setTimeout(function () {
            copyBtn.classList.remove('copied');
            if (copyTextEl) copyTextEl.textContent = 'Copiar código';
          }, 2000);
        });
      });
    }

    try {
      var txId = sessionStorage.getItem(STORAGE_TRANSACTION_ID) || '';
      var email = sessionStorage.getItem(STORAGE_EMAIL) || '';
      startStatusPolling(txId, email);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
