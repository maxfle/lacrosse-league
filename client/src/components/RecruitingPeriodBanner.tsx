import { useEffect, useState } from 'react';
import { Alert, Link, Box } from '@mui/material';
import api from '../api/axios';

interface RecruitingPeriod {
  period_type: 'dead' | 'no_contact' | 'contact' | 'evaluation';
  start_date: string;
  end_date: string;
}

const PERIOD_LABELS: Record<RecruitingPeriod['period_type'], string> = {
  dead: 'Dead Period',
  no_contact: 'No Contact Period',
  contact: 'Contact Period',
  evaluation: 'Evaluation Period',
};

const PERIOD_COLORS: Record<RecruitingPeriod['period_type'], 'error' | 'warning' | 'success' | 'info'> = {
  dead: 'error',
  no_contact: 'warning',
  contact: 'success',
  evaluation: 'info',
};

export default function RecruitingPeriodBanner() {
  const [period, setPeriod] = useState<RecruitingPeriod | null>(null);

  useEffect(() => {
    api.get('/admin/recruiting-period').then((r) => setPeriod(r.data)).catch(() => {});
  }, []);

  if (!period) return null;

  const today = new Date();
  const start = new Date(period.start_date);
  const end = new Date(period.end_date);
  if (today < start || today > end) return null;

  return (
    <Box>
      <Alert severity={PERIOD_COLORS[period.period_type]} sx={{ borderRadius: 0, py: 0.5 }}>
        <strong>NCAA Recruiting: {PERIOD_LABELS[period.period_type]}</strong>
        {' — '}
        {period.period_type === 'no_contact' || period.period_type === 'dead'
          ? 'College coaches may not contact players directly. Contact their coach instead.'
          : 'College coaches may contact players.'}
        {' '}
        <Link href="https://www.ncaa.org/sports/2014/10/6/recruiting-calendars.aspx" target="_blank" rel="noopener" color="inherit">
          Full NCAA rules →
        </Link>
      </Alert>
    </Box>
  );
}
