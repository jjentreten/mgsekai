# Integração Marcha Pay (legado – desativada por padrão)

A Marcha Pay permanece no `server.js`; está **desativada** por padrão. O gateway ativo é a BrutalCash.

Para voltar a usar a Marcha Pay:

1. No `.env`, defina:
   - `PIX_PROVIDER=marchapay`
   - `MARCHABB_PUBLIC_KEY=pk_sua_chave_publica`
   - `MARCHABB_SECRET_KEY=sk_sua_chave_secreta`
2. Reinicie o servidor. O create-pix e o pix-status passarão a usar a Marcha Pay; o polling para Utmify também.

Os arquivos nesta pasta contêm o código de referência da Marcha Pay.
