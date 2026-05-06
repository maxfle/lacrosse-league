import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Divider, Skeleton,
} from '@mui/material';
import api from '../api/axios';

interface Period { period_number: number; home_score: number; away_score: number; }
interface PlayerStat {
  player_id: string; first_name: string; last_name: string; jersey_number: string; position: string;
  goals: number; assists: number; shots_on_cage: number; shots_off_cage: number;
  ground_balls: number; caused_turnovers: number; saves: number;
  man_up_goals: number; man_down_goals: number; clears_attempted: number; clears_successful: number;
  faceoffs_won: number; faceoffs_attempted: number; draw_controls: number;
  team_id: string;
}
interface ScoringEvent {
  id: string; quarter: number; scorer_first: string; scorer_last: string;
  assist_first: string | null; assist_last: string | null; team_id: string; is_man_up: boolean; is_man_down: boolean;
}
interface H2HGame {
  id: string; game_date: string; home_team_name: string; away_team_name: string; home_total: number; away_total: number;
}

const PERIOD_LABEL = (n: number) => n <= 4 ? `Q${n}` : `OT${n - 4}`;

export default function GameDetailPage() {
  const { gameId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/games/${gameId}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <Container sx={{ py: 4 }}><Skeleton variant="rectangular" height={400} /></Container>;
  if (!data) return <Container sx={{ py: 4 }}><Typography>Game not found.</Typography></Container>;

  const { game, periods, playerStats, scoringEvents, headToHead } = data;
  const homeTotal = periods.reduce((s: number, p: Period) => s + p.home_score, 0);
  const awayTotal = periods.reduce((s: number, p: Period) => s + p.away_score, 0);
  const homeStats = playerStats.filter((s: PlayerStat) => s.team_id === game.home_team_id);
  const awayStats = playerStats.filter((s: PlayerStat) => s.team_id === game.away_team_id);

  const sumStats = (stats: PlayerStat[]) => ({
    goals: stats.reduce((s, p) => s + p.goals, 0),
    assists: stats.reduce((s, p) => s + p.assists, 0),
    shots: stats.reduce((s, p) => s + p.shots_on_cage + p.shots_off_cage, 0),
    ground_balls: stats.reduce((s, p) => s + p.ground_balls, 0),
    caused_turnovers: stats.reduce((s, p) => s + p.caused_turnovers, 0),
    saves: stats.reduce((s, p) => s + p.saves, 0),
    clears_pct: stats.reduce((s, p) => s + p.clears_successful, 0) + '/' + stats.reduce((s, p) => s + p.clears_attempted, 0),
  });

  const StatTable = ({ stats }: { stats: PlayerStat[] }) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.dark' }}>
            {['#', 'Player', 'G', 'A', 'GB', 'CT', 'SOG', 'Saves', 'FO W/A'].map((h) => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 700, py: 1 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((s) => (
            <TableRow key={s.player_id} hover>
              <TableCell>{s.jersey_number}</TableCell>
              <TableCell>
                <RouterLink to={`/players/${s.player_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {s.first_name} {s.last_name}
                </RouterLink>
              </TableCell>
              <TableCell>{s.goals}</TableCell>
              <TableCell>{s.assists}</TableCell>
              <TableCell>{s.ground_balls}</TableCell>
              <TableCell>{s.caused_turnovers}</TableCell>
              <TableCell>{s.shots_on_cage}</TableCell>
              <TableCell>{s.position === 'goalie' ? s.saves : '—'}</TableCell>
              <TableCell>{s.faceoffs_attempted > 0 ? `${s.faceoffs_won}/${s.faceoffs_attempted}` : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Score header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(game.game_date).toLocaleDateString()} · {game.field_name || 'TBD'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {game.is_conference && <Chip label="Conference" size="small" color="primary" />}
                {!game.is_in_state && <Chip label="Out of State" size="small" variant="outlined" />}
              </Box>
            </Box>

            {/* Period score table */}
            <Table size="small" sx={{ maxWidth: 500 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  {periods.map((p: Period) => <TableCell key={p.period_number} align="center">{PERIOD_LABEL(p.period_number)}</TableCell>)}
                  <TableCell align="center" sx={{ fontWeight: 700 }}>F</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><RouterLink to={`/teams/${game.home_team_id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{game.home_team_name}</RouterLink></TableCell>
                  {periods.map((p: Period) => <TableCell key={p.period_number} align="center">{p.home_score}</TableCell>)}
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{homeTotal}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><RouterLink to={`/teams/${game.away_team_id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{game.away_team_name}</RouterLink></TableCell>
                  {periods.map((p: Period) => <TableCell key={p.period_number} align="center">{p.away_score}</TableCell>)}
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{awayTotal}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Scoring Summary */}
          {scoringEvents.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Scoring Summary</Typography>
                {[1, 2, 3, 4, ...Array.from({ length: Math.max(0, Math.max(...scoringEvents.map((e: ScoringEvent) => e.quarter)) - 4) }, (_, i) => i + 5)].map((q) => {
                  const qEvents = scoringEvents.filter((e: ScoringEvent) => e.quarter === q);
                  if (!qEvents.length) return null;
                  return (
                    <Box key={q} sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">{PERIOD_LABEL(q)}</Typography>
                      {qEvents.map((e: ScoringEvent) => (
                        <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                          <Chip
                            label={e.team_id === game.home_team_id ? game.home_team_name : game.away_team_name}
                            size="small"
                            color={e.team_id === game.home_team_id ? 'primary' : 'default'}
                            sx={{ minWidth: 80 }}
                          />
                          <Typography variant="body2">
                            <strong>{e.scorer_first} {e.scorer_last}</strong>
                            {e.assist_first && ` (A: ${e.assist_first} ${e.assist_last})`}
                            {e.is_man_up && ' 🔺 Man Up'}
                            {e.is_man_down && ' 🔻 Man Down'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Box scores */}
          <Typography variant="h6" gutterBottom>{game.home_team_name}</Typography>
          <StatTable stats={homeStats} />
          <Box mt={1} mb={2}>
            {(() => { const t = sumStats(homeStats); return <Typography variant="caption" color="text.secondary">Goals: {t.goals} | Assists: {t.assists} | Shots: {t.shots} | GB: {t.ground_balls} | CT: {t.caused_turnovers} | Clears: {t.clears_pct}</Typography>; })()}
          </Box>

          <Typography variant="h6" gutterBottom>{game.away_team_name}</Typography>
          <StatTable stats={awayStats} />
          <Box mt={1}>
            {(() => { const t = sumStats(awayStats); return <Typography variant="caption" color="text.secondary">Goals: {t.goals} | Assists: {t.assists} | Shots: {t.shots} | GB: {t.ground_balls} | CT: {t.caused_turnovers} | Clears: {t.clears_pct}</Typography>; })()}
          </Box>
        </Grid>

        {/* Head to head */}
        <Grid item xs={12} md={4}>
          {headToHead.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Head-to-Head History</Typography>
                {headToHead.map((g: H2HGame) => (
                  <Box key={g.id} sx={{ mb: 1 }}>
                    <RouterLink to={`/games/${g.id}`} style={{ textDecoration: 'none' }}>
                      <Typography variant="body2" color="primary">
                        {new Date(g.game_date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        {g.home_team_name} {g.home_total} – {g.away_total} {g.away_team_name}
                      </Typography>
                    </RouterLink>
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
