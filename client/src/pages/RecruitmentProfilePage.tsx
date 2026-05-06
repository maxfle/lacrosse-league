import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid, Chip,
  TextField, Button, Alert, Divider, List, ListItem,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const COMMITMENT_LABELS: Record<string, string> = {
  uncommitted: 'Uncommitted',
  has_offer: 'Has Offer',
  committed: 'Committed',
  signed: 'Signed NLI',
};

const COMMITMENT_COLORS: Record<string, 'default' | 'primary' | 'success' | 'secondary'> = {
  uncommitted: 'default',
  has_offer: 'primary',
  committed: 'success',
  signed: 'secondary',
};

export default function RecruitmentProfilePage() {
  const { playerId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [newLink, setNewLink] = useState({ url: '', label: '' });
  const [saved, setSaved] = useState(false);

  const isPlayer = user?.role === 'player';
  const isCoach = ['coach', 'admin', 'super_admin'].includes(user?.role || '');

  useEffect(() => {
    api.get(`/recruitment/${playerId}`)
      .then((r) => { setProfile(r.data); setForm(r.data); })
      .catch((err) => setError(err.response?.data?.error || 'Access denied'));
  }, [playerId]);

  const save = async () => {
    await api.post('/recruitment', {
      playerId,
      gpa: form.gpa,
      possibleMajors: form.possible_majors,
      travelClubs: form.travel_clubs,
      awards: form.awards,
      commitmentStatus: form.commitment_status,
      committedTo: form.committed_to,
      extracurriculars: form.extracurriculars,
      phone: form.phone,
      parentName: form.parent_name,
      parentPhone: form.parent_phone,
      parentEmail: form.parent_email,
    });
    setSaved(true);
    setEditing(false);
    const r = await api.get(`/recruitment/${playerId}`);
    setProfile(r.data);
  };

  const addLink = async () => {
    if (!newLink.url) return;
    await api.post(`/recruitment/${playerId}/highlight-links`, newLink);
    setNewLink({ url: '', label: '' });
    const r = await api.get(`/recruitment/${playerId}`);
    setProfile(r.data);
  };

  const requestPublic = async () => {
    await api.post(`/recruitment/${playerId}/request-public`);
    setSaved(true);
  };

  const toggleVisibility = async () => {
    await api.patch(`/recruitment/${playerId}/visibility`, { isPublic: !profile.is_public });
    const r = await api.get(`/recruitment/${playerId}`);
    setProfile(r.data);
  };

  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!profile) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>{profile.first_name} {profile.last_name}</Typography>
          <Typography variant="subtitle1" color="text.secondary">Recruitment Profile</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={profile.is_public ? 'Public' : 'Private'}
            color={profile.is_public ? 'success' : 'default'}
            variant="outlined"
          />
          <Chip
            label={COMMITMENT_LABELS[profile.commitment_status] || profile.commitment_status}
            color={COMMITMENT_COLORS[profile.commitment_status]}
          />
          {isCoach && (
            <Button size="small" variant="outlined" onClick={toggleVisibility}>
              {profile.is_public ? 'Make Private' : 'Make Public'}
            </Button>
          )}
          {isPlayer && !profile.is_public && (
            <Button size="small" variant="outlined" onClick={requestPublic}>
              Request Public
            </Button>
          )}
          {isPlayer && (
            <Button size="small" variant="contained" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          )}
        </Box>
      </Box>

      {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Saved!</Alert>}

      {editing ? (
        <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" label="GPA" type="number"
                value={form.gpa || ''} onChange={(e) => setForm((f: any) => ({ ...f, gpa: e.target.value }))}
                inputProps={{ step: '0.01', min: 0, max: 4 }} />
            </Grid>
            <Grid item xs={6} sm={9}>
              <TextField fullWidth size="small" label="Possible Majors"
                value={form.possible_majors || ''} onChange={(e) => setForm((f: any) => ({ ...f, possible_majors: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Travel Clubs"
                value={form.travel_clubs || ''} onChange={(e) => setForm((f: any) => ({ ...f, travel_clubs: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Awards"
                value={form.awards || ''} onChange={(e) => setForm((f: any) => ({ ...f, awards: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Extracurricular Activities" multiline rows={2}
                value={form.extracurriculars || ''} onChange={(e) => setForm((f: any) => ({ ...f, extracurriculars: e.target.value }))} />
            </Grid>
            <Grid item xs={12}><Divider>Contact Info (Coaches Only)</Divider></Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Player Phone"
                value={form.phone || ''} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Parent / Guardian Name"
                value={form.parent_name || ''} onChange={(e) => setForm((f: any) => ({ ...f, parent_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Parent Phone"
                value={form.parent_phone || ''} onChange={(e) => setForm((f: any) => ({ ...f, parent_phone: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Parent Email"
                value={form.parent_email || ''} onChange={(e) => setForm((f: any) => ({ ...f, parent_email: e.target.value }))} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" onClick={save}>Save Profile</Button>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Academic</Typography>
                <Typography><strong>GPA:</strong> {profile.gpa ?? 'Not provided'}</Typography>
                <Typography><strong>Possible Majors:</strong> {profile.possible_majors || 'Not provided'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Athletics</Typography>
                <Typography><strong>Travel Clubs:</strong> {profile.travel_clubs || 'Not provided'}</Typography>
                <Typography><strong>Awards:</strong> {profile.awards || 'Not provided'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          {profile.extracurriculars && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Extracurriculars</Typography>
                  <Typography>{profile.extracurriculars}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {(isCoach || isPlayer) && (profile.phone || profile.parent_name) && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: '#f8f9fa' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Contact Information (Coaches Only)</Typography>
                  {profile.phone && <Typography><strong>Player Phone:</strong> {profile.phone}</Typography>}
                  {profile.parent_name && <Typography><strong>Parent:</strong> {profile.parent_name}</Typography>}
                  {profile.parent_phone && <Typography><strong>Parent Phone:</strong> {profile.parent_phone}</Typography>}
                  {profile.parent_email && <Typography><strong>Parent Email:</strong> {profile.parent_email}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Highlight Links */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideoLibraryIcon /> Highlight Film
        </Typography>
        <List>
          {(profile.highlightLinks || []).map((link: any) => (
            <ListItem key={link.id} disableGutters>
              <ListItemText
                primary={<a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || link.url}</a>}
              />
            </ListItem>
          ))}
        </List>
        {isPlayer && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField size="small" label="Video URL (YouTube, Hudl, etc.)" value={newLink.url}
              onChange={(e) => setNewLink((l) => ({ ...l, url: e.target.value }))} sx={{ flex: 2 }} />
            <TextField size="small" label="Label (optional)" value={newLink.label}
              onChange={(e) => setNewLink((l) => ({ ...l, label: e.target.value }))} sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addLink}>Add</Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}
