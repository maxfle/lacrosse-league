import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import RecruitingPeriodBanner from './RecruitingPeriodBanner';

export default function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <RecruitingPeriodBanner />
      <Navbar />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Box
        component="footer"
        sx={{ py: 3, px: 2, textAlign: 'center', bgcolor: 'primary.dark', color: 'white', fontSize: 14 }}
      >
        © {new Date().getFullYear()} County Lacrosse League. All rights reserved.
      </Box>
    </Box>
  );
}
