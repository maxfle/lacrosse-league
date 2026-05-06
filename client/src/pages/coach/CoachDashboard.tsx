import { useEffect, useState, useRef } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, Grid, Alert, Chip, Select, MenuItem,
  FormControl, InputLabel,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

// Stat columns for the entry grid
const PUBLIC_STATS = ['goals','assists','shots_on_cage','shots_off_cage','ground_balls','caused_turnovers','saves','man_up_goals','man_down_goals','clears_attempted','clears_successful','faceoffs_won','faceoffs_lost','faceoffs_attempted'];
const PRIVATE_STATS = ['unforced_turnovers'];
const ALL_STATS = [...PUBLIC_STATS, ...PRIVATE_STATS];

const STAT_LABELS: Record<string, string> = {
  goals: 'G', assists: 'A', shots_on_cage: 'SOG', shots_off_cage: 'SMiss',
  ground_balls: 'GB', caused_turnovers: 'CT', saves: 'Sv', man_up_goals: 'MU',
  man_down_goals: 'MD', clears_attempted: 'ClA', clears_successful: 'ClS',
  faceoffs_won: 'FOW', faceoffs_lost: 'FOL', faceoffs_attempted: 'FOA',
  unforced_turnovers: 'UFT*',
};

function StatEntryGrid({ teamId, game }: { teamId: string; game: any }) {
  const [roster, setRoster] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, Record<string, number>>>({});
  const [periods, setPeriods] = useState([
    { period_number: 1, home_score: 0, away_score: 0 },
    { period_number: 2, home_score: 0, away_score: 0 },
    { period_number: 3, home_score: 0, away_score: 0 },
    { period_number: 4, home_score: 0, away_score: 0 },
  ]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/teams/${teamId}/roster`).then((r) => {
      setRoster(r.data);
      const initial: typeof rows = {};
      r.data.forEach((p: any) => {
        initial[p.id] = Object.fromEntries(ALL_STATS.map((s) => [s, 0]));
      });
      setRows(initial);
    });
  }, [teamId]);

  const updateCell = (playerId: string, stat: string, val: string) => {
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [stat]: Number(val) || 0 } }));
  };

  const addOT = () => {
    setPeriods((prev) => [...prev, { period_number: prev.length + 1, home_score: 0, away_score: 0 }]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const playerStats = roster.map((p) => ({
        player_id: p.id, team_id: teamId,
        ...rows[p.id],
      }));
      await api.post(`/games/${game.id}/stats`, { periods, playerStats });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Stats saved successfully!</Alert>}

      {/* Period scores */}
      <Typography variant="subtitle2" gutterBottom>Score by Period</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {periods.map((p, i) => (
          <Box key={p.period_number} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" textAlign="center">{p.period_number <= 4 ? `Q${p.period_number}` : `OT${p.period_number - 4}`}</Typography>
            <TextField
              size="small" type="number" label="Home" sx={{ width: 60 }}
              value={p.home_score}
              onChange={(e) => setPeriods((prev) => prev.map((q, j) => j === i ? { ...q, home_score: Number(e.target.value) } : q))}
              inputProps={{ min: 0 }}
            />
            <TextField
              size="small" type="number" label="Away" sx={{ width: 60 }}
              value={p.away_score}
              onChange={(e) => setPeriods((prev) => prev.map((q, j) => j === i ? { ...q, away_score: Number(e.target.value) } : q))}
              inputProps={{ min: 0 }}
            />
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addOT} variant="outlined">Add OT</Button>
      </Box>

      {/* Player stat grid */}
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        * Coach-only stats (never shown publicly)
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.dark' }}>
              <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 140 }}>Player</TableCell>
              {ALL_STATS.map((s) => (
                <TableCell key={s} align="center" sx={{ color: PRIVATE_STATS.includes(s) ? '#ffcc80' : 'white', fontWeight: 700, minWidth: 45 }}>
                  {STAT_LABELS[s]}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {roster.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Typography variant="body2">#{p.jersey_number} {p.first_name} {p.last_name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{p.position.replace('_', ' ')}</Typography>
                </TableCell>
                {ALL_STATS.map((stat) => (
                  <TableCell key={stat} align="center" sx={{ p: 0.5 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={rows[p.id]?.[stat] ?? 0}
                      onChange={(e) => updateCell(p.id, stat, e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: 'center', padding: '4px 2px', width: 36 } }}
                      sx={{ '& fieldset': { border: 'none' }, bgcolor: PRIVATE_STATS.includes(stat) ? '#fff8e1' : 'transparent' }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Game Stats'}
        </Button>
      </Box>
    </Box>
  );
}

export default function CoachDashboard() {
  const [tab, setTab] = useState(0);
  const [selectedTeam, _setSelectedTeam] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  // New game form
  const [newGame, setNewGame] = useState({
    awayTeamId: '', gameDate: '', gameType: 'regular_season',
    isConference: true, isInState: true, fieldName: '', fieldAddress: '',
  });
  const [gameMsg, setGameMsg] = useState('');

  useEffect(() => {
    // For now fetch all teams — in a real app filter by coach's programs
    api.get('/leagues').then(() => {
      // placeholder: coaches would see only their teams
    });
  }, []);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeam) return;
    const form = new FormData();
    form.append('roster', file);
    form.append('teamId', selectedTeam);
    try {
      const r = await api.post('/players/csv-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadMsg(`Imported ${r.data.imported} players successfully.`);
    } catch (err: any) {
      setUploadMsg(err.response?.data?.error || 'Upload failed');
    }
  };

  const downloadTemplate = () => {
    window.location.href = '/api/players/csv-template';
  };

  const addGame = async () => {
    if (!selectedTeam || !newGame.awayTeamId || !newGame.gameDate) return;
    try {
      await api.post('/games', { homeTeamId: selectedTeam, ...newGame });
      setGameMsg('Game added successfully.');
      if (selectedTeam) {
        const r = await api.get(`/teams/${selectedTeam}/schedule`);
        setSchedule(r.data);
      }
    } catch (err: any) {
      setGameMsg(err.response?.data?.error || 'Failed to add game');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Coach Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Welcome, {user?.firstName}. Manage your team's roster, schedule, and game statistics below.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="Roster" />
        <Tab label="Schedule" />
        <Tab label="Enter Stats" />
      </Tabs>

      {/* Roster tab */}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>Roster Management</Typography>
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body2" gutterBottom>
              Download the CSV template, fill it in with your players, then upload it to create or update your roster.
              Players will receive an email invitation automatically.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
                Download Template
              </Button>
              <Button variant="contained" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
                Upload Roster CSV
              </Button>
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleCsvUpload} />
            </Box>
            {uploadMsg && <Alert severity={uploadMsg.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{uploadMsg}</Alert>}
          </Card>
        </Box>
      )}

      {/* Schedule tab */}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Add Game</Typography>
          {gameMsg && <Alert severity={gameMsg.includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>{gameMsg}</Alert>}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Game Date & Time" type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={newGame.gameDate} onChange={(e) => setNewGame((g) => ({ ...g, gameDate: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Away Team ID (temporary)"
                  value={newGame.awayTeamId} onChange={(e) => setNewGame((g) => ({ ...g, awayTeamId: e.target.value }))}
                  helperText="Team search coming soon" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Game Type</InputLabel>
                  <Select value={newGame.gameType} label="Game Type"
                    onChange={(e) => setNewGame((g) => ({ ...g, gameType: e.target.value }))}>
                    <MenuItem value="regular_season">Regular Season</MenuItem>
                    <MenuItem value="playoff">Playoff</MenuItem>
                    <MenuItem value="tournament">Tournament</MenuItem>
                    <MenuItem value="scrimmage">Scrimmage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Conf?</InputLabel>
                  <Select value={newGame.isConference ? 'yes' : 'no'} label="Conf?"
                    onChange={(e) => setNewGame((g) => ({ ...g, isConference: e.target.value === 'yes' }))}>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>In State?</InputLabel>
                  <Select value={newGame.isInState ? 'yes' : 'no'} label="In State?"
                    onChange={(e) => setNewGame((g) => ({ ...g, isInState: e.target.value === 'yes' }))}>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Field Name"
                  value={newGame.fieldName} onChange={(e) => setNewGame((g) => ({ ...g, fieldName: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Field Address"
                  value={newGame.fieldAddress} onChange={(e) => setNewGame((g) => ({ ...g, fieldAddress: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={addGame}>Add Game</Button>
              </Grid>
            </Grid>
          </Card>

          {schedule.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.dark' }}>
                    {['Date', 'Opponent', 'Type', 'Status', 'Action'].map((h) => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{new Date(g.game_date).toLocaleDateString()}</TableCell>
                      <TableCell>{g.home_team_id === selectedTeam ? g.away_team_name : g.home_team_name}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{g.game_type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Chip label={g.status} size="small"
                          color={g.status === 'completed' ? 'success' : g.status === 'scheduled' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>
                        {g.status === 'scheduled' && (
                          <Button size="small" variant="outlined" onClick={() => { setSelectedGame(g); setTab(2); }}>
                            Enter Stats
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Stats entry tab */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Enter Game Stats{selectedGame ? ` — vs ${selectedGame.away_team_name} on ${new Date(selectedGame.game_date).toLocaleDateString()}` : ''}
          </Typography>
          {selectedGame && selectedTeam
            ? <StatEntryGrid teamId={selectedTeam} game={selectedGame} />
            : <Typography variant="body2" color="text.secondary">Select a game from the Schedule tab to enter stats.</Typography>}
        </Box>
      )}
    </Container>
  );
}
