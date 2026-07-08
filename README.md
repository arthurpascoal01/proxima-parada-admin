# Painel Admin — Próxima Parada

Painel administrativo para gerenciar restaurantes, hotéis, lojas e passeios do site, com upload de fotos/vídeos e controle de destaques da homepage.

Stack: Node.js + Express, MongoDB Atlas (banco), Cloudinary (mídia), Render (hospedagem) — tudo no plano free, sem cartão de crédito.

## Rodar localmente

```bash
npm install
cp .env.example .env
node hash-password.js "sua-senha"    # copie o resultado para ADMIN_PASSWORD_HASH no .env
```

Preencha no `.env` também `MONGODB_URI` (MongoDB Atlas) e as três variáveis do Cloudinary — veja o passo a passo em [`DEPLOY.md`](./DEPLOY.md).

```bash
npm start
```

Acesse: `http://localhost:8080/admin/index.html`

## Deploy em produção

Veja o passo a passo completo (sem precisar de cartão de crédito) em [`DEPLOY.md`](./DEPLOY.md).

## Estrutura

- `server/` — backend Express (auth, CRUD de estabelecimentos, upload, destaques)
- `public/admin/` — telas do painel (login, dashboard, formulário, destaques)
- `hash-password.js` — utilitário para gerar a senha do admin

## Segurança implementada

- Login com senha hasheada (bcrypt), nunca em texto puro
- Sessão via cookie httpOnly + JWT (não acessível por JavaScript no navegador)
- Rate limiting no login (10 tentativas / 15 min por IP)
- Todas as rotas de escrita (criar/editar/excluir/upload) exigem autenticação
- Headers de segurança via Helmet
