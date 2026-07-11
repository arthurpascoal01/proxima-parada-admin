const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { requireUser } = require('../middleware/userAuth');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Aguarde alguns minutos.' } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, favorites: user.favorites || [] };
}
function createToken(user) {
  return jwt.sign({ sub: user.id, kind: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || !emailPattern.test(email) || password.length < 8) {
      return res.status(400).json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, favorites: [] });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Não foi possível criar a conta.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }
  res.json({ token: createToken(user), user: publicUser(user) });
});

router.get('/me', requireUser, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({ user: publicUser(user) });
});

router.put('/favorites/:spotId', requireUser, async (req, res) => {
  const spotId = String(req.params.spotId || '').trim();
  if (!spotId || spotId.length > 120) return res.status(400).json({ error: 'Item inválido.' });
  const add = req.body.favorite !== false;
  const update = add ? { $addToSet: { favorites: spotId } } : { $pull: { favorites: spotId } };
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
  res.json({ favorites: user.favorites });
});

module.exports = router;
