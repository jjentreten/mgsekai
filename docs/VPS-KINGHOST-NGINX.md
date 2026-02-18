# VPS KingHost – Evitar 403 no PIX (Nginx)

O erro **403 Forbidden** ao clicar em "Criar Pix" geralmente acontece porque o **Nginx** (ou outro proxy) está atendendo o site só como arquivos estáticos e **não repassa** as requisições `POST /api/create-pix` para o Node.

## 1. Node precisa estar rodando

Na VPS, o backend deve estar no ar, por exemplo:

```bash
cd /caminho/do/manga-sekai-v2
node server.js
```

Ou com PM2 (recomendado):

```bash
pm2 start server.js --name manga-sekai
pm2 save
pm2 startup
```

O `server.js` usa a variável `PORT` do `.env` (ou 3000). Anote essa porta (ex.: **3000**).

---

## 2. Nginx: encaminhar /api para o Node

O Nginx precisa:

- Servir os **arquivos estáticos** (HTML, JS, CSS, etc.) do projeto.
- Encaminhar **todas** as requisições para **/api/** para o processo Node.

Exemplo de configuração (ajuste `server_name`, `root` e `PORT`):

```nginx
server {
    listen 80;
    server_name mangasekaishop.com.br www.mangasekaishop.com.br;

    # Arquivos estáticos (páginas, assets)
    root /var/www/manga-sekai-v2;   # ou o caminho onde está o projeto
    index index.html;

    # Tudo que for /api/* vai para o Node (evita 403 no create-pix)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;   # use a PORT do seu .env
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Resto: tenta arquivo estático, senão index.html (SPA/links bonitos)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Se usar **HTTPS** (recomendado), use um bloco `server { listen 443 ssl; ... }` com `ssl_certificate` e `ssl_certificate_key` e as mesmas `location` acima.

Depois:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Conferir

1. **Node no ar:** `curl -I http://127.0.0.1:3000` deve retornar 200 ou 404, nunca “connection refused”.
2. **Pelo domínio:**  
   `curl -X POST https://mangasekaishop.com.br/api/create-pix -H "Content-Type: application/json" -d '{}'`  
   Não deve retornar **403** (pode retornar 400/500 da API, mas o Nginx já estará repassando).

Se ainda der 403, verifique:

- **Firewall:** liberar a porta do Node (ex.: 3000) só em localhost; não é necessário abrir 3000 na internet se o Nginx faz proxy.
- **SELinux/AppArmor:** às vezes bloqueiam proxy; em último caso teste com desativado para isolar o problema.
- **Outro proxy/WAF:** se a KingHost colocar algo na frente (Cloudflare, WAF), pode ser necessário liberar POST em `/api/*` no painel deles.

Com o Nginx repassando `/api/` para o Node, o botão "Criar Pix" deve deixar de retornar 403.
