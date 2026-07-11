const express = require('express');
const Establishment = require('../models/Establishment');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_TYPES = ['restaurante', 'hotel', 'loja', 'passeio', 'ponto-turistico', 'cafe', 'familia'];

// GET /api/establishments?type=hotel&search=texto  -> lista (pública, para o site consumir)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type && VALID_TYPES.includes(req.query.type)) {
      filter.type = req.query.type;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    const items = await Establishment.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estabelecimentos.' });
  }
});

// GET /api/establishments/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Establishment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Não encontrado.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estabelecimento.' });
  }
});

// A partir daqui, todas as rotas exigem login de admin.
router.use(requireAuth);

// POST /api/establishments
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !VALID_TYPES.includes(body.type)) {
      return res.status(400).json({ error: 'Nome e tipo válido são obrigatórios.' });
    }
    const item = await Establishment.create({
      type: body.type,
      name: body.name,
      description: body.description || '',
      address: body.address || '',
      city: body.city || '',
      lat: body.lat === '' || body.lat == null ? null : Number(body.lat),
      lon: body.lon === '' || body.lon == null ? null : Number(body.lon),
      phone: body.phone || '',
      whatsapp: body.whatsapp || '',
      website: body.website || '',
      priceLevel: body.priceLevel != null ? Number(body.priceLevel) : 0,
      rating: body.rating != null ? Number(body.rating) : 0,
      tags: body.tags || [],
      typeFields: body.typeFields || {},
      photos: body.photos || [],
      videos: body.videos || [],
      status: body.status || 'ativo'
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar estabelecimento.' });
  }
});

// PUT /api/establishments/:id
router.put('/:id', async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.id;
    const item = await Establishment.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!item) return res.status(404).json({ error: 'Não encontrado.' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar estabelecimento.' });
  }
});

// DELETE /api/establishments/:id
router.delete('/:id', async (req, res) => {
  try {
    await Establishment.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir estabelecimento.' });
  }
});

module.exports = router;
