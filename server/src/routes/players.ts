import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { pool } from '../db/pool';
import { requireAuth, requireRole, requireApproved } from '../middleware/auth';
import { sendPlayerInviteEmail } from '../utils/email';

export const playerRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/players/:playerId — public player profile
playerRouter.get('/:playerId', async (req: Request, res: Response) => {
  const { playerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT pl.id, pl.first_name, pl.last_name, pl.jersey_number, pl.position, pl.grad_year,
        pl.program_id, p.school_name
       FROM players pl
       JOIN programs p ON p.id = pl.program_id
       WHERE pl.id = $1 AND pl.is_active = true`,
      [playerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/players/:playerId/stats — career + per season stats
playerRouter.get('/:playerId/stats', async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { season } = req.query;

  try {
    let query = `
      SELECT
        pgs.*,
        g.game_date, g.is_in_state, g.season_year,
        CASE WHEN g.home_team_id = pgs.team_id THEN ap.school_name ELSE hp.school_name END AS opponent
      FROM player_game_stats pgs
      JOIN games g ON g.id = pgs.game_id
      JOIN teams ht ON ht.id = g.home_team_id
      JOIN programs hp ON hp.id = ht.program_id
      JOIN teams at ON at.id = g.away_team_id
      JOIN programs ap ON ap.id = at.program_id
      WHERE pgs.player_id = $1 AND g.status = 'completed'
    `;
    const params: (string | number)[] = [playerId];

    if (season) {
      query += ` AND EXTRACT(YEAR FROM g.game_date) = $2`;
      params.push(Number(season));
    }

    query += ' ORDER BY g.game_date DESC';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/players/csv-upload — coach uploads roster CSV
playerRouter.post(
  '/csv-upload',
  requireAuth,
  requireRole('coach', 'admin', 'super_admin'),
  requireApproved,
  upload.single('roster'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });

    try {
      const records = parse(req.file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<{
        first_name: string;
        last_name: string;
        jersey_number: string;
        position: string;
        grad_year: string;
        email: string;
      }>;

      // Verify coach owns this team
      const teamCheck = await pool.query(
        `SELECT t.program_id FROM teams t
         JOIN program_coaches pc ON pc.program_id = t.program_id
         WHERE t.id = $1 AND pc.user_id = $2`,
        [teamId, req.user!.id]
      );
      if (teamCheck.rows.length === 0 && !['admin', 'super_admin'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Not authorized for this team' });
      }

      const programId = teamCheck.rows[0]?.program_id;
      const seasonYear = new Date().getFullYear();
      const results = [];

      for (const row of records) {
        if (!row.first_name || !row.last_name || !row.email) continue;

        // Upsert player by email within program
        const existing = await pool.query(
          'SELECT id FROM players WHERE invite_email = $1 AND program_id = $2',
          [row.email.toLowerCase(), programId]
        );

        let playerId: string;
        if (existing.rows.length > 0) {
          playerId = existing.rows[0].id;
          await pool.query(
            `UPDATE players SET first_name=$1, last_name=$2, jersey_number=$3, position=$4, grad_year=$5, updated_at=NOW()
             WHERE id=$6`,
            [row.first_name, row.last_name, row.jersey_number, row.position, Number(row.grad_year), playerId]
          );
        } else {
          const newPlayer = await pool.query(
            `INSERT INTO players (program_id, first_name, last_name, jersey_number, position, grad_year, invite_email)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [programId, row.first_name, row.last_name, row.jersey_number, row.position, Number(row.grad_year), row.email.toLowerCase()]
          );
          playerId = newPlayer.rows[0].id;

          // Send invite email
          await sendPlayerInviteEmail(row.email, `${row.first_name} ${row.last_name}`, teamId);
          await pool.query('UPDATE players SET invite_sent_at = NOW() WHERE id = $1', [playerId]);
        }

        // Add to roster for this season if not already there
        await pool.query(
          `INSERT INTO roster_entries (team_id, player_id, season_year)
           VALUES ($1, $2, $3)
           ON CONFLICT (team_id, player_id, season_year) DO NOTHING`,
          [teamId, playerId, seasonYear]
        );

        results.push({ playerId, name: `${row.first_name} ${row.last_name}` });
      }

      return res.json({ imported: results.length, players: results });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/players/csv-template — download blank CSV template
playerRouter.get('/csv-template', requireAuth, requireRole('coach', 'admin', 'super_admin'), (_req: Request, res: Response) => {
  const headers = 'first_name,last_name,jersey_number,position,grad_year,email\n';
  const example = 'John,Smith,22,attack,2026,jsmith@email.com\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="roster_template.csv"');
  return res.send(headers + example);
});
