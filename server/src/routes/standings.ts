import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

export const standingsRouter = Router();

// GET /api/standings?conferenceId=xxx&season=2025
standingsRouter.get('/', async (req: Request, res: Response) => {
  const { conferenceId, season } = req.query;
  if (!conferenceId) return res.status(400).json({ error: 'conferenceId required' });

  const seasonYear = Number(season) || new Date().getFullYear();

  try {
    const result = await pool.query(
      `SELECT
        t.id AS team_id,
        p.school_name,
        COUNT(DISTINCT CASE
          WHEN g.status = 'completed' AND g.is_conference = true
            AND (
              (g.home_team_id = t.id AND (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id) >
                                          (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id))
              OR
              (g.away_team_id = t.id AND (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id) >
                                          (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id))
            )
          THEN g.id END) AS conf_wins,
        COUNT(DISTINCT CASE
          WHEN g.status = 'completed' AND g.is_conference = true
            AND (
              (g.home_team_id = t.id AND (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id) <
                                          (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id))
              OR
              (g.away_team_id = t.id AND (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id) <
                                          (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id))
            )
          THEN g.id END) AS conf_losses,
        COUNT(DISTINCT CASE
          WHEN g.status = 'completed'
            AND (
              (g.home_team_id = t.id AND (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id) >
                                          (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id))
              OR
              (g.away_team_id = t.id AND (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id) >
                                          (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id))
            )
          THEN g.id END) AS overall_wins,
        COUNT(DISTINCT CASE
          WHEN g.status = 'completed'
            AND (
              (g.home_team_id = t.id AND (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id) <
                                          (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id))
              OR
              (g.away_team_id = t.id AND (SELECT SUM(gp.away_score) FROM game_periods gp WHERE gp.game_id = g.id) <
                                          (SELECT SUM(gp.home_score) FROM game_periods gp WHERE gp.game_id = g.id))
            )
          THEN g.id END) AS overall_losses
       FROM teams t
       JOIN programs p ON p.id = t.program_id
       LEFT JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id)
       WHERE t.conference_id = $1 AND t.season_year = $2
       GROUP BY t.id, p.school_name
       ORDER BY
         CASE WHEN (COUNT(DISTINCT CASE WHEN g.status='completed' AND g.is_conference=true THEN g.id END)) = 0
              THEN 0
              ELSE conf_wins::float /
                   NULLIF(COUNT(DISTINCT CASE WHEN g.status='completed' AND g.is_conference=true THEN g.id END), 0)
         END DESC`,
      [conferenceId, seasonYear]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
