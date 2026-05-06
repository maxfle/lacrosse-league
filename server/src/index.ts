import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import https from 'https';
import { authRouter } from './routes/auth';
import { leagueRouter } from './routes/leagues';
import { teamRouter } from './routes/teams';
import { playerRouter } from './routes/players';
import { gameRouter } from './routes/games';
import { articleRouter } from './routes/articles';
import { standingsRouter } from './routes/standings';
import { adminRouter } from './routes/admin';
import { recruitmentRouter } from './routes/recruitment';
import { configurePassport } from './config/passport';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(passport.initialize());

configurePassport(passport);

app.use('/api/auth', authRouter);
app.use('/api/leagues', leagueRouter);
app.use('/api/teams', teamRouter);
app.use('/api/players', playerRouter);
app.use('/api/games', gameRouter);
app.use('/api/articles', articleRouter);
app.use('/api/standings', standingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/recruitment', recruitmentRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Proxy laxnumbers scoreboard API (avoids CORS + client-side rendering issues)
app.get('/api/proxy/laxnumbers/scoreboard/:divId/:date', (req, res) => {
  const { divId, date } = req.params;
  const url = `https://laxnumbers.com/services/scoreboard/${divId}/${date}`;
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try { res.json(JSON.parse(data)); } catch { res.json([]); }
    });
  }).on('error', () => res.json([]));
});

// Proxy laxnumbers ratings API
app.get('/api/proxy/laxnumbers/ratings', (req, res) => {
  const { y, v } = req.query;
  const url = `https://laxnumbers.com/ratings/service?y=${y}&v=${v}`;
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try { res.json(JSON.parse(data)); } catch { res.json([]); }
    });
  }).on('error', () => res.json([]));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
