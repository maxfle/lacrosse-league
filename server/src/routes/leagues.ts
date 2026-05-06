import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

export const leagueRouter = Router();

// GET /api/leagues
leagueRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT l.*,
        json_agg(json_build_object('id', c.id, 'name', c.name, 'level', c.level, 'display_order', c.display_order)
          ORDER BY c.display_order) AS conferences
       FROM leagues l
       LEFT JOIN conferences c ON c.league_id = l.id
       WHERE l.is_active = true
       GROUP BY l.id`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leagues — super_admin only
leagueRouter.post('/', requireAuth, requireRole('super_admin'), async (req: Request, res: Response) => {
  const { name, sport, state } = req.body;
  if (!name || !sport || !state) return res.status(400).json({ error: 'name, sport, state required' });
  try {
    const result = await pool.query(
      'INSERT INTO leagues (name, sport, state) VALUES ($1, $2, $3) RETURNING *',
      [name, sport, state]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leagues/:leagueId/conferences
leagueRouter.post('/:leagueId/conferences', requireAuth, requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
  const { leagueId } = req.params;
  const { name, level, displayOrder } = req.body;
  if (!name || !level) return res.status(400).json({ error: 'name and level required' });
  try {
    const result = await pool.query(
      'INSERT INTO conferences (league_id, name, level, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [leagueId, name, level, displayOrder || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
