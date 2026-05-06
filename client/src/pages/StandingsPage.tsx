import { useEffect, useState } from 'react';
import {
  Container, Typography, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, FormControl, InputLabel, Skeleton,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/axios';

interface Conference { id: string; name: string; level: string; }
interface StandingRow {
  team_id: string; school_name: string;
  conf_wins: number; conf_losses: number;
  overall_wins: number; overall_losses: number;
}

function StandingsTable({ rows, label }: { rows: StandingRow[]; label: string }) {
  const winPct = (w: number, l: number) => {
    const total = w + l;
    return total === 0 ? '.000' : (w / total).toFixed(3).replace(/^0/, '');
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>{label}</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.dark' }}>
              {['Team', 'Conf W', 'Conf L', 'Conf Pct', 'Overall W', 'Overall L', 'Overall Pct'].map((h) => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.team_id} hover>
                <TableCell>
                  <RouterLink to={`/teams/${row.team_id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                    {row.school_name}
                  </RouterLink>
                </TableCell>
                <TableCell>{row.conf_wins}</TableCell>
                <TableCell>{row.conf_losses}</TableCell>
                <TableCell>{winPct(Number(row.conf_wins), Number(row.conf_losses))}</TableCell>
                <TableCell>{row.overall_wins}</TableCell>
                <TableCell>{row.overall_losses}</TableCell>
                <TableCell>{winPct(Number(row.overall_wins), Number(row.overall_losses))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function StandingsPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [standingsMap, setStandingsMap] = useState<Record<string, StandingRow[]>>({});
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const seasonOptions = [currentYear, currentYear - 1, currentYear - 2].map(String);

  useEffect(() => {
    api.get('/leagues').then((r) => {
      const allConfs: Conference[] = r.data.flatMap((l: any) => l.conferences || []);
      allConfs.sort((a, b) => (a as any).display_order - (b as any).display_order);
      setConferences(allConfs);
    });
  }, []);

  useEffect(() => {
    if (conferences.length === 0) return;
    setLoading(true);
    Promise.all(
      conferences.map((c) =>
        api.get(`/standings?conferenceId=${c.id}&season=${season}`)
          .then((r) => ({ id: c.id, rows: r.data }))
      )
    ).then((results) => {
      const map: Record<string, StandingRow[]> = {};
      results.forEach((r) => { map[r.id] = r.rows; });
      setStandingsMap(map);
    }).finally(() => setLoading(false));
  }, [conferences, season]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Standings</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Season</InputLabel>
          <Select value={season} label="Season" onChange={(e) => setSeason(e.target.value)}>
            {seasonOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading
        ? <Skeleton variant="rectangular" height={300} />
        : conferences.map((conf) => (
            <StandingsTable
              key={conf.id}
              label={`${conf.name}${conf.level === 'jv' ? ' (Unofficial — No Playoffs)' : ''}`}
              rows={standingsMap[conf.id] || []}
            />
          ))}
    </Container>
  );
}
