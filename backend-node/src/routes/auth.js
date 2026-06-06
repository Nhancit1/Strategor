import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import * as authService from '../services/authService.js';

const router = Router();

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map((i) => i.message).join('; '));
  }
  return result.data;
};

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const changeSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(64) });

router.post('/login', asyncHandler(async (req, res) => {
  res.json(await authService.login(parse(loginSchema, req.body), req));
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = parse(refreshSchema, req.body);
  res.json(await authService.refresh(refreshToken, req));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken);
  res.status(204).end();
}));

router.put('/change-password', requireAuth, asyncHandler(async (req, res) => {
  res.json(await authService.changePassword(req.user.id, parse(changeSchema, req.body), req));
}));

router.delete('/account', requireAuth, asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user.id);
  res.status(204).end();
}));

export default router;
