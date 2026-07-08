const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

// Protege as páginas HTML do /admin (exceto login) redirecionando para o login.
function requireAuthPage(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.redirect('/admin/index.html');
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.redirect('/admin/index.html');
  }
}

module.exports = { requireAuth, requireAuthPage };
