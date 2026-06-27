import { Router } from 'express';
import { z } from 'zod';
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

const updateMeSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  lang: z.enum(['fr', 'en']).optional(),
});

router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'Utilisateur introuvable');
  const parsed = updateMeSchema.safeParse(req.body || {});
  if (!parsed.success) throw new ApiError(400, 'Champs de profil invalides');
  const { firstName, lastName, lang } = parsed.data;
  if (firstName != null) user.firstName = firstName;
  if (lastName != null) user.lastName = lastName;
  if (lang != null) user.lang = lang;
  await user.save();
  res.json(userDto(user));
}));

export default router;
