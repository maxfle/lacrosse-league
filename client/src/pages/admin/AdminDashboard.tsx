import { useEffect, useState } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Alert, TextField, Select, MenuItem, FormControl,
  InputLabel, Grid,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api/axios';

interface PendingCoach { id: string; email: string; first_name: string; last_name: string; created_at: string; }
interface RecruitingPeriod { period_type: string; start_date: string; end_date: string; }

function PendingCoaches() {
  const [coaches, setCoaches] = useState<PendingCoach[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/admin/pending-coaches').then((r) => setCoaches(r.data));
  }, []);

  const handle = async (userId: string, approved: boolean) => {
    await api.post('/admin/approve-coach', { userId, approved });
    setCoaches((prev) => prev.filter((c) => c.id !== userId));
    setMessage(`Coach ${approved ? 'approved' : 'rejected'}.`);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Pending Coach Approvals</Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
      {coaches.length === 0
        ? <Typography variant="body2" color="text.secondary">No pending approvals.</Typography>
        : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.dark' }}>
                  {['Name', 'Email', 'Requested', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {coaches.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.first_name} {c.last_name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" color="success" startIcon={<CheckIcon />} onClick={() => handle(c.id, true)} sx={{ mr: 1 }}>Approve</Button>
                      <Button size="small" color="error" startIcon={<CloseIcon />} onClick={() => handle(c.id, false)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
    </Box>
  );
}

function RecruitingPeriodManager() {
  const [period, setPeriod] = useState<RecruitingPeriod>({ period_type: 'no_contact', start_date: '', end_date: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/admin/recruiting-period').then((r) => { if (r.data) setPeriod(r.data); });
  }, []);

  const save = async () => {
    await api.post('/admin/recruiting-period', {
      periodType: period.period_type,
      startDate: period.start_date,
      endDate: period.end_date,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>NCAA Recruiting Period Banner</Typography>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Saved successfully.</Alert>}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Period Type</InputLabel>
              <Select value={period.period_type} label="Period Type"
                onChange={(e) => setPeriod((p) => ({ ...p, period_type: e.target.value }))}>
                <MenuItem value="dead">Dead Period</MenuItem>
                <MenuItem value="no_contact">No Contact Period</MenuItem>
                <MenuItem value="contact">Contact Period</MenuItem>
                <MenuItem value="evaluation">Evaluation Period</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Start Date" type="date" InputLabelProps={{ shrink: true }}
              value={period.start_date?.split('T')[0] || ''}
              onChange={(e) => setPeriod((p) => ({ ...p, start_date: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="End Date" type="date" InputLabelProps={{ shrink: true }}
              value={period.end_date?.split('T')[0] || ''}
              onChange={(e) => setPeriod((p) => ({ ...p, end_date: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="contained" fullWidth onClick={save}>Save Banner</Button>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Admin Dashboard</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="Pending Approvals" />
        <Tab label="Recruiting Period" />
      </Tabs>
      {tab === 0 && <PendingCoaches />}
      {tab === 1 && <RecruitingPeriodManager />}
    </Container>
  );
}
