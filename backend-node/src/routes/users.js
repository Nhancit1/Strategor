import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { userDto } from '../services/authService.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  res.json(userDto(user));
}));

router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  const { firstName, lastName, lang } = req.body || {};
  if (firstName != null) user.firstName = firstName;
  if (lastName != null) user.lastName = lastName;
  if (lang != null) user.lang = lang;
  await user.save();
  res.json(userDto(user));
}));

export default router;
