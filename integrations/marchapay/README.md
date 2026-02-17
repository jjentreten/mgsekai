# Integração Marcha Pay (backup)

Para voltar a usar a Marcha Pay:

1. No `server.js`, substitua a integração Black Cat pelas constantes e rotas deste backup.
2. No `.env`, use:
   - `MARCHABB_PUBLIC_KEY=pk_sua_chave_publica`
   - `MARCHABB_SECRET_KEY=sk_sua_chave_secreta`
   - Remova ou comente `BLACKCAT_API_KEY`.

Os arquivos nesta pasta contêm o código original da Marcha Pay para referência.
