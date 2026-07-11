const express = require('express');
const City = require('../models/City');
const Establishment = require('../models/Establishment');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function slugify(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cityPayload(body) {
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!name || !slug || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    const error = new Error('Nome, identificador, latitude e longitude são obrigatórios.');
    error.status = 400;
    throw error;
  }
  return {
    name, slug, lat, lon,
    state: String(body.state || '').trim().toUpperCase(),
    country: String(body.country || 'Brasil').trim(),
    gmaps: String(body.gmaps || '').trim(),
    coverImage: String(body.coverImage || '').trim(),
    active: body.active !== false
  };
}

// Consulta pública: consumida pelo site principal.
router.get('/', (req, res, next) => req.query.all === '1' ? requireAuth(req, res, next) : next(), async (req, res) => {
  try {
    const filter = req.query.all === '1' ? {} : { active: true };
    const cities = await City.find(filter).sort({ name: 1 });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cidades.' });
  }
});

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const city = await City.create(cityPayload(req.body));
    res.status(201).json(city);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Já existe uma cidade com esse identificador.' });
    res.status(err.status || 500).json({ error: err.message || 'Erro ao cadastrar cidade.' });
  }
});

router.put('/:databaseId', async (req, res) => {
  try {
    const current = await City.findById(req.params.databaseId);
    if (!current) return res.status(404).json({ error: 'Cidade não encontrada.' });
    const oldSlug = current.slug;
    const city = await City.findByIdAndUpdate(req.params.databaseId, cityPayload(req.body), { new: true, runValidators: true });
    if (oldSlug !== city.slug) await Establishment.updateMany({ city: oldSlug }, { city: city.slug });
    res.json(city);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Já existe uma cidade com esse identificador.' });
    res.status(err.status || 500).json({ error: err.message || 'Erro ao atualizar cidade.' });
  }
});

router.delete('/:databaseId', async (req, res) => {
  try {
    const city = await City.findById(req.params.databaseId);
    if (!city) return res.status(404).json({ error: 'Cidade não encontrada.' });
    const linked = await Establishment.countDocuments({ city: city.slug });
    if (linked) return res.status(409).json({ error: `Esta cidade possui ${linked} estabelecimento(s). Desative-a ou mova os cadastros antes de excluir.` });
    await city.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir cidade.' });
  }
});

module.exports = router;
