import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import passport from 'passport';
import { pool } from '../db/pool';
import { signToken } from '../utils/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCoachApprovalNotification,
} from '../utils/email';

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role } = req.body;
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const allowedRoles = ['coach', 'player'];
  const userRole = allowedRoles.includes(role) ? role : 'player';

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();
    const isApproved = userRole !== 'coach'; // coaches need admin approval

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_approved, verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [email, passwordHash, firstName, lastName, userRole, isApproved, verificationToken]
    );

    await sendVerificationEmail(email, verificationToken);

    if (userRole === 'coach') {
      // Notify all admins
      const admins = await pool.query(
        `SELECT email FROM users WHERE role IN ('admin', 'super_admin')`
      );
      for (const admin of admins.rows) {
        await sendCoachApprovalNotification(admin.email, `${firstName} ${lastName}`);
      }
    }

    return res.status(201).json({ message: 'Account created. Please verify your email.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email first' });
    }

    if (user.role === 'coach' && !user.is_approved) {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    const token = signToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify-email?token=xxx
authRouter.get('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const result = await pool.query(
      `UPDATE users SET is_verified = true, verification_token = NULL
       WHERE verification_token = $1 RETURNING id`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    return res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expires, email]
    );
    await sendPasswordResetEmail(email, token);
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/google
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/auth/google/callback
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    const user = req.user!;
    const token = signToken(user.id);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// GET /api/auth/me
authRouter.get('/me', passport.authenticate('jwt', { session: false }), (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
  });
});
