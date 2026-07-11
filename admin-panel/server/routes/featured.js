const express = require('express');
const Establishment = require('../models/Establishment');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/featured -> lista pública, ordenada, para a homepage consumir e
// atualizar automaticamente (basta o front-end do site chamar essa rota).
router.get('/', async (req, res) => {
  try {
    const items = await Establishment.find({ featured: true }).sort({ featuredOrder: 1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar destaques.' });
  }
});

router.use(requireAuth);

// PATCH /api/featured/:id  { featured: true/false }
// Ao ativar, entra no fim da lista de destaques automaticamente.
router.patch('/:id', async (req, res) => {
  try {
    const item = await Establishment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Não encontrado.' });

    if (req.body.featured) {
      const count = await Establishment.countDocuments({ featured: true });
      item.featured = true;
      item.featuredOrder = count;
    } else {
      item.featured = false;
      item.featuredOrder = null;
    }
    await item.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar destaque.' });
  }
});

// PATCH /api/featured/reorder/bulk  { order: [id1, id2, id3, ...] }
// Salva a nova ordem de arrastar-e-soltar de uma vez.
router.patch('/reorder/bulk', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Lista de ordem inválida.' });
    }
    await Promise.all(order.map((id, index) =>
      Establishment.findByIdAndUpdate(id, { featuredOrder: index })
    ));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reordenar destaques.' });
  }
});

module.exports = router;
