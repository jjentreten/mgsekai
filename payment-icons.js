/**
 * Banco de dados de ícones de pagamento
 * Adicione ou remova itens no array PAYMENT_ICONS para alterar as bandeiras exibidas no rodapé.
 *
 * Tipos suportados:
 * - 'cdn': usa URL externa (img src)
 * - 'svg': usa SVG inline
 */
const PAYMENT_ICONS = [
  {
    id: 'amex',
    name: 'American Express',
    type: 'cdn',
    url: 'https://cdn.jsdelivr.net/npm/credit-card-logos@1.0.5/img/card-logo-amex.svg',
    width: 38,
    height: 24,
  },
  {
    id: 'visa',
    name: 'Visa',
    type: 'svg',
    svg: '<path fill="#1565C0" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/><path fill="#FFF" d="M15.186 19l-2.626 7.832c0 0-.667-3.313-.733-3.729-1.495-3.411-3.701-3.221-3.701-3.221L10.726 30v-.002h3.161L18.258 19H15.186zM17.689 30L20.56 30 22.296 19 19.389 19zM38.008 19h-3.021l-4.71 11h2.852l.588-1.571h3.596L37.619 30h2.613L38.008 19zM34.513 26.328l1.563-4.157.818 4.157H34.513zM26.369 22.206c0-.606.498-1.057 1.926-1.057.928 0 1.991.674 1.991.674l.466-2.309c0 0-1.358-.515-2.691-.515-3.019 0-4.576 1.444-4.576 3.272 0 3.306 3.979 2.853 3.979 4.551 0 .291-.231.964-1.888.964-1.662 0-2.759-.609-2.759-.609l-.495 2.216c0 0 1.063.606 3.117.606 2.059 0 4.915-1.54 4.915-3.752C30.354 23.586 26.369 23.394 26.369 22.206z"/><path fill="#FFC107" d="M12.212,24.945l-0.966-4.748c0,0-0.437-1.029-1.573-1.029c-1.136,0-4.44,0-4.44,0S10.894,20.84,12.212,24.945z"/>',
    viewBox: '0 0 48 48',
    width: 38,
    height: 24,
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    type: 'cdn',
    url: 'https://www.svgrepo.com/show/452059/mastercard.svg',
    width: 38,
    height: 24,
  },
  {
    id: 'pix',
    name: 'PIX',
    type: 'svg',
    svg: '<path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"/><path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"/><path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26C46.65,21.88,46.65,26.12,44.04,28.74z"/>',
    viewBox: '0 0 48 48',
    width: 38,
    height: 24,
  },
];

/**
 * Renderiza os ícones de pagamento no container especificado
 * @param {string} containerSelector - Seletor CSS do elemento container (ex: '.footer__payment-list')
 */
function renderPaymentIcons(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = PAYMENT_ICONS.map((icon) => {
    const w = icon.width || 38;
    const h = icon.height || 24;
    const ariaLabel = `aria-labelledby="pi-${icon.id}"`;
    const titleId = `pi-${icon.id}`;

    if (icon.type === 'cdn') {
      return `<li><img class="footer__payment-icon" src="${icon.url}" alt="${icon.name}" width="${w}" height="${h}" loading="lazy"></li>`;
    }

    if (icon.type === 'svg' && icon.svg) {
      const vb = icon.viewBox || '0 0 38 24';
      return `<li><svg class="footer__payment-icon" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" ${ariaLabel}><title id="${titleId}">${icon.name}</title>${icon.svg}</svg></li>`;
    }

    return '';
  }).join('');
}
