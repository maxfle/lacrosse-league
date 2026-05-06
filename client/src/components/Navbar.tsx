import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton,
  Menu, MenuItem, Avatar, Divider,
} from '@mui/material';
import SportsIcon from '@mui/icons-material/Sports';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setAnchorEl(null);
  };

  const dashboardPath = ['admin', 'super_admin'].includes(user?.role || '') ? '/admin' : '/dashboard';

  return (
    <AppBar position="sticky" color="primary" elevation={2}>
      <Toolbar>
        <SportsIcon sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
        >
          County Lacrosse League
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button color="inherit" component={RouterLink} to="/standings">Standings</Button>

          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to={dashboardPath}>Dashboard</Button>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                  {user.firstName[0]}{user.lastName[0]}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem disabled sx={{ fontSize: 13 }}>{user.firstName} {user.lastName}</MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Log out</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">Log in</Button>
              <Button variant="outlined" color="inherit" component={RouterLink} to="/signup" sx={{ ml: 1 }}>
                Sign up
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
