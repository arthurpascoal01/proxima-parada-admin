const express = require('express');
const Establishment = require('../models/Establishment');
const cloudinary = require('../config/cloudinary');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_TYPES = new Set(['restaurante', 'hotel']);
const MAX_ITEMS = 50;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asNumber(value, field, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${field} inválido.`);
  }
  return number;
}

async function copyFirstAvailablePhoto(item) {
  const sources = Array.isArray(item.photoSourceUrls)
    ? item.photoSourceUrls.map(String).map((url) => url.trim()).filter(Boolean).slice(0, 4)
    : [];

  if (!sources.length) throw new Error('Informe ao menos uma foto real do estabelecimento.');

  const failures = [];
  for (const source of sources) {
    try {
      const resolvedSource = await resolvePhotoSource(source);
      const uploaded = await cloudinary.uploader.upload(resolvedSource, {
        folder: 'estabelecimentos',
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        transformation: [{ width: 1600, height: 1000, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }]
      });
      return uploaded.secure_url;
    } catch (error) {
      failures.push(error.message || 'falha ao copiar imagem');
    }
  }

  throw new Error(`Nenhuma foto pôde ser copiada (${failures.join(' | ')}).`);
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function resolvePhotoSource(source) {
  const parsed = new URL(source);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL de foto inválida.');
  if (/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(parsed.pathname + parsed.search)) return source;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProximaParadaBot/1.0)' }
    });
    if (!response.ok) throw new Error(`página da foto respondeu ${response.status}`);
    const html = await response.text();
    const candidates = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i
    ];
    for (const pattern of candidates) {
      const match = html.match(pattern);
      if (match?.[1]) return new URL(decodeHtml(match[1]), response.url).href;
    }
    throw new Error('a página não informa uma imagem de capa');
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/establishments', requireAuth, async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return res.status(400).json({ error: `Envie de 1 a ${MAX_ITEMS} estabelecimentos por lote.` });
  }

  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    const raw = items[index] || {};
    const name = String(raw.name || '').trim();
    const city = String(raw.city || '').trim();
    const type = String(raw.type || '').trim();

    try {
      if (!name || !city || !VALID_TYPES.has(type)) {
        throw new Error('Nome, cidade e tipo restaurante/hotel são obrigatórios.');
      }

      const duplicate = await Establishment.findOne({
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        city
      }).lean();
      if (duplicate) {
        results.push({ index, name, status: 'duplicado', id: duplicate._id.toString() });
        continue;
      }

      const lat = asNumber(raw.lat, 'Latitude', -90, 90);
      const lon = asNumber(raw.lon, 'Longitude', -180, 180);
      const rating = asNumber(raw.rating ?? 0, 'Nota', 0, 5);
      const priceLevel = asNumber(raw.priceLevel ?? 0, 'Nível de preço', 0, 3);
      const photo = await copyFirstAvailablePhoto(raw);

      const created = await Establishment.create({
        type,
        name,
        description: String(raw.description || '').trim(),
        address: String(raw.address || '').trim(),
        city,
        lat,
        lon,
        phone: String(raw.phone || '').trim(),
        whatsapp: String(raw.whatsapp || '').trim(),
        website: String(raw.website || '').trim(),
        priceLevel,
        rating,
        tags: Array.isArray(raw.tags) ? raw.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
        typeFields: raw.typeFields && typeof raw.typeFields === 'object' ? raw.typeFields : {},
        photos: [photo],
        videos: [],
        status: raw.status === 'inativo' ? 'inativo' : 'ativo'
      });

      results.push({ index, name, status: 'criado', id: created.id, photo });
    } catch (error) {
      results.push({ index, name: name || `Item ${index + 1}`, status: 'erro', error: error.message || 'Erro inesperado.' });
    }
  }

  const summary = results.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] || 0) + 1;
    return counts;
  }, { criado: 0, duplicado: 0, erro: 0 });

  return res.json({ summary, results });
});

module.exports = router;
