import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendCoachApprovalResult } from '../utils/email';

export const adminRouter = Router();

// GET /api/admin/recruiting-period — public so the banner shows to unauthenticated users
adminRouter.get('/recruiting-period', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM recruiting_period ORDER BY updated_at DESC LIMIT 1`
    );
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// All remaining admin routes require auth + admin role
adminRouter.use(requireAuth, requireRole('admin', 'super_admin'));

// GET /api/admin/pending-coaches
adminRouter.get('/pending-coaches', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, created_at
       FROM users WHERE role = 'coach' AND is_approved = false AND is_verified = true
       ORDER BY created_at`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/approve-coach
adminRouter.post('/approve-coach', async (req: Request, res: Response) => {
  const { userId, approved } = req.body;
  if (!userId || approved === undefined) {
    return res.status(400).json({ error: 'userId and approved required' });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET is_approved = $1 WHERE id = $2 AND role = 'coach' RETURNING email, first_name, last_name`,
      [approved, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coach not found' });
    await sendCoachApprovalResult(result.rows[0].email, approved);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/recruiting-period
adminRouter.post('/recruiting-period', async (req: Request, res: Response) => {
  const { periodType, startDate, endDate, sport } = req.body;
  if (!periodType || !startDate || !endDate) {
    return res.status(400).json({ error: 'periodType, startDate, endDate required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO recruiting_period (period_type, start_date, end_date, sport, updated_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [periodType, startDate, endDate, sport || 'boys_lacrosse', req.user!.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/promote — super_admin promotes user to admin
adminRouter.post('/promote', requireRole('super_admin'), async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin' WHERE id = $1 RETURNING id, email, first_name, last_name, role`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/programs — all programs for admin management
adminRouter.get('/programs', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, l.name AS league_name,
        json_agg(json_build_object('id', pc.user_id, 'name', u.first_name || ' ' || u.last_name, 'is_head', pc.is_head_coach)) AS coaches
       FROM programs pr
       JOIN leagues l ON l.id = pr.league_id
       LEFT JOIN program_coaches pc ON pc.program_id = pr.id
       LEFT JOIN users u ON u.id = pc.user_id
       GROUP BY pr.id, l.name
       ORDER BY pr.school_name`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
