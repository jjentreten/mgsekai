/**
 * Backend Manga Sekai Shop
 * Serve arquivos estáticos, Marcha Pay PIX e Utmify (trackeamento)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const MARCHABB_URL = 'https://api.marchabb.com/v1/transactions';
const MARCHABB_GET_URL = 'https://api.marchabb.com/v1/transactions';
const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders';
const PUBLIC_KEY = process.env.MARCHABB_PUBLIC_KEY || '';
const SECRET_KEY = process.env.MARCHABB_SECRET_KEY || '';
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

// POST /api/create-pix - Cria transação PIX na Marcha Pay
app.post('/api/create-pix', async (req, res) => {
  if (!PUBLIC_KEY || !SECRET_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Chaves da API Marcha Pay não configuradas. Configure MARCHABB_PUBLIC_KEY e MARCHABB_SECRET_KEY no .env'
    });
  }

  const { amount, total, items, customer, trackingParameters } = req.body;

  // Aceita amount em centavos OU total em reais
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

  // Formatar CPF (só números)
  const docNumber = (customer.document?.number || '').replace(/\D/g, '');
  if (!docNumber || docNumber.length < 11) {
    return res.status(400).json({ success: false, error: 'CPF do cliente obrigatório' });
  }

  // Telefone sempre fixo na gateway: (11) 99999-9999
  const phone = '11999999999';

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
      phone,
      document: {
        number: docNumber,
        type: customer.document?.type || 'cpf'
      }
    },
    externalRef: 'ms-' + Date.now()
  };

  // postbackUrl e returnUrl opcionais
  if (SITE_URL) {
    payload.postbackUrl = SITE_URL + '/api/webhook-pix';
    payload.returnUrl = SITE_URL + '/pix-payment.html?status=return';
  }

  const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');

  try {
    const response = await fetch(MARCHABB_URL, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || data.error || 'Erro ao criar transação PIX'
      });
    }

    const pix = data.pix || data.data?.pix;
    const secureUrl = data.secureUrl || data.data?.secureUrl;
    const qrcode = pix?.qrcode || pix?.copyPaste;

    if (!qrcode && !secureUrl) {
      return res.status(500).json({
        success: false,
        error: 'Resposta da Marcha Pay sem QR Code PIX'
      });
    }

    const transactionId = data.id ?? data.data?.id ?? data.objectId;
    const createdAt = toUtcDateTime(new Date());

    if (!UTMIFY_TOKEN) {
      console.warn('Utmify: configure UTMIFY_API_TOKEN no .env para enviar pedidos');
    }
    if (transactionId == null) {
      console.warn('Utmify: ID da transação Marcha não encontrado na resposta. Resposta:', JSON.stringify(data).slice(0, 200));
    }

    if (UTMIFY_TOKEN && transactionId != null) {
      const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      const ip = clientIp.replace(/^::ffff:/, '');
      console.log('Enviando pedido', transactionId, 'para Utmify (waiting_payment)...');
      const productsForUtmify = (items || []).map((item) => {
        const price = item.unitPrice ?? item.price ?? 0;
        const priceInCents = price < 100 ? Math.round(Number(price) * 100) : Math.round(Number(price));
        return {
          id: item.id || item.externalRef,
          name: item.name || item.title || 'Produto',
          quantity: item.quantity || 1,
          priceInCents
        };
      });
      const utmifyPayload = buildUtmifyPayload({
        orderId: String(transactionId),
        status: 'waiting_payment',
        createdAt,
        approvedDate: null,
        refundedAt: null,
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: phone || null,
          document: docNumber,
          country: 'BR',
          ip
        },
        products: productsForUtmify,
        trackingParameters: trackingParameters || {},
        totalPriceInCents: amountCentavos
      });
      await sendToUtmify(utmifyPayload);
      const pending = readPendingOrders();
      pending.push({
        transactionId: String(transactionId),
        createdAt,
        utmifyPayload
      });
      writePendingOrders(pending);
    }

    res.json({
      success: true,
      transactionId,
      secureUrl,
      qrcode: qrcode || '',
      amount: payload.amount
    });
  } catch (err) {
    console.error('Erro Marcha Pay:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Erro ao conectar com o gateway de pagamento'
    });
  }
});

// POST /api/webhook-pix - Recebe postbacks da Marcha Pay (opcional, para atualizar status)
app.post('/api/webhook-pix', (req, res) => {
  const body = req.body;
  console.log('Webhook Marcha Pay:', body?.type, body?.objectId, body?.data?.status);
  res.status(200).send('OK');
});

// GET /api/pix-status/:transactionId - Consulta status da transação (para polling na página PIX)
app.get('/api/pix-status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  if (!transactionId || !PUBLIC_KEY || !SECRET_KEY) {
    return res.status(400).json({ status: 'unknown' });
  }
  try {
    const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');
    const response = await fetch(MARCHABB_GET_URL + '/' + encodeURIComponent(transactionId), {
      method: 'GET',
      headers: { 'Authorization': auth, 'Accept': 'application/json' }
    });
    const data = response.ok ? await response.json() : null;
    const status = data?.status ?? data?.data?.status ?? 'unknown';
    res.json({ status: status === 'paid' || status === 'approved' ? 'paid' : 'pending' });
  } catch (err) {
    console.error('pix-status:', err.message);
    res.status(500).json({ status: 'unknown' });
  }
});

// Fallback: servir index.html para SPA se necessário
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Polling: verificar transações pendentes na Marcha Pay e atualizar Utmify quando paid
async function pollMarchaAndUpdateUtmify() {
  if (!PUBLIC_KEY || !SECRET_KEY || !UTMIFY_TOKEN) return;
  const pending = readPendingOrders();
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
    writePendingOrders(stillPending);
  }
}

let pollTimer = null;
function startPolling() {
  if (pollTimer) return;
  pollMarchaAndUpdateUtmify();
  pollTimer = setInterval(pollMarchaAndUpdateUtmify, POLL_INTERVAL_MS);
}

app.listen(PORT, () => {
  console.log('Manga Sekai Shop rodando em http://localhost:' + PORT);
  if (!PUBLIC_KEY || !SECRET_KEY) {
    console.warn('AVISO: Chaves Marcha Pay não configuradas. Copie .env.example para .env e preencha as chaves.');
  }
  if (UTMIFY_TOKEN) {
    console.log('Utmify: token configurado - pedidos serão enviados ao painel.');
    startPolling();
  } else {
    console.warn('AVISO: UTMIFY_API_TOKEN não configurado no .env. Trackeamento Utmify desativado.');
  }
});
