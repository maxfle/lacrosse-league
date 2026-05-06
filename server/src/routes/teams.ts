import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole, requireApproved } from '../middleware/auth';

export const teamRouter = Router();

// GET /api/teams/:teamId — team hub data
teamRouter.get('/:teamId', async (req: Request, res: Response) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*, p.school_name, c.name AS conference_name, c.level AS conference_level
       FROM teams t
       JOIN programs p ON p.id = t.program_id
       JOIN conferences c ON c.id = t.conference_id
       WHERE t.id = $1`,
      [teamId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/:teamId/schedule
teamRouter.get('/:teamId/schedule', async (req: Request, res: Response) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
      `SELECT g.*,
        hp.school_name AS home_team_name,
        ap.school_name AS away_team_name,
        (SELECT json_agg(json_build_object('period', gp.period_number, 'home', gp.home_score, 'away', gp.away_score) ORDER BY gp.period_number)
         FROM game_periods gp WHERE gp.game_id = g.id) AS periods
       FROM games g
       JOIN teams ht ON ht.id = g.home_team_id
       JOIN programs hp ON hp.id = ht.program_id
       JOIN teams at ON at.id = g.away_team_id
       JOIN programs ap ON ap.id = at.program_id
       WHERE (g.home_team_id = $1 OR g.away_team_id = $1)
         AND g.status != 'cancelled'
       ORDER BY g.game_date`,
      [teamId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/:teamId/roster
teamRouter.get('/:teamId/roster', async (req: Request, res: Response) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
      `SELECT pl.*, re.season_year,
        rp.is_public AS has_public_recruitment_profile
       FROM roster_entries re
       JOIN players pl ON pl.id = re.player_id
       LEFT JOIN recruitment_profiles rp ON rp.player_id = pl.id
       WHERE re.team_id = $1
       ORDER BY pl.jersey_number::int`,
      [teamId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/:teamId/stats
teamRouter.get('/:teamId/stats', async (req: Request, res: Response) => {
  const { teamId } = req.params;
  try {
    const result = await pool.query(
      `SELECT pl.id, pl.first_name, pl.last_name, pl.jersey_number, pl.position,
        SUM(pgs.goals) AS goals,
        SUM(pgs.assists) AS assists,
        SUM(pgs.shots_on_cage) AS shots_on_cage,
        SUM(pgs.shots_off_cage) AS shots_off_cage,
        SUM(pgs.ground_balls) AS ground_balls,
        SUM(pgs.caused_turnovers) AS caused_turnovers,
        SUM(pgs.saves) AS saves,
        SUM(pgs.faceoffs_won) AS faceoffs_won,
        SUM(pgs.faceoffs_attempted) AS faceoffs_attempted,
        SUM(pgs.draw_controls) AS draw_controls,
        COUNT(DISTINCT pgs.game_id) AS games_played
       FROM player_game_stats pgs
       JOIN players pl ON pl.id = pgs.player_id
       WHERE pgs.team_id = $1
       GROUP BY pl.id
       ORDER BY goals DESC`,
      [teamId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/teams — admin creates a team for a program/conference/season
teamRouter.post('/', requireAuth, requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
  const { programId, conferenceId, seasonYear } = req.body;
  if (!programId || !conferenceId || !seasonYear) {
    return res.status(400).json({ error: 'programId, conferenceId, seasonYear required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO teams (program_id, conference_id, season_year) VALUES ($1, $2, $3) RETURNING *',
      [programId, conferenceId, seasonYear]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
