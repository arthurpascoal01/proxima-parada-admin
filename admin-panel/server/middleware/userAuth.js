const jwt = require('jsonwebtoken');

function requireUser(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.kind !== 'user') throw new Error('Tipo de token inválido.');
    req.userId = payload.sub;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
  }
}

module.exports = { requireUser };
