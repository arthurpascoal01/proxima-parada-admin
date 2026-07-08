# Deploy — Painel Próxima Parada (sem cartão de crédito)

Stack: Render (servidor) + MongoDB Atlas (banco) + Cloudinary (fotos/vídeos). Nenhum dos três pede cartão no plano free.

## 1. Criar o banco no MongoDB Atlas

1. Acesse **https://www.mongodb.com/cloud/atlas/register** e crie uma conta (sem cartão)
2. Ao criar o primeiro cluster, escolha o plano **M0 Free**
3. Em "Security" → "Database Access", crie um usuário (usuário + senha) — anote os dois
4. Em "Security" → "Network Access", clique em "Add IP Address" → "Allow access from anywhere" (0.0.0.0/0) — necessário porque o Render usa IPs dinâmicos
5. Em "Database" → clique em "Connect" no seu cluster → "Drivers" → copie a **connection string**, algo como:
   ```
   mongodb+srv://usuario:<senha>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Troque `<senha>` pela senha real e adicione o nome do banco antes do `?`:
   ```
   mongodb+srv://usuario:SENHA@cluster0.xxxxx.mongodb.net/proxima-parada?retryWrites=true&w=majority
   ```
   Essa string completa vai na variável `MONGODB_URI`.

## 2. Criar a conta no Cloudinary (fotos/vídeos)

1. Acesse **https://cloudinary.com/users/register/free** e crie uma conta (sem cartão)
2. No Dashboard, copie três valores: **Cloud name**, **API Key**, **API Secret**
3. Guarde os três — vão nas variáveis `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 3. Gerar a senha do admin

No seu computador, dentro da pasta do projeto:
```
npm install
node hash-password.js "sua-senha-forte-aqui"
```
Copie o valor de `ADMIN_PASSWORD_HASH=...` que aparecer.

Gere também um segredo aleatório para sessões:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Esse valor vai em `JWT_SECRET`.

## 4. Subir o código pro GitHub

O Render faz deploy a partir de um repositório GitHub. Se ainda não tem o projeto lá:
```
cd admin-panel
git init
git add .
git commit -m "primeiro commit"
```
Crie um repositório vazio em **github.com/new** e depois:
```
git remote add origin https://github.com/SEU_USUARIO/proxima-parada-admin.git
git branch -M main
git push -u origin main
```

## 5. Criar o serviço no Render

1. Acesse **https://render.com** e crie uma conta (sem cartão) — pode logar direto com GitHub
2. Clique em "New" → "Web Service"
3. Conecte o repositório `proxima-parada-admin` que você acabou de subir
4. Configure:
   - **Name**: proxima-parada-admin
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Em "Environment Variables", adicione uma por uma:
   ```
   JWT_SECRET=<o que você gerou no passo 3>
   ADMIN_USER=admin
   ADMIN_PASSWORD_HASH=<o hash gerado no passo 3>
   MONGODB_URI=<a connection string do passo 1>
   CLOUDINARY_CLOUD_NAME=<do passo 2>
   CLOUDINARY_API_KEY=<do passo 2>
   CLOUDINARY_API_SECRET=<do passo 2>
   NODE_ENV=production
   ```
6. Clique em "Create Web Service". O Render builda e sobe sozinho — acompanhe pelos logs.

Ao final você recebe uma URL do tipo:
```
https://proxima-parada-admin.onrender.com
```

Acesse `SUA_URL/admin/index.html` para logar.

## 6. Conectar o site à URL do painel

Abra o `proxima-parada.html` do site e edite a linha (perto do topo do `<script>`):
```js
const ADMIN_API_BASE = 'https://SEU-PAINEL-URL.a.run.app';
```
Troque pela URL do Render (sem `/` no final):
```js
const ADMIN_API_BASE = 'https://proxima-parada-admin.onrender.com';
```

## Sobre o "sono" do plano free

O Render free "dorme" o servidor depois de 15 min sem acessos. O primeiro acesso depois disso demora uns 30-50 segundos pra responder (ele está "acordando"). Os acessos seguintes voltam ao normal. Isso é aceitável para um painel administrativo de uso ocasional — se virar um problema real (site com muito tráfego), o upgrade pro plano pago do Render ($7/mês) elimina esse comportamento.

## Atualizações futuras

Sempre que alterar o código:
```
git add .
git commit -m "descrição da mudança"
git push
```
O Render detecta o push e faz o redeploy sozinho.

## Onde o painel fica acessível

`https://SUA_URL/admin/index.html` → tela de login
`https://SUA_URL/admin/dashboard.html` → lista de estabelecimentos (após login)

## Como o site principal consome os dados

Rotas públicas (sem login):
```js
fetch('https://SUA_URL/api/featured')
fetch('https://SUA_URL/api/establishments?type=restaurante')
```
Rotas de criar/editar/excluir exigem login (usadas só dentro do próprio painel).
