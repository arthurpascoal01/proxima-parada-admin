const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  state: { type: String, default: '', trim: true, uppercase: true },
  country: { type: String, default: 'Brasil', trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lon: { type: Number, required: true, min: -180, max: 180 },
  gmaps: { type: String, default: '', trim: true },
  coverImage: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

citySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret.slug;
    ret.databaseId = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('City', citySchema);
