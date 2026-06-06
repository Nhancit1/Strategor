import mongoose from 'mongoose';
import { baseToJSON } from './_transform.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    // username is required by the shared games.users collection's unique index
    username: { type: String, default: null, sparse: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    lang: { type: String, default: 'fr' },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
    mustChangePassword: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null, index: true },
    resetToken: { type: String, default: null, index: true },
    resetTokenExpiry: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: baseToJSON(['passwordHash', 'verificationToken', 'resetToken', 'resetTokenExpiry']) }
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
