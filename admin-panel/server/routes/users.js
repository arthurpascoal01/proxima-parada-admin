const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const User = require('../models/User');
const { requireUser } = require('../middleware/userAuth');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Aguarde alguns minutos.' } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, favorites: user.favorites || [], phone:user.phone||'', city:user.city||'', photo:user.photo||'', preferences:user.preferences||[], emailVerified:!!user.emailVerified, role:user.role||'traveler' };
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

router.put('/profile',requireUser,async(req,res)=>{
  const allowed={};
  if(req.body.name!=null)allowed.name=String(req.body.name).trim().slice(0,80);
  if(req.body.phone!=null)allowed.phone=String(req.body.phone).trim().slice(0,30);
  if(req.body.city!=null)allowed.city=String(req.body.city).trim().slice(0,80);
  if(req.body.photo!=null)allowed.photo=String(req.body.photo).trim().slice(0,500);
  if(Array.isArray(req.body.preferences))allowed.preferences=req.body.preferences.map(String).slice(0,20);
  const user=await User.findByIdAndUpdate(req.userId,allowed,{new:true,runValidators:true});res.json({user:publicUser(user)});
});

router.get('/export',requireUser,async(req,res)=>{const user=await User.findById(req.userId).lean();if(!user)return res.status(404).json({error:'Conta não encontrada.'});delete user.passwordHash;delete user.passwordResetHash;res.set('Content-Disposition','attachment; filename="meus-dados-proxima-parada.json"');res.json({exportedAt:new Date().toISOString(),user})});
router.delete('/me',requireUser,async(req,res)=>{await User.findByIdAndDelete(req.userId);res.json({ok:true})});

router.post('/forgot-password',authLimiter,async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase(),user=await User.findOne({email}).select('+passwordResetHash +passwordResetExpires');
  if(user){const raw=crypto.randomBytes(32).toString('hex');user.passwordResetHash=crypto.createHash('sha256').update(raw).digest('hex');user.passwordResetExpires=new Date(Date.now()+30*60*1000);await user.save();
    const resetUrl=`${process.env.PUBLIC_SITE_URL||'https://proxima-parada.netlify.app'}?reset=${raw}`;
    if(process.env.RESEND_API_KEY){await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM||'Próxima Parada <onboarding@resend.dev>',to:[email],subject:'Redefina sua senha',html:`<p>Use o link abaixo em até 30 minutos:</p><p><a href="${resetUrl}">Redefinir senha</a></p>`})}).catch(console.error)}
    else if(process.env.NODE_ENV!=='production')console.log('Reset URL:',resetUrl);
  }
  res.json({message:'Se o e-mail estiver cadastrado, enviaremos as instruções.'});
});
router.post('/reset-password',authLimiter,async(req,res)=>{const hash=crypto.createHash('sha256').update(String(req.body.token||'')).digest('hex'),password=String(req.body.password||'');if(password.length<8)return res.status(400).json({error:'A senha deve ter pelo menos 8 caracteres.'});const user=await User.findOne({passwordResetHash:hash,passwordResetExpires:{$gt:new Date()}}).select('+passwordHash +passwordResetHash +passwordResetExpires');if(!user)return res.status(400).json({error:'Link inválido ou expirado.'});user.passwordHash=await bcrypt.hash(password,12);user.passwordResetHash='';user.passwordResetExpires=null;await user.save();res.json({message:'Senha atualizada com sucesso.'})});

module.exports = router;
