import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Container, Box, Card, CardContent, Typography, TextField,
  Button, Divider, Alert, CircularProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import api from '../api/axios';

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/signup', { firstName, lastName, email, password, role });
      setSuccess('Account created! Please check your email to verify your account.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Alert severity="success">{success}</Alert>
        <Button fullWidth sx={{ mt: 2 }} component={RouterLink} to="/login">Go to login</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>Create account</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>I am a:</Typography>
            <ToggleButtonGroup value={role} exclusive onChange={(_, v) => v && setRole(v)} size="small" fullWidth>
              <ToggleButton value="player">Player</ToggleButton>
              <ToggleButton value="coach">Coach</ToggleButton>
            </ToggleButtonGroup>
            {role === 'coach' && (
              <Typography variant="caption" color="text.secondary">
                Coach accounts require admin approval before you can access the dashboard.
              </Typography>
            )}
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField label="First name" fullWidth required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <TextField label="Last name" fullWidth required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Box>
            <TextField label="Email" type="email" fullWidth required sx={{ mb: 2 }}
              value={email} onChange={(e) => setEmail(e.target.value)}
              helperText={role === 'player' ? 'Must match the email your coach registered for you.' : ''} />
            <TextField label="Password" type="password" fullWidth required sx={{ mb: 2 }}
              value={password} onChange={(e) => setPassword(e.target.value)}
              inputProps={{ minLength: 8 }} helperText="Minimum 8 characters" />
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Create account'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} href="/api/auth/google" sx={{ mb: 2 }}>
            Continue with Google
          </Button>

          <Typography variant="body2" textAlign="center">
            Already have an account? <RouterLink to="/login">Log in</RouterLink>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
