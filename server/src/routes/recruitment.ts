import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendProfileVisibilityChanged, sendProfilePublicRequest } from '../utils/email';

export const recruitmentRouter = Router();

// GET /api/recruitment/:playerId — get recruitment profile (if public, or own profile, or coach of player)
recruitmentRouter.get('/:playerId', requireAuth, async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const requestingUser = req.user!;

  try {
    const profileResult = await pool.query(
      `SELECT rp.*, hl.id AS hl_id, hl.url, hl.label,
        pl.first_name, pl.last_name, pl.program_id
       FROM recruitment_profiles rp
       JOIN players pl ON pl.id = rp.player_id
       LEFT JOIN highlight_links hl ON hl.recruitment_profile_id = rp.id
       WHERE rp.player_id = $1`,
      [playerId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recruitment profile not found' });
    }

    const profile = profileResult.rows[0];

    // Check access
    const isOwnProfile = requestingUser.role === 'player' &&
      (await pool.query('SELECT id FROM players WHERE user_id = $1 AND id = $2', [requestingUser.id, playerId])).rows.length > 0;

    const isCoachOfPlayer = ['coach', 'admin', 'super_admin'].includes(requestingUser.role) &&
      (await pool.query(
        `SELECT pc.id FROM program_coaches pc
         JOIN players pl ON pl.program_id = pc.program_id
         WHERE pl.id = $1 AND pc.user_id = $2`,
        [playerId, requestingUser.id]
      )).rows.length > 0;

    const isAdmin = ['admin', 'super_admin'].includes(requestingUser.role);

    if (!profile.is_public && !isOwnProfile && !isCoachOfPlayer && !isAdmin) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Strip contact info if not coach/admin/own
    if (!isOwnProfile && !isCoachOfPlayer && !isAdmin) {
      delete profile.phone;
      delete profile.parent_name;
      delete profile.parent_phone;
      delete profile.parent_email;
    }

    // Aggregate highlight links
    const links = profileResult.rows
      .filter(r => r.hl_id)
      .map(r => ({ id: r.hl_id, url: r.url, label: r.label }));

    return res.json({ ...profile, highlightLinks: links });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recruitment — player creates their profile
recruitmentRouter.post('/', requireAuth, requireRole('player'), async (req: Request, res: Response) => {
  const { playerId, gpa, possibleMajors, travelClubs, awards, commitmentStatus, committedTo, extracurriculars, phone, parentName, parentPhone, parentEmail } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });

  try {
    // Verify player owns this profile
    const check = await pool.query('SELECT id FROM players WHERE id = $1 AND user_id = $2', [playerId, req.user!.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    const result = await pool.query(
      `INSERT INTO recruitment_profiles
         (player_id, gpa, possible_majors, travel_clubs, awards, commitment_status, committed_to, extracurriculars, phone, parent_name, parent_phone, parent_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (player_id) DO UPDATE SET
         gpa=$2, possible_majors=$3, travel_clubs=$4, awards=$5,
         commitment_status=$6, committed_to=$7, extracurriculars=$8,
         phone=$9, parent_name=$10, parent_phone=$11, parent_email=$12,
         updated_at=NOW()
       RETURNING *`,
      [playerId, gpa, possibleMajors, travelClubs, awards, commitmentStatus||'uncommitted', committedTo, extracurriculars, phone, parentName, parentPhone, parentEmail]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recruitment/:playerId/highlight-links
recruitmentRouter.post('/:playerId/highlight-links', requireAuth, requireRole('player'), async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { url, label } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const check = await pool.query('SELECT rp.id FROM recruitment_profiles rp JOIN players pl ON pl.id = rp.player_id WHERE pl.id = $1 AND pl.user_id = $2', [playerId, req.user!.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    const result = await pool.query(
      'INSERT INTO highlight_links (recruitment_profile_id, url, label) VALUES ($1,$2,$3) RETURNING *',
      [check.rows[0].id, url, label]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/recruitment/:playerId/request-public — player requests their profile be made public
recruitmentRouter.post('/:playerId/request-public', requireAuth, requireRole('player'), async (req: Request, res: Response) => {
  const { playerId } = req.params;
  try {
    const playerResult = await pool.query(
      `SELECT pl.first_name, pl.last_name, u.email AS coach_email
       FROM players pl
       JOIN program_coaches pc ON pc.program_id = pl.program_id AND pc.is_head_coach = true
       JOIN users u ON u.id = pc.user_id
       WHERE pl.id = $1 AND pl.user_id = $2`,
      [playerId, req.user!.id]
    );
    if (playerResult.rows.length === 0) return res.status(403).json({ error: 'Not authorized' });

    const { first_name, last_name, coach_email } = playerResult.rows[0];
    await sendProfilePublicRequest(coach_email, `${first_name} ${last_name}`);
    return res.json({ message: 'Request sent to your coach' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/recruitment/:playerId/visibility — coach toggles profile visibility
recruitmentRouter.patch('/:playerId/visibility', requireAuth, requireRole('coach', 'admin', 'super_admin'), async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { isPublic } = req.body;
  if (isPublic === undefined) return res.status(400).json({ error: 'isPublic required' });

  try {
    const result = await pool.query(
      `UPDATE recruitment_profiles SET is_public = $1, updated_at = NOW()
       WHERE player_id = $2 RETURNING *`,
      [isPublic, playerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    // Notify player
    const playerEmail = await pool.query(
      `SELECT u.email FROM players pl JOIN users u ON u.id = pl.user_id WHERE pl.id = $1`,
      [playerId]
    );
    if (playerEmail.rows.length > 0) {
      await sendProfileVisibilityChanged(playerEmail.rows[0].email, isPublic);
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
