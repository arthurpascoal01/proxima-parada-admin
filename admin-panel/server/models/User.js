const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  favorites: { type: [String], default: [] },
  phone: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  photo: { type: String, default: '', trim: true },
  preferences: { type: [String], default: [] },
  emailVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['traveler','partner'], default: 'traveler' },
  passwordResetHash: { type: String, default: '', select: false },
  passwordResetExpires: { type: Date, default: null, select: false }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
  }
});

module.exports = mongoose.model('User', userSchema);
