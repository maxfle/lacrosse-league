import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole, requireApproved } from '../middleware/auth';

export const gameRouter = Router();

// GET /api/games/recent?level=varsity|jv — last 21 days, for score ticker
gameRouter.get('/recent', async (req: Request, res: Response) => {
  const { level } = req.query;
  try {
    let query = `
      SELECT g.id, g.game_date, g.status, g.is_conference, g.is_in_state,
        hp.school_name AS home_team_name, g.home_team_id,
        ap.school_name AS away_team_name, g.away_team_id,
        (SELECT COALESCE(SUM(gp.home_score), 0) FROM game_periods gp WHERE gp.game_id = g.id) AS home_total,
        (SELECT COALESCE(SUM(gp.away_score), 0) FROM game_periods gp WHERE gp.game_id = g.id) AS away_total
      FROM games g
      JOIN teams ht ON ht.id = g.home_team_id
      JOIN conferences hc ON hc.id = ht.conference_id
      JOIN programs hp ON hp.id = ht.program_id
      JOIN teams at ON at.id = g.away_team_id
      JOIN conferences ac ON ac.id = at.conference_id
      JOIN programs ap ON ap.id = at.program_id
      WHERE g.status = 'completed'
        AND g.game_date >= NOW() - INTERVAL '21 days'
    `;
    const params: string[] = [];

    if (level) {
      params.push(level as string);
      query += ` AND (hc.level = $${params.length} OR ac.level = $${params.length})`;
    }

    query += ' ORDER BY g.game_date DESC LIMIT 20';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/games/upcoming?level=varsity|jv — next 30 days, for score ticker
gameRouter.get('/upcoming', async (req: Request, res: Response) => {
  const { level } = req.query;
  try {
    let query = `
      SELECT g.id, g.game_date, g.status,
        hp.school_name AS home_team_name, g.home_team_id,
        ap.school_name AS away_team_name, g.away_team_id,
        g.field_name
      FROM games g
      JOIN teams ht ON ht.id = g.home_team_id
      JOIN conferences hc ON hc.id = ht.conference_id
      JOIN programs hp ON hp.id = ht.program_id
      JOIN teams at ON at.id = g.away_team_id
      JOIN conferences ac ON ac.id = at.conference_id
      JOIN programs ap ON ap.id = at.program_id
      WHERE g.status = 'scheduled'
        AND g.game_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    `;
    const params: string[] = [];

    if (level) {
      params.push(level as string);
      query += ` AND (hc.level = $${params.length} OR ac.level = $${params.length})`;
    }

    query += ' ORDER BY g.game_date ASC LIMIT 20';
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/games/:gameId — full game detail
gameRouter.get('/:gameId', async (req: Request, res: Response) => {
  const { gameId } = req.params;
  try {
    const [gameResult, periodsResult, statsResult, scoringResult] = await Promise.all([
      pool.query(
        `SELECT g.*,
          hp.school_name AS home_team_name,
          ap.school_name AS away_team_name
         FROM games g
         JOIN teams ht ON ht.id = g.home_team_id
         JOIN programs hp ON hp.id = ht.program_id
         JOIN teams at ON at.id = g.away_team_id
         JOIN programs ap ON ap.id = at.program_id
         WHERE g.id = $1`,
        [gameId]
      ),
      pool.query(
        'SELECT * FROM game_periods WHERE game_id = $1 ORDER BY period_number',
        [gameId]
      ),
      pool.query(
        `SELECT pgs.*, pl.first_name, pl.last_name, pl.jersey_number, pl.position
         FROM player_game_stats pgs
         JOIN players pl ON pl.id = pgs.player_id
         WHERE pgs.game_id = $1
         ORDER BY pl.jersey_number::int`,
        [gameId]
      ),
      pool.query(
        `SELECT se.*, se.quarter,
          s.first_name AS scorer_first, s.last_name AS scorer_last,
          a.first_name AS assist_first, a.last_name AS assist_last,
          se.team_id
         FROM scoring_events se
         JOIN players s ON s.id = se.scorer_id
         LEFT JOIN players a ON a.id = se.assist_id
         WHERE se.game_id = $1
         ORDER BY se.quarter, se.created_at`,
        [gameId]
      ),
    ]);

    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });

    // Head-to-head history
    const game = gameResult.rows[0];
    const h2h = await pool.query(
      `SELECT g.id, g.game_date,
        (SELECT COALESCE(SUM(gp.home_score),0) FROM game_periods gp WHERE gp.game_id = g.id) AS home_total,
        (SELECT COALESCE(SUM(gp.away_score),0) FROM game_periods gp WHERE gp.game_id = g.id) AS away_total,
        hp.school_name AS home_team_name, ap.school_name AS away_team_name
       FROM games g
       JOIN teams ht ON ht.id = g.home_team_id
       JOIN programs hp ON hp.id = ht.program_id
       JOIN teams at ON at.id = g.away_team_id
       JOIN programs ap ON ap.id = at.program_id
       WHERE g.status = 'completed'
         AND ((ht.program_id = (SELECT program_id FROM teams WHERE id = $1)
               AND at.program_id = (SELECT program_id FROM teams WHERE id = $2))
           OR (ht.program_id = (SELECT program_id FROM teams WHERE id = $2)
               AND at.program_id = (SELECT program_id FROM teams WHERE id = $1)))
         AND g.id != $3
       ORDER BY g.game_date DESC
       LIMIT 5`,
      [game.home_team_id, game.away_team_id, gameId]
    );

    return res.json({
      game: gameResult.rows[0],
      periods: periodsResult.rows,
      playerStats: statsResult.rows,
      scoringEvents: scoringResult.rows,
      headToHead: h2h.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/games — coach creates a game
gameRouter.post('/', requireAuth, requireRole('coach', 'admin', 'super_admin'), requireApproved, async (req: Request, res: Response) => {
  const { homeTeamId, awayTeamId, gameDate, gameType, isConference, isInState, fieldName, fieldAddress } = req.body;
  if (!homeTeamId || !awayTeamId || !gameDate) {
    return res.status(400).json({ error: 'homeTeamId, awayTeamId, gameDate required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO games (home_team_id, away_team_id, game_date, game_type, is_conference, is_in_state, field_name, field_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [homeTeamId, awayTeamId, gameDate, gameType || 'regular_season', isConference ?? true, isInState ?? true, fieldName, fieldAddress]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/games/:gameId/stats — coach submits game stats (full grid save)
gameRouter.post('/:gameId/stats', requireAuth, requireRole('coach', 'admin', 'super_admin'), requireApproved, async (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { periods, playerStats, scoringEvents } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mark game completed
    await client.query(`UPDATE games SET status = 'completed', updated_at = NOW() WHERE id = $1`, [gameId]);

    // Upsert periods
    if (periods?.length) {
      for (const p of periods) {
        await client.query(
          `INSERT INTO game_periods (game_id, period_number, home_score, away_score)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (game_id, period_number) DO UPDATE SET home_score=$3, away_score=$4`,
          [gameId, p.period_number, p.home_score, p.away_score]
        );
      }
    }

    // Upsert public player stats
    if (playerStats?.length) {
      for (const s of playerStats) {
        await client.query(
          `INSERT INTO player_game_stats (
             game_id, player_id, team_id,
             goals, assists, shots_on_cage, shots_off_cage,
             ground_balls, caused_turnovers, saves, goals_allowed,
             man_up_goals, man_down_goals, clears_attempted, clears_successful,
             faceoffs_won, faceoffs_lost, faceoffs_attempted, draw_controls
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           ON CONFLICT (game_id, player_id) DO UPDATE SET
             goals=$4, assists=$5, shots_on_cage=$6, shots_off_cage=$7,
             ground_balls=$8, caused_turnovers=$9, saves=$10, goals_allowed=$11,
             man_up_goals=$12, man_down_goals=$13, clears_attempted=$14, clears_successful=$15,
             faceoffs_won=$16, faceoffs_lost=$17, faceoffs_attempted=$18, draw_controls=$19`,
          [
            gameId, s.player_id, s.team_id,
            s.goals||0, s.assists||0, s.shots_on_cage||0, s.shots_off_cage||0,
            s.ground_balls||0, s.caused_turnovers||0, s.saves||0, s.goals_allowed||0,
            s.man_up_goals||0, s.man_down_goals||0, s.clears_attempted||0, s.clears_successful||0,
            s.faceoffs_won||0, s.faceoffs_lost||0, s.faceoffs_attempted||0, s.draw_controls||0,
          ]
        );

        // Upsert private stats
        if (s.unforced_turnovers !== undefined) {
          await client.query(
            `INSERT INTO player_game_stats_private (game_id, player_id, unforced_turnovers)
             VALUES ($1, $2, $3)
             ON CONFLICT (game_id, player_id) DO UPDATE SET unforced_turnovers=$3`,
            [gameId, s.player_id, s.unforced_turnovers||0]
          );
        }
      }
    }

    // Replace scoring events
    if (scoringEvents) {
      await client.query('DELETE FROM scoring_events WHERE game_id = $1', [gameId]);
      for (const e of scoringEvents) {
        await client.query(
          `INSERT INTO scoring_events (game_id, scorer_id, assist_id, team_id, quarter, is_man_up, is_man_down)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [gameId, e.scorer_id, e.assist_id||null, e.team_id, e.quarter, e.is_man_up||false, e.is_man_down||false]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});
