import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Tabs, Tab, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Button, Grid, Skeleton,
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import HistoryIcon from '@mui/icons-material/History';
import api from '../api/axios';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function TeamPage() {
  const { teamId } = useParams();
  const [tab, setTab] = useState(0);
  const [team, setTeam] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/teams/${teamId}`),
      api.get(`/teams/${teamId}/schedule`),
      api.get(`/teams/${teamId}/roster`),
      api.get(`/teams/${teamId}/stats`),
    ]).then(([teamRes, schedRes, rosterRes, statsRes]) => {
      setTeam(teamRes.data);
      setSchedule(schedRes.data);
      setRoster(rosterRes.data);
      setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <Container sx={{ py: 4 }}><Skeleton variant="rectangular" height={400} /></Container>;
  if (!team) return <Container sx={{ py: 4 }}><Typography>Team not found.</Typography></Container>;

  const statLeaders = [...stats].sort((a, b) => b.goals - a.goals).slice(0, 5);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>{team.school_name}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Chip label={team.conference_name} color="primary" size="small" />
          <Chip label={team.conference_level === 'jv' ? 'JV' : 'Varsity'} variant="outlined" size="small" />
          <Chip label={`${team.season_year} Season`} variant="outlined" size="small" />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main content */}
        <Grid item xs={12} md={8}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<ScheduleIcon />} iconPosition="start" label="Schedule" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Roster" />
            <Tab icon={<BarChartIcon />} iconPosition="start" label="Stats" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="History" />
          </Tabs>

          {/* Schedule Tab */}
          <TabPanel value={tab} index={0}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.dark' }}>
                    {['Date', 'Opponent', 'H/A', 'Result', ''].map((h) => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.map((g) => {
                    const isHome = g.home_team_id === teamId;
                    const opponent = isHome ? g.away_team_name : g.home_team_name;
                    const opponentId = isHome ? g.away_team_id : g.home_team_id;
                    const myScore = isHome
                      ? g.periods?.reduce((s: number, p: any) => s + p.home, 0) ?? null
                      : g.periods?.reduce((s: number, p: any) => s + p.away, 0) ?? null;
                    const theirScore = isHome
                      ? g.periods?.reduce((s: number, p: any) => s + p.away, 0) ?? null
                      : g.periods?.reduce((s: number, p: any) => s + p.home, 0) ?? null;
                    const isCompleted = g.status === 'completed';
                    const won = isCompleted && myScore > theirScore;

                    return (
                      <TableRow key={g.id} hover>
                        <TableCell>{new Date(g.game_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <RouterLink to={`/teams/${opponentId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            {opponent}
                          </RouterLink>
                        </TableCell>
                        <TableCell>{isHome ? 'H' : 'A'}</TableCell>
                        <TableCell>
                          {isCompleted ? (
                            <Chip
                              label={`${won ? 'W' : 'L'} ${myScore}-${theirScore}`}
                              size="small"
                              color={won ? 'success' : 'error'}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {new Date(g.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isCompleted && (
                            <Button size="small" variant="outlined" component={RouterLink} to={`/games/${g.id}`}>
                              Box Score
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Roster Tab */}
          <TabPanel value={tab} index={1}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.dark' }}>
                    {['#', 'Name', 'Position', 'Grad Year', ''].map((h) => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roster.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{p.jersey_number}</TableCell>
                      <TableCell>
                        <RouterLink to={`/players/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {p.first_name} {p.last_name}
                        </RouterLink>
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{p.position.replace('_', ' ')}</TableCell>
                      <TableCell>{p.grad_year}</TableCell>
                      <TableCell>
                        {p.has_public_recruitment_profile && (
                          <Button size="small" variant="outlined" color="secondary" component={RouterLink} to={`/recruitment/${p.id}`}>
                            Recruit Profile
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Stats Tab */}
          <TabPanel value={tab} index={2}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.dark' }}>
                    {['Player', 'GP', 'G', 'A', 'Pts', 'GB', 'CT', 'SOG'].map((h) => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <RouterLink to={`/players/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {s.first_name} {s.last_name}
                        </RouterLink>
                      </TableCell>
                      <TableCell>{s.games_played}</TableCell>
                      <TableCell>{s.goals}</TableCell>
                      <TableCell>{s.assists}</TableCell>
                      <TableCell>{Number(s.goals) + Number(s.assists)}</TableCell>
                      <TableCell>{s.ground_balls}</TableCell>
                      <TableCell>{s.caused_turnovers}</TableCell>
                      <TableCell>{s.shots_on_cage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* History Tab */}
          <TabPanel value={tab} index={3}>
            <Typography variant="body2" color="text.secondary">
              Historical season data will appear here as seasons are completed.
            </Typography>
          </TabPanel>
        </Grid>

        {/* Sidebar widgets */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Stat Leaders</Typography>
              {statLeaders.map((p, i) => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2">
                    {i + 1}. <RouterLink to={`/players/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {p.first_name} {p.last_name}
                    </RouterLink>
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {p.goals}G {p.assists}A
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
