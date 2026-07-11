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
# Cadastro de cidades

O painel possui uma coleção `cities` no mesmo MongoDB usado pelos estabelecimentos.
A página `/admin/cidades.html` permite cadastrar, editar, ativar, desativar e excluir cidades.
O endpoint público `GET /api/cities` retorna apenas cidades ativas e é consumido pelo site principal.

Para importar as cinco cidades iniciais sem sobrescrever registros existentes:

```bash
npm run seed:cities
```

Execute o comando com `MONGODB_URI` configurada no arquivo `.env` ou nas variáveis do ambiente.
Depois, novos estabelecimentos passam a usar a lista de cidades do banco automaticamente.

# Contas e favoritos do site público

O backend também possui a coleção `users` e os endpoints:

- `POST /api/users/register` — cria a conta com senha protegida por bcrypt.
- `POST /api/users/login` — autentica e devolve um JWT de visitante.
- `GET /api/users/me` — restaura a sessão e os favoritos.
- `PUT /api/users/favorites/:spotId` — adiciona ou remove um favorito no MongoDB.

Essas rotas são independentes do login administrativo. Um visitante nunca recebe permissão para alterar cidades, estabelecimentos ou destaques.

Após publicar esta versão do backend no Render, o site hospedado no Netlify passa a usar cadastro e favoritos sincronizados automaticamente.
