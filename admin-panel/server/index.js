require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const establishmentsRoutes = require('./routes/establishments');
const uploadRoutes = require('./routes/upload');
const featuredRoutes = require('./routes/featured');
const citiesRoutes = require('./routes/cities');
const usersRoutes = require('./routes/users');
const platformRoutes = require('./routes/platform');
const bulkImportRoutes = require('./routes/bulk-import');
const { requireAuthPage } = require('./middleware/auth');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 8080;

// O Render encaminha o IP real pelo primeiro proxy. Isso permite que o
// express-rate-limit identifique cada visitante corretamente sem bloquear
// cadastro ou login por causa do header X-Forwarded-For.
app.set('trust proxy', 1);

// Checagem de variáveis obrigatórias — falha rápido e claro se algo faltar no deploy.
['JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD_HASH', 'MONGODB_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`ERRO: variável de ambiente ${key} não definida.`);
    process.exit(1);
  }
});

app.use(helmet({ contentSecurityPolicy: false })); // CSP customizado poderia ser refinado depois
// Libera CORS para o site público consumir /api/establishments e /api/featured
// (rotas de escrita continuam protegidas por cookie httpOnly + JWT, que não
// é enviado em requisições cross-origin por causa do sameSite:'strict').
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// CORS liberado apenas para as consultas GET públicas (dados de estabelecimentos
// e destaques), para o site principal — em outro domínio — poder consumi-las.
// Ações de escrita (POST/PUT/DELETE/PATCH) continuam exigindo login e não
// recebem esse header, então não podem ser chamadas de outra origem.
app.use(['/api/establishments', '/api/featured', '/api/cities'], (req, res, next) => {
  if (req.method === 'GET') res.set('Access-Control-Allow-Origin', '*');
  next();
});

// API
app.use('/api/auth', authRoutes);
app.use('/api/establishments', establishmentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/featured', featuredRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/import', bulkImportRoutes);

// Painel admin (arquivos estáticos protegidos, exceto a tela de login)
app.use('/admin', (req, res, next) => {
  if (req.path === '/index.html' || req.path === '/' || req.path.startsWith('/admin.css') || req.path.startsWith('/admin.js') || req.path.startsWith('/login.js')) {
    return next();
  }
  requireAuthPage(req, res, next);
});
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

app.get('/', (req, res) => res.redirect('/admin/index.html'));

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Painel admin rodando na porta ${PORT}`));
  })
  .catch((err) => {
    console.error('Falha ao conectar no MongoDB:', err.message);
    process.exit(1);
  });
