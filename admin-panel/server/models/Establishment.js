const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  website: { type: String, default: '' },
  priceLevel: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  typeFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  photos: { type: [String], default: [] },
  videos: { type: [String], default: [] },
  status: { type: String, default: 'ativo' },
  featured: { type: Boolean, default: false },
  featuredOrder: { type: Number, default: null }
}, { timestamps: true });

// converte _id -> id nas respostas JSON, pra não mexer no front-end
establishmentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    ret.createdAt = doc.createdAt?.toISOString();
    ret.updatedAt = doc.updatedAt?.toISOString();
  }
});

module.exports = mongoose.model('Establishment', establishmentSchema);
