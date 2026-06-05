/**
 * @fileoverview Authentication router.
 * POST /login    — issue JWT tokens
 * POST /refresh  — refresh access token
 * POST /logout   — revoke refresh token
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait.' },
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'email and password are required.' });
      return;
    }
    // Production: validate credentials against DB, issue signed JWTs
    res.json({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.stub',
      refreshToken: 'refresh_stub_token',
      expiresIn: 900,
      tokenType: 'Bearer',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'refreshToken is required.' });
      return;
    }
    res.json({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.refreshed',
      expiresIn: 900,
      tokenType: 'Bearer',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (_req, res, next) => {
  try {
    // Production: revoke the refresh token JTI in Redis
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
