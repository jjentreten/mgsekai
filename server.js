/**
 * Backend Animekai Shop
 * Serve arquivos estáticos, PIX (BrutalCash ativo / Marcha Pay legado) e Utmify (trackeamento)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PIX_PROVIDER = (process.env.PIX_PROVIDER || 'brutalcash').toLowerCase();

// BrutalCash (ativo por padrão)
const BRUTALCASH_PUBLIC_KEY = (process.env.BRUTALCASH_PUBLIC_KEY || '').trim();
const BRUTALCASH_SECRET_KEY = (process.env.BRUTALCASH_SECRET_KEY || '').trim();
const BRUTALCASH_CREATE_URL = 'https://api.brutalcash.com/v1/payment-transaction/create';
const BRUTALCASH_GET_URL = 'https://api.brutalcash.com/v1/payment-transaction';

// Pagou (principal – ativar com PIX_PROVIDER=pagou)
const PAGOU_API_KEY = (process.env.PAGOU_API_KEY || '').trim();
const PAGOU_ENVIRONMENT = (process.env.PAGOU_ENVIRONMENT || 'production').toLowerCase();
const PAGOU_BASE_URL = PAGOU_ENVIRONMENT === 'sandbox' ? 'https://api-sandbox.pagou.ai' : 'https://api.pagou.ai';

// Marcha Pay (legado – desativado por padrão; usar PIX_PROVIDER=marchapay para ativar)
const MARCHABB_URL = 'https://api.marchabb.com/v1/transactions';
const MARCHABB_GET_URL = 'https://api.marchabb.com/v1/transactions';
const PUBLIC_KEY = process.env.MARCHABB_PUBLIC_KEY || '';
const SECRET_KEY = process.env.MARCHABB_SECRET_KEY || '';

const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders';
const UTMIFY_TOKEN = (process.env.UTMIFY_API_TOKEN || '').trim();
const SITE_URL = (process.env.SITE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const PENDING_ORDERS_FILE = path.join(__dirname, 'data', 'pending-utmify-orders.json');
const POLL_INTERVAL_MS = 10 * 1000;

app.use(cors());
app.use(express.json());

function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readPendingOrders() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(PENDING_ORDERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writePendingOrders(list) {
  ensureDataDir();
  fs.writeFileSync(PENDING_ORDERS_FILE, JSON.stringify(list, null, 0), 'utf8');
}

function toUtcDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
}

function buildUtmifyPayload(opts) {
  const {
    orderId,
    status,
    createdAt,
    approvedDate,
    refundedAt,
    customer,
    products,
    trackingParameters,
    totalPriceInCents
  } = opts;
  const gatewayFeeInCents = Math.round(totalPriceInCents * 0.01) || 0;
  const userCommissionInCents = Math.max(1, totalPriceInCents - gatewayFeeInCents);
  return {
    orderId: String(orderId),
    platform: 'MangaSekai',
    paymentMethod: 'pix',
    status,
    createdAt,
    approvedDate: approvedDate || null,
    refundedAt: refundedAt || null,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      document: customer.document || null,
      country: customer.country || 'BR',
      ip: customer.ip || '0.0.0.0'
    },
    products: products.map((p) => ({
      id: String(p.id || p.externalRef || p.name),
      name: p.name,
      planId: null,
      planName: null,
      quantity: p.quantity || 1,
      priceInCents: p.priceInCents
    })),
    trackingParameters: {
      src: trackingParameters?.src ?? null,
      sck: trackingParameters?.sck ?? null,
      utm_source: trackingParameters?.utm_source ?? null,
      utm_campaign: trackingParameters?.utm_campaign ?? null,
      utm_medium: trackingParameters?.utm_medium ?? null,
      utm_content: trackingParameters?.utm_content ?? null,
      utm_term: trackingParameters?.utm_term ?? null
    },
    commission: {
      totalPriceInCents,
      gatewayFeeInCents,
      userCommissionInCents
    }
  };
}

async function sendToUtmify(payload) {
  if (!UTMIFY_TOKEN) {
    console.warn('Utmify: UTMIFY_API_TOKEN não configurado no .env - pedido não enviado');
    return;
  }
  try {
    const res = await fetch(UTMIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': UTMIFY_TOKEN
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Utmify erro', res.status, text);
      return;
    }
    console.log('Utmify: pedido', payload.orderId, 'enviado com status', payload.status);
  } catch (err) {
    console.error('Utmify erro ao enviar:', err.message);
  }
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// POST /api/create-pix - Cria transação PIX (BrutalCash ou Marcha Pay conforme PIX_PROVIDER)
app.post('/api/create-pix', async (req, res) => {
  const { amount, total, items, customer, trackingParameters } = req.body;

  let amountCentavos = typeof amount === 'number' ? Math.round(amount) : 0;
  if (amountCentavos < 1 && typeof total === 'number') {
    amountCentavos = Math.round(total * 100);
  }
  if (amountCentavos < 1) {
    return res.status(400).json({ success: false, error: 'Valor inválido (amount ou total)' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Lista de itens obrigatória' });
  }
  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({ success: false, error: 'Cliente obrigatório (name, email)' });
  }
  const docNumber = (customer.document?.number || '').replace(/\D/g, '');
  if (!docNumber || docNumber.length < 11) {
    return res.status(400).json({ success: false, error: 'CPF do cliente obrigatório' });
  }
  const phoneFixed = '11999999999';

  const usePagou = PIX_PROVIDER === 'pagou' && !!PAGOU_API_KEY;
  const useBrutalCash = !usePagou && (PIX_PROVIDER === 'brutalcash' || PIX_PROVIDER !== 'marchapay') && BRUTALCASH_PUBLIC_KEY && BRUTALCASH_SECRET_KEY;
  const useMarchaPay = !usePagou && PIX_PROVIDER === 'marchapay' && PUBLIC_KEY && SECRET_KEY;

  if (usePagou) {
    // --- Pagou PIX ---
    const externalRef = 'ms-' + Date.now();
    const payload = {
      method: 'pix',
      amount: amountCentavos,
      currency: 'BRL',
      external_ref: externalRef,
      buyer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        document: { type: 'CPF', number: docNumber }
      },
      products: items.map((item) => {
        const price = item.unitPrice ?? item.price ?? 0;
        const priceCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
        return { name: item.title || item.name || 'Produto', quantity: item.quantity || 1, price: priceCents };
      })
    };
    if (SITE_URL && SITE_URL.startsWith('https://')) payload.notify_url = SITE_URL + '/api/webhook-pagou';
    try {
      const response = await fetch(PAGOU_BASE_URL + '/v2/transactions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + PAGOU_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const raw = await response.json();
      const data = raw.data || raw;
      if (!response.ok || !data.id) {
        const errMsg = (raw.errors && JSON.stringify(raw.errors)) || raw.detail || raw.message || raw.error || 'Erro ao criar PIX';
        console.error('Pagou PIX erro:', response.status, JSON.stringify(raw));
        return res.status(response.ok ? 500 : response.status).json({ success: false, error: String(errMsg) });
      }
      const qrcode = data.pix?.qr_code || data.pix?.copy_paste || '';
      const transactionId = data.id;
      if (!qrcode) return res.status(500).json({ success: false, error: 'Resposta Pagou sem código PIX' });
      const createdAt = toUtcDateTime(new Date());
      if (UTMIFY_TOKEN && transactionId) {
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '0.0.0.0';
        const ip = clientIp.replace(/^::ffff:/, '');
        const productsForUtmify = items.map((item) => {
          const price = item.unitPrice ?? item.price ?? 0;
          const priceInCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
          return { id: item.id || item.externalRef, name: item.name || item.title || 'Produto', quantity: item.quantity || 1, priceInCents };
        });
        const utmifyPayload = buildUtmifyPayload({
          orderId: String(transactionId),
          status: 'waiting_payment',
          createdAt,
          approvedDate: null,
          refundedAt: null,
          customer: { name: customer.name.trim(), email: customer.email.trim(), phone: phoneFixed, document: docNumber, country: 'BR', ip },
          products: productsForUtmify,
          trackingParameters: trackingParameters || {},
          totalPriceInCents: amountCentavos
        });
        await sendToUtmify(utmifyPayload);
        const pending = readPendingOrders();
        pending.push({ transactionId: String(transactionId), createdAt, utmifyPayload, provider: 'pagou' });
        writePendingOrders(pending);
      }
      return res.json({ success: true, transactionId, qrcode, amount: amountCentavos });
    } catch (err) {
      console.error('Erro Pagou PIX:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao conectar com o gateway de pagamento' });
    }
  }

  if (useBrutalCash) {
    // --- BrutalCash ---
    const auth = 'Basic ' + Buffer.from(BRUTALCASH_PUBLIC_KEY + ':' + BRUTALCASH_SECRET_KEY).toString('base64');
    const payload = {
      payment_method: 'pix',
      customer: {
        document: { type: 'cpf', number: docNumber },
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: '55' + phoneFixed
      },
      items: items.map((item) => {
        const price = item.unitPrice ?? item.price ?? 0;
        const unitPriceCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
        return {
          title: item.title || item.name || 'Produto',
          unit_price: unitPriceCents,
          quantity: item.quantity || 1
        };
      }),
      amount: amountCentavos,
      postback_url: SITE_URL ? SITE_URL + '/api/webhook-brutalcash' : undefined,
      metadata: { provider_name: 'Animekai' }
    };
    try {
      const response = await fetch(BRUTALCASH_CREATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const raw = await response.json();
      const inner = raw.response || raw;
      const data = inner.data || inner;
      if (raw.isError || !inner.success || !data) {
        const errMsg = (inner.error_messages && inner.error_messages[0]) || inner.inner_exception || raw.message || 'Erro ao criar PIX';
        return res.status(response.ok ? 500 : response.status).json({ success: false, error: String(errMsg) });
      }
      const qrcode = data.pix?.qr_code || data.pix?.qrcode || '';
      const transactionId = data.id;
      if (!qrcode) {
        return res.status(500).json({ success: false, error: 'Resposta BrutalCash sem QR Code PIX' });
      }
      const createdAt = toUtcDateTime(new Date());
      if (UTMIFY_TOKEN && transactionId) {
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '0.0.0.0';
        const ip = clientIp.replace(/^::ffff:/, '');
        const productsForUtmify = items.map((item) => {
          const price = item.unitPrice ?? item.price ?? 0;
          const priceInCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
          return { id: item.id || item.externalRef, name: item.name || item.title || 'Produto', quantity: item.quantity || 1, priceInCents };
        });
        const utmifyPayload = buildUtmifyPayload({
          orderId: String(transactionId),
          status: 'waiting_payment',
          createdAt,
          approvedDate: null,
          refundedAt: null,
          customer: { name: customer.name.trim(), email: customer.email.trim(), phone: phoneFixed, document: docNumber, country: 'BR', ip: ip || '0.0.0.0' },
          products: productsForUtmify,
          trackingParameters: trackingParameters || {},
          totalPriceInCents: amountCentavos
        });
        await sendToUtmify(utmifyPayload);
        const pending = readPendingOrders();
        pending.push({ transactionId: String(transactionId), createdAt, utmifyPayload, provider: 'brutalcash' });
        writePendingOrders(pending);
      }
      return res.json({ success: true, transactionId, secureUrl: null, qrcode, amount: amountCentavos });
    } catch (err) {
      console.error('Erro BrutalCash:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao conectar com o gateway de pagamento' });
    }
  }

  if (useMarchaPay) {
    // --- Marcha Pay (legado) ---
    const payload = {
      amount: amountCentavos,
      currency: 'BRL',
      paymentMethod: 'pix',
      items: items.map((item) => {
        const price = item.unitPrice ?? item.price ?? 0;
        const unitPrice = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
        return {
          title: item.title || item.name || 'Produto',
          unitPrice,
          quantity: item.quantity || 1,
          tangible: item.tangible !== false,
          externalRef: item.externalRef || item.id
        };
      }),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: '11999999999',
        document: { number: docNumber, type: customer.document?.type || 'cpf' }
      },
      externalRef: 'ms-' + Date.now()
    };
    if (SITE_URL) {
      payload.postbackUrl = SITE_URL + '/api/webhook-pix';
      payload.returnUrl = SITE_URL + '/pix-payment.html?status=return';
    }
    const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');
    try {
      const response = await fetch(MARCHABB_URL, {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: data.message || data.error || 'Erro ao criar transação PIX' });
      }
      const pix = data.pix || data.data?.pix;
      const secureUrl = data.secureUrl || data.data?.secureUrl;
      const qrcode = pix?.qrcode || pix?.copyPaste || '';
      const transactionId = data.id ?? data.data?.id ?? data.objectId;
      if (!qrcode && !secureUrl) {
        return res.status(500).json({ success: false, error: 'Resposta da Marcha Pay sem QR Code PIX' });
      }
      const createdAt = toUtcDateTime(new Date());
      if (UTMIFY_TOKEN && transactionId != null) {
        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '0.0.0.0';
        const ip = clientIp.replace(/^::ffff:/, '');
        const productsForUtmify = items.map((item) => {
          const price = item.unitPrice ?? item.price ?? 0;
          const priceInCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
          return { id: item.id || item.externalRef, name: item.name || item.title || 'Produto', quantity: item.quantity || 1, priceInCents };
        });
        const utmifyPayload = buildUtmifyPayload({
          orderId: String(transactionId),
          status: 'waiting_payment',
          createdAt,
          approvedDate: null,
          refundedAt: null,
          customer: { name: customer.name.trim(), email: customer.email.trim(), phone: '11999999999', document: docNumber, country: 'BR', ip },
          products: productsForUtmify,
          trackingParameters: trackingParameters || {},
          totalPriceInCents: amountCentavos
        });
        await sendToUtmify(utmifyPayload);
        const pending = readPendingOrders();
        pending.push({ transactionId: String(transactionId), createdAt, utmifyPayload });
        writePendingOrders(pending);
      }
      return res.json({ success: true, transactionId, secureUrl, qrcode: qrcode || '', amount: payload.amount });
    } catch (err) {
      console.error('Erro Marcha Pay:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao conectar com o gateway de pagamento' });
    }
  }

  return res.status(500).json({
    success: false,
    error: 'Nenhum gateway PIX configurado. Defina PIX_PROVIDER=pagou e PAGOU_API_KEY no .env (ou PIX_PROVIDER=brutalcash com BRUTALCASH_*).'
  });
});

// POST /api/webhook-brutalcash - Recebe postbacks da BrutalCash (atualização de transação)
app.post('/api/webhook-brutalcash', (req, res) => {
  const body = req.body;
  const id = body.Id || body.id;
  const status = (body.Status || body.status || '').toUpperCase();
  console.log('Webhook BrutalCash:', id, status);
  if (status === 'PAID' && id) {
    const pending = readPendingOrders();
    const idx = pending.findIndex((p) => String(p.transactionId) === String(id) && p.provider === 'brutalcash');
    if (idx !== -1) {
      const row = pending[idx];
      const approvedDate = body.PaidAt ? toUtcDateTime(new Date(body.PaidAt)) : toUtcDateTime(new Date());
      const payload = { ...row.utmifyPayload, status: 'paid', approvedDate };
      sendToUtmify(payload).then(() => {
        pending.splice(idx, 1);
        writePendingOrders(pending);
        console.log('Utmify atualizado (webhook BrutalCash): pedido', id, 'pago');
      });
    }
  }
  res.status(200).send('OK');
});

// POST /api/webhook-pagou - Recebe postbacks da Pagou (PIX e cartão)
app.post('/api/webhook-pagou', (req, res) => {
  const body = req.body;
  const event = body.event || '';
  const data = body.data || {};
  const id = data.id || body.id;
  const status = data.status || body.status || '';
  console.log('Webhook Pagou:', event, id, status);
  if ((event === 'transaction.paid' || status === 'paid') && id) {
    const pending = readPendingOrders();
    const idx = pending.findIndex((p) => String(p.transactionId) === String(id) && p.provider === 'pagou');
    if (idx !== -1) {
      const row = pending[idx];
      const approvedDate = data.paid_at ? toUtcDateTime(new Date(data.paid_at)) : toUtcDateTime(new Date());
      const payload = { ...row.utmifyPayload, status: 'paid', approvedDate };
      sendToUtmify(payload).then(() => {
        pending.splice(idx, 1);
        writePendingOrders(pending);
        console.log('Utmify atualizado (webhook Pagou): pedido', id, 'pago');
      });
    }
  }
  res.status(200).json({ received: true });
});

// POST /api/webhook-pix - Recebe postbacks da Marcha Pay (legado; só usado com PIX_PROVIDER=marchapay)
app.post('/api/webhook-pix', (req, res) => {
  const body = req.body;
  console.log('Webhook Marcha Pay:', body?.type, body?.objectId, body?.data?.status);
  res.status(200).send('OK');
});

// GET /api/pix-status/:transactionId - Consulta status (BrutalCash ou Marcha Pay)
app.get('/api/pix-status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  if (!transactionId) return res.status(400).json({ status: 'unknown' });

  const usePagou = PIX_PROVIDER === 'pagou' && !!PAGOU_API_KEY;
  const useBrutalCash = !usePagou && (PIX_PROVIDER === 'brutalcash' || PIX_PROVIDER !== 'marchapay') && BRUTALCASH_PUBLIC_KEY && BRUTALCASH_SECRET_KEY;
  const useMarchaPay = !usePagou && PIX_PROVIDER === 'marchapay' && PUBLIC_KEY && SECRET_KEY;

  if (usePagou) {
    try {
      const response = await fetch(PAGOU_BASE_URL + '/v2/transactions/' + encodeURIComponent(transactionId), {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + PAGOU_API_KEY, 'Accept': 'application/json' }
      });
      const raw = response.ok ? await response.json() : null;
      const status = raw?.data?.status || raw?.status || 'unknown';
      return res.json({ status: status === 'paid' ? 'paid' : 'pending' });
    } catch (err) {
      console.error('pix-status Pagou:', err.message);
      return res.status(500).json({ status: 'unknown' });
    }
  }

  if (useBrutalCash) {
    try {
      const auth = 'Basic ' + Buffer.from(BRUTALCASH_PUBLIC_KEY + ':' + BRUTALCASH_SECRET_KEY).toString('base64');
      const response = await fetch(BRUTALCASH_GET_URL + '/' + encodeURIComponent(transactionId), {
        method: 'GET',
        headers: { 'Authorization': auth, 'Accept': 'application/json' }
      });
      const raw = response.ok ? await response.json() : null;
      const data = raw?.response?.data || raw?.data || raw;
      const status = (data?.status || data?.Status || 'unknown').toUpperCase();
      return res.json({ status: status === 'PAID' ? 'paid' : 'pending' });
    } catch (err) {
      console.error('pix-status BrutalCash:', err.message);
      return res.status(500).json({ status: 'unknown' });
    }
  }

  if (useMarchaPay) {
    try {
      const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');
      const response = await fetch(MARCHABB_GET_URL + '/' + encodeURIComponent(transactionId), {
        method: 'GET',
        headers: { 'Authorization': auth, 'Accept': 'application/json' }
      });
      const data = response.ok ? await response.json() : null;
      const status = data?.status ?? data?.data?.status ?? 'unknown';
      return res.json({ status: status === 'paid' || status === 'approved' ? 'paid' : 'pending' });
    } catch (err) {
      console.error('pix-status Marcha:', err.message);
      return res.status(500).json({ status: 'unknown' });
    }
  }

  res.json({ status: 'unknown' });
});

// POST /api/create-card - Cria transação de cartão de crédito (Pagou)
app.post('/api/create-card', async (req, res) => {
  if (PIX_PROVIDER !== 'pagou' || !PAGOU_API_KEY) {
    return res.status(400).json({ success: false, error: 'Gateway de cartão não configurado. Defina PIX_PROVIDER=pagou e PAGOU_API_KEY.' });
  }
  const { amount, installments, items, customer, card, trackingParameters } = req.body;
  let amountCentavos = typeof amount === 'number' ? Math.round(amount) : 0;
  if (amountCentavos < 1) return res.status(400).json({ success: false, error: 'Valor inválido' });
  if (!customer || !customer.name || !customer.email) return res.status(400).json({ success: false, error: 'Cliente obrigatório' });
  if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
    return res.status(400).json({ success: false, error: 'Dados do cartão incompletos' });
  }
  const docNumber = (customer.document?.number || '').replace(/\D/g, '');
  const externalRef = 'ms-' + Date.now();
  const payload = {
    method: 'credit_card',
    amount: amountCentavos,
    installments: installments || 1,
    external_ref: externalRef,
    buyer: {
      name: customer.name.trim(),
      email: customer.email.trim(),
      document: { type: 'CPF', number: docNumber }
    },
    card: {
      number: card.number.replace(/\s/g, ''),
      expiry_month: card.expiry_month,
      expiry_year: card.expiry_year,
      cvv: card.cvv,
      holder_name: card.holder_name
    },
    products: (items || []).map((item) => {
      const price = item.unitPrice ?? item.price ?? 0;
      const priceCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
      return { name: item.title || item.name || 'Produto', quantity: item.quantity || 1, price: priceCents };
    })
  };
  if (SITE_URL) payload.notify_url = SITE_URL + '/api/webhook-pagou';
  try {
    const response = await fetch(PAGOU_BASE_URL + '/v2/transactions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PAGOU_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const raw = await response.json();
    const data = raw.data || raw;
    if (!response.ok || !data.id) {
      const errMsg = (raw.errors && JSON.stringify(raw.errors)) || raw.detail || raw.message || raw.error || 'Erro ao processar cartão';
      console.error('Pagou cartão erro:', response.status, JSON.stringify(raw));
      return res.status(response.ok ? 500 : response.status).json({ success: false, error: String(errMsg) });
    }
    const txStatus = data.status || '';
    const createdAt = toUtcDateTime(new Date());
    if (UTMIFY_TOKEN && data.id) {
      const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      const ip = clientIp.replace(/^::ffff:/, '');
      const productsForUtmify = (items || []).map((item) => {
        const price = item.unitPrice ?? item.price ?? 0;
        const priceInCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
        return { id: item.id, name: item.name || item.title || 'Produto', quantity: item.quantity || 1, priceInCents };
      });
      const utmifyPayload = buildUtmifyPayload({
        orderId: String(data.id),
        status: txStatus === 'paid' ? 'paid' : 'waiting_payment',
        createdAt,
        approvedDate: txStatus === 'paid' ? createdAt : null,
        refundedAt: null,
        customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone || '11999999999', document: docNumber, country: 'BR', ip },
        products: productsForUtmify,
        trackingParameters: trackingParameters || {},
        totalPriceInCents: amountCentavos
      });
      utmifyPayload.paymentMethod = 'credit_card';
      await sendToUtmify(utmifyPayload);
      if (txStatus !== 'paid') {
        const pending = readPendingOrders();
        pending.push({ transactionId: String(data.id), createdAt, utmifyPayload, provider: 'pagou' });
        writePendingOrders(pending);
      }
    }
    return res.json({ success: true, transactionId: data.id, status: txStatus, amount: amountCentavos });
  } catch (err) {
    console.error('Erro Pagou cartão:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar cartão' });
  }
});

// Fallback: servir index.html para SPA se necessário
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Polling: verificar transações pendentes (apenas Marcha Pay; BrutalCash usa webhook)
async function pollMarchaAndUpdateUtmify() {
  if (PIX_PROVIDER !== 'marchapay' || !PUBLIC_KEY || !SECRET_KEY || !UTMIFY_TOKEN) return;
  const pending = readPendingOrders().filter((p) => !p.provider || p.provider === 'marchapay');
  if (pending.length === 0) return;

  const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');
  const stillPending = [];

  for (const row of pending) {
    try {
      const res = await fetch(MARCHABB_GET_URL + '/' + encodeURIComponent(row.transactionId), {
        method: 'GET',
        headers: { 'Authorization': auth, 'Accept': 'application/json' }
      });
      const data = res.ok ? await res.json() : null;
      const status = data?.status ?? data?.data?.status;

      if (status === 'paid' || status === 'approved') {
        const paidAt = data?.paidAt ?? data?.data?.paidAt;
        const approvedDate = paidAt ? toUtcDateTime(new Date(paidAt)) : toUtcDateTime(new Date());
        const payload = { ...row.utmifyPayload, status: 'paid', approvedDate };
        await sendToUtmify(payload);
        console.log('Utmify atualizado: pedido', row.transactionId, 'pago');
      } else {
        stillPending.push(row);
      }
    } catch (err) {
      console.error('Poll Marcha:', row.transactionId, err.message);
      stillPending.push(row);
    }
  }

  if (stillPending.length !== pending.length) {
    const all = readPendingOrders();
    const brutalOnly = all.filter((p) => p.provider === 'brutalcash');
    writePendingOrders([...brutalOnly, ...stillPending]);
  }
}

let pollTimer = null;
function startPolling() {
  if (pollTimer) return;
  pollMarchaAndUpdateUtmify();
  pollTimer = setInterval(pollMarchaAndUpdateUtmify, POLL_INTERVAL_MS);
}

app.listen(PORT, () => {
  console.log('Animekai Shop rodando em http://localhost:' + PORT);
  const usePagouStartup = PIX_PROVIDER === 'pagou' && !!PAGOU_API_KEY;
  const useBrutal = !usePagouStartup && (PIX_PROVIDER === 'brutalcash' || PIX_PROVIDER !== 'marchapay') && BRUTALCASH_PUBLIC_KEY && BRUTALCASH_SECRET_KEY;
  const useMarcha = !usePagouStartup && PIX_PROVIDER === 'marchapay' && PUBLIC_KEY && SECRET_KEY;
  if (usePagouStartup) {
    console.log('PIX/Cartão: Pagou ativo.');
  } else if (useBrutal) {
    console.log('PIX: BrutalCash ativo.');
  } else if (useMarcha) {
    console.log('PIX: Marcha Pay ativo (legado).');
    if (UTMIFY_TOKEN) startPolling();
  } else {
    console.warn('AVISO: Nenhum gateway PIX ativo. Configure PIX_PROVIDER=pagou e PAGOU_API_KEY no .env (ou PIX_PROVIDER=brutalcash com BRUTALCASH_*).');
  }
  if (UTMIFY_TOKEN) {
    console.log('Utmify: token configurado - pedidos serão enviados ao painel.');
    if (PIX_PROVIDER === 'marchapay') startPolling();
  } else {
    console.warn('AVISO: UTMIFY_API_TOKEN não configurado no .env. Trackeamento Utmify desativado.');
  }
});
