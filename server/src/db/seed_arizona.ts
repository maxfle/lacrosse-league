import { pool } from './pool';

// Real game data from laxnumbers.com/services/scoreboard/3013/
// game_type: 'p' = playoff, 'l' = league, 'e' = exhibition
const REAL_GAMES = [
  // May 1
  { date: '2026-05-01', homeTeam: 'Brophy Prep', awayTeam: 'Notre Dame Prep', homeScore: 19, awayScore: 3, ot: false },
  // April 28
  { date: '2026-04-28', homeTeam: 'Notre Dame Prep', awayTeam: 'Corona del Sol', homeScore: 10, awayScore: 9, ot: true },
  { date: '2026-04-28', homeTeam: 'Brophy Prep', awayTeam: 'Desert Vista', homeScore: 21, awayScore: 3, ot: false },
  // April 24
  { date: '2026-04-24', homeTeam: 'Brophy Prep', awayTeam: 'Pinnacle', homeScore: 17, awayScore: 0, ot: false },
  { date: '2026-04-24', homeTeam: 'Desert Vista', awayTeam: 'Chandler', homeScore: 13, awayScore: 7, ot: false },
  { date: '2026-04-24', homeTeam: 'Notre Dame Prep', awayTeam: 'Boulder Creek', homeScore: 8, awayScore: 7, ot: true },
  { date: '2026-04-24', homeTeam: 'Higley', awayTeam: 'Corona del Sol', homeScore: 11, awayScore: 13, ot: false },
  // April 21
  { date: '2026-04-21', homeTeam: 'Desert Vista', awayTeam: 'Brophy Prep II', homeScore: 17, awayScore: 6, ot: false },
  { date: '2026-04-21', homeTeam: 'Boulder Creek', awayTeam: 'Arcadia', homeScore: 12, awayScore: 3, ot: false },
  { date: '2026-04-21', homeTeam: 'Pinnacle', awayTeam: 'Oro Valley', homeScore: 13, awayScore: 8, ot: false },
  { date: '2026-04-21', homeTeam: 'Higley', awayTeam: 'Scottsdale', homeScore: 16, awayScore: 3, ot: false },
  // April 17
  { date: '2026-04-17', homeTeam: 'Oro Valley', awayTeam: 'Brophy Prep', homeScore: 4, awayScore: 17, ot: false },
  { date: '2026-04-17', homeTeam: 'Boulder Creek', awayTeam: 'Corona del Sol', homeScore: 9, awayScore: 7, ot: false },
];

// All unique team names from real data
const ALL_TEAM_NAMES = [
  'Brophy Prep', 'Notre Dame Prep', 'Corona del Sol', 'Boulder Creek',
  'Desert Vista', 'Pinnacle', 'Chandler', 'Higley', 'Oro Valley',
  'Arcadia', 'Scottsdale', 'Brophy Prep II', 'Catalina Foothills',
  'Cactus', 'Cactus Shadows',
];

const daysFromNow = (d: number, hour = 19) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hour, 0, 0, 0);
  return dt;
};

const UPCOMING_GAMES = [
  { homeTeam: 'Brophy Prep',     awayTeam: 'Corona del Sol',   days: 3 },
  { homeTeam: 'Notre Dame Prep', awayTeam: 'Desert Vista',      days: 5 },
  { homeTeam: 'Chandler',        awayTeam: 'Pinnacle',          days: 6 },
  { homeTeam: 'Boulder Creek',   awayTeam: 'Higley',            days: 8 },
  { homeTeam: 'Oro Valley',      awayTeam: 'Scottsdale',        days: 8 },
  { homeTeam: 'Corona del Sol',  awayTeam: 'Notre Dame Prep',   days: 10 },
  { homeTeam: 'Desert Vista',    awayTeam: 'Brophy Prep',       days: 12 },
  { homeTeam: 'Pinnacle',        awayTeam: 'Boulder Creek',     days: 13 },
  { homeTeam: 'Higley',          awayTeam: 'Chandler',          days: 14 },
  { homeTeam: 'Arcadia',         awayTeam: 'Oro Valley',        days: 15 },
  { homeTeam: 'Scottsdale',      awayTeam: 'Arcadia',           days: 16 },
  { homeTeam: 'Brophy Prep',     awayTeam: 'Boulder Creek',     days: 19 },
  { homeTeam: 'Notre Dame Prep', awayTeam: 'Chandler',          days: 20 },
  { homeTeam: 'Desert Vista',    awayTeam: 'Pinnacle',          days: 21 },
  { homeTeam: 'Corona del Sol',  awayTeam: 'Higley',            days: 22 },
];

