import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Select, MenuItem, FormControl, InputLabel, Skeleton,
} from '@mui/material';
import api from '../api/axios';

export default function PlayerPage() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [season, setSeason] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/players/${playerId}`),
      api.get(`/players/${playerId}/stats`),
    ]).then(([playerRes, statsRes]) => {
      setPlayer(playerRes.data);
      setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, [playerId]);

  if (loading) return <Container sx={{ py: 4 }}><Skeleton variant="rectangular" height={300} /></Container>;
  if (!player) return <Container sx={{ py: 4 }}><Typography>Player not found.</Typography></Container>;

  const seasons = [...new Set(stats.map((s) => new Date(s.game_date).getFullYear().toString()))].sort((a, b) => Number(b) - Number(a));
  const filteredStats = season ? stats.filter((s) => new Date(s.game_date).getFullYear().toString() === season) : stats;

  const totals = (rows: typeof stats) => ({
    games: rows.length,
    goals: rows.reduce((s, r) => s + Number(r.goals), 0),
    assists: rows.reduce((s, r) => s + Number(r.assists), 0),
    ground_balls: rows.reduce((s, r) => s + Number(r.ground_balls), 0),
    caused_turnovers: rows.reduce((s, r) => s + Number(r.caused_turnovers), 0),
    shots_on_cage: rows.reduce((s, r) => s + Number(r.shots_on_cage), 0),
    saves: rows.reduce((s, r) => s + Number(r.saves), 0),
    faceoffs_won: rows.reduce((s, r) => s + Number(r.faceoffs_won), 0),
    faceoffs_attempted: rows.reduce((s, r) => s + Number(r.faceoffs_attempted), 0),
  });

  const allTotals = totals(stats);
  const inStateTotals = totals(stats.filter((s) => s.is_in_state));
  const selectedTotals = totals(filteredStats);

  const StatSummaryCard = ({ label, t }: { label: string; t: ReturnType<typeof totals> }) => (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>{label}</Typography>
        <Grid container spacing={1}>
          {[
            ['GP', t.games], ['G', t.goals], ['A', t.assists],
            ['GB', t.ground_balls], ['CT', t.caused_turnovers], ['SOG', t.shots_on_cage],
          ].map(([lbl, val]) => (
            <Grid item xs={4} key={String(lbl)}>
              <Typography variant="caption" color="text.secondary">{lbl}</Typography>
              <Typography variant="h6" fontWeight={700}>{val}</Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            #{player.jersey_number} {player.first_name} {player.last_name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip label={player.position.replace('_', ' ')} color="primary" size="small" sx={{ textTransform: 'capitalize' }} />
            <Chip label={`Class of ${player.grad_year}`} variant="outlined" size="small" />
            <Chip
              label={player.school_name}
              variant="outlined"
              size="small"
              component={RouterLink}
              to={`/teams/${player.program_id}`}
              clickable
            />
          </Box>
        </Box>
        <Button variant="outlined" color="secondary" component={RouterLink} to={`/recruitment/${playerId}`}>
          Recruitment Profile
        </Button>
      </Box>

      {/* Stat summaries */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}><StatSummaryCard label="Career (All Games)" t={allTotals} /></Grid>
        <Grid item xs={12} sm={4}><StatSummaryCard label="Career (In-State Only)" t={inStateTotals} /></Grid>
        <Grid item xs={12} sm={4}><StatSummaryCard label={season ? `${season} Season` : 'All Seasons'} t={selectedTotals} /></Grid>
      </Grid>

      {/* Season selector + game log */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Game Log</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Season</InputLabel>
          <Select value={season} label="Season" onChange={(e) => setSeason(e.target.value)}>
            <MenuItem value="">All Seasons</MenuItem>
            {seasons.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.dark' }}>
              {['Date', 'Opponent', 'G', 'A', 'GB', 'CT', 'SOG', 'Saves', 'FO'].map((h) => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStats.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <RouterLink to={`/games/${s.game_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {new Date(s.game_date).toLocaleDateString()}
                  </RouterLink>
                </TableCell>
                <TableCell>{s.opponent}</TableCell>
                <TableCell>{s.goals}</TableCell>
                <TableCell>{s.assists}</TableCell>
                <TableCell>{s.ground_balls}</TableCell>
                <TableCell>{s.caused_turnovers}</TableCell>
                <TableCell>{s.shots_on_cage}</TableCell>
                <TableCell>{s.saves || '—'}</TableCell>
                <TableCell>{s.faceoffs_attempted > 0 ? `${s.faceoffs_won}/${s.faceoffs_attempted}` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
