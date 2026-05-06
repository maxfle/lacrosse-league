import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

export const articleRouter = Router();

// GET /api/articles — published articles for front page slider
articleRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.image_url, a.published_at,
        u.first_name || ' ' || u.last_name AS author_name
       FROM articles a
       JOIN users u ON u.id = a.author_id
       WHERE a.status = 'published'
       ORDER BY a.published_at DESC
       LIMIT 10`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/articles/:articleId
articleRouter.get('/:articleId', async (req: Request, res: Response) => {
  const { articleId } = req.params;
  try {
    const result = await pool.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS author_name
       FROM articles a JOIN users u ON u.id = a.author_id
       WHERE a.id = $1 AND a.status = 'published'`,
      [articleId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/articles — admin publishes article
articleRouter.post('/', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { title, body, imageUrl } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  try {
    const result = await pool.query(
      `INSERT INTO articles (author_id, title, body, image_url, status, published_at)
       VALUES ($1, $2, $3, $4, 'published', NOW()) RETURNING *`,
      [req.user!.id, title, body, imageUrl || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/articles/:articleId — admin edits article
articleRouter.patch('/:articleId', requireAuth, requireRole('admin', 'super_admin'), async (req: Request, res: Response) => {
  const { articleId } = req.params;
  const { title, body, imageUrl } = req.body;
  try {
    const result = await pool.query(
      `UPDATE articles SET title=COALESCE($1,title), body=COALESCE($2,body), image_url=COALESCE($3,image_url), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [title, body, imageUrl, articleId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