async function seedArizona() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing Arizona data
    const existingLeague = await client.query(`SELECT id FROM leagues WHERE name = 'Arizona Lacrosse League'`);
    if (existingLeague.rows.length > 0) {
      const leagueId = existingLeague.rows[0].id;
      await client.query(`
        DELETE FROM game_periods WHERE game_id IN (
          SELECT g.id FROM games g
          JOIN teams ht ON ht.id = g.home_team_id
          JOIN programs p ON p.id = ht.program_id
          WHERE p.league_id = $1
        )`, [leagueId]);
      await client.query(`
        DELETE FROM games WHERE home_team_id IN (
          SELECT t.id FROM teams t JOIN programs p ON p.id = t.program_id WHERE p.league_id = $1
        ) OR away_team_id IN (
          SELECT t.id FROM teams t JOIN programs p ON p.id = t.program_id WHERE p.league_id = $1
        )`, [leagueId]);
      await client.query(`DELETE FROM teams WHERE program_id IN (SELECT id FROM programs WHERE league_id = $1)`, [leagueId]);
      await client.query(`DELETE FROM programs WHERE league_id = $1`, [leagueId]);
      await client.query(`DELETE FROM conferences WHERE league_id = $1`, [leagueId]);
      await client.query(`DELETE FROM leagues WHERE id = $1`, [leagueId]);
    }

    // Create league & conference
    const leagueId = (await client.query(
      `INSERT INTO leagues (name, sport, state) VALUES ('Arizona Lacrosse League', 'boys_lacrosse', 'AZ') RETURNING id`
    )).rows[0].id;

    const conferenceId = (await client.query(
      `INSERT INTO conferences (league_id, name, level, display_order) VALUES ($1, 'Upper Conference', 'varsity', 1) RETURNING id`,
      [leagueId]
    )).rows[0].id;

    const seasonYear = 2026;

    // Create all programs & teams
    const teamMap = new Map<string, string>();
    for (const name of ALL_TEAM_NAMES) {
      const progId = (await client.query(
        `INSERT INTO programs (league_id, school_name, city, state) VALUES ($1, $2, 'Phoenix', 'AZ') RETURNING id`,
        [leagueId, name]
      )).rows[0].id;
      const teamId = (await client.query(
        `INSERT INTO teams (program_id, conference_id, season_year) VALUES ($1, $2, $3) RETURNING id`,
        [progId, conferenceId, seasonYear]
      )).rows[0].id;
      teamMap.set(name, teamId);
    }

    const splitScore = (total: number, periods: number) => {
      const q = new Array(periods).fill(0);
      for (let s = 0; s < total; s++) q[Math.floor(Math.random() * periods)]++;
      return q;
    };

    // Seed real completed games
    for (const g of REAL_GAMES) {
      const homeId = teamMap.get(g.homeTeam);
      const awayId = teamMap.get(g.awayTeam);
      if (!homeId || !awayId) { console.warn(`Skipping: ${g.homeTeam} vs ${g.awayTeam}`); continue; }

      const gameDate = new Date(g.date + 'T19:00:00');
      const periods = g.ot ? 5 : 4;

      const gameId = (await client.query(
        `INSERT INTO games (home_team_id, away_team_id, game_date, game_type, is_conference, is_in_state, status)
         VALUES ($1, $2, $3, 'regular_season', true, true, 'completed') RETURNING id`,
        [homeId, awayId, gameDate]
      )).rows[0].id;

      const homeQ = splitScore(g.homeScore, periods);
      const awayQ = splitScore(g.awayScore, periods);
      for (let p = 0; p < periods; p++) {
        await client.query(
          `INSERT INTO game_periods (game_id, period_number, home_score, away_score) VALUES ($1,$2,$3,$4)`,
          [gameId, p + 1, homeQ[p], awayQ[p]]
        );
      }
    }

    // Seed upcoming games
    for (const g of UPCOMING_GAMES) {
      const homeId = teamMap.get(g.homeTeam);
      const awayId = teamMap.get(g.awayTeam);
      if (!homeId || !awayId) continue;
      await client.query(
        `INSERT INTO games (home_team_id, away_team_id, game_date, game_type, is_conference, is_in_state, status)
         VALUES ($1, $2, $3, 'regular_season', true, true, 'scheduled')`,
        [homeId, awayId, daysFromNow(g.days)]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded: ${REAL_GAMES.length} real completed games, ${UPCOMING_GAMES.length} upcoming games, ${ALL_TEAM_NAMES.length} teams.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedArizona();
