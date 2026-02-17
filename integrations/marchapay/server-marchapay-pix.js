/**
 * BACKUP: Integração Marcha Pay (PIX) para Manga Sekai Shop
 * Este arquivo é apenas referência. Para reativar, copie as constantes e as rotas
 * para o server.js e configure MARCHABB_PUBLIC_KEY e MARCHABB_SECRET_KEY no .env
 */

const MARCHABB_URL = 'https://api.marchabb.com/v1/transactions';
const MARCHABB_GET_URL = 'https://api.marchabb.com/v1/transactions';
// No server.js: const PUBLIC_KEY = process.env.MARCHABB_PUBLIC_KEY || '';
// No server.js: const SECRET_KEY = process.env.MARCHABB_SECRET_KEY || '';

// POST /api/create-pix - Cria transação PIX na Marcha Pay
async function createPixMarcha(req, res) {
  if (!PUBLIC_KEY || !SECRET_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Chaves da API Marcha Pay não configuradas. Configure MARCHABB_PUBLIC_KEY e MARCHABB_SECRET_KEY no .env'
    });
  }

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
    // ... resto do fluxo Utmify e res.json({ success: true, transactionId, secureUrl, qrcode, amount: payload.amount })
  } catch (err) {
    console.error('Erro Marcha Pay:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Erro ao conectar com o gateway de pagamento'
    });
  }
}

// GET /api/pix-status/:transactionId - Marcha Pay
// const auth = 'Basic ' + Buffer.from(PUBLIC_KEY + ':' + SECRET_KEY).toString('base64');
// fetch(MARCHABB_GET_URL + '/' + encodeURIComponent(transactionId), { headers: { 'Authorization': auth } })
// status = data?.status ?? data?.data?.status -> 'paid' ou 'approved' => res.json({ status: 'paid' })

// Polling: GET MARCHABB_GET_URL + '/' + transactionId, status === 'paid' || 'approved' => atualizar Utmify
