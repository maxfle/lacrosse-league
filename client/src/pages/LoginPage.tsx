import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container, Box, Card, CardContent, Typography, TextField,
  Button, Divider, Alert, CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>Log in</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField label="Email" type="email" fullWidth required sx={{ mb: 2 }}
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" fullWidth required sx={{ mb: 1 }}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <Box textAlign="right" mb={2}>
              <RouterLink to="/forgot-password" style={{ fontSize: 13 }}>Forgot password?</RouterLink>
            </Box>
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mb: 2 }}>
              {loading ? <CircularProgress size={20} /> : 'Log in'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Button
            variant="outlined" fullWidth startIcon={<GoogleIcon />}
            href="/api/auth/google"
            sx={{ mb: 2 }}
          >
            Continue with Google
          </Button>

          <Typography variant="body2" textAlign="center">
            Don't have an account? <RouterLink to="/signup">Sign up</RouterLink>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
