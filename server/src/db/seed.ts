import bcrypt from 'bcryptjs';
import { pool } from './pool';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Super admin
    const passwordHash = await bcrypt.hash('changeme123', 12);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_approved)
       VALUES ('admin@lacrosseleague.com', $1, 'League', 'Admin', 'super_admin', true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash=$1
       RETURNING id`,
      [passwordHash]
    );
    const adminId = adminResult.rows[0].id;

    // League
    const leagueResult = await client.query(
      `INSERT INTO leagues (name, sport, state)
       VALUES ('County Lacrosse League', 'boys_lacrosse', 'MD')
       ON CONFLICT DO NOTHING
       RETURNING id`
    );
    let leagueId = leagueResult.rows[0]?.id;
    if (!leagueId) {
      const r = await client.query(`SELECT id FROM leagues WHERE name = 'County Lacrosse League'`);
      leagueId = r.rows[0].id;
    }

    // Conferences
    await client.query(
      `INSERT INTO conferences (league_id, name, level, display_order) VALUES
       ($1, 'Upper Conference', 'varsity', 1),
       ($1, 'Lower Conference', 'varsity', 2),
       ($1, 'JV Conference', 'jv', 3)
       ON CONFLICT DO NOTHING`,
      [leagueId]
    );

    // Dummy articles
    const articles = [
      {
        title: 'Welcome to the County Lacrosse League Website!',
        body: `<p>We're excited to launch the official home for County Lacrosse League statistics, scores, and news.</p>
<p>This site is your one-stop destination for:</p>
<ul>
  <li><strong>Live scores and results</strong> — check the score ticker at the top of the page for the latest game results and upcoming matchups across all conferences.</li>
  <li><strong>Team & player stats</strong> — full box scores, season statistics, and career totals for every player in the league.</li>
  <li><strong>Standings</strong> — up-to-date conference standings updated after every game.</li>
  <li><strong>Recruitment profiles</strong> — players looking to play at the next level can create a recruitment profile to share their stats, highlight film, and contact information with college coaches.</li>
</ul>
<p>Coaches can log in to their dashboard to manage rosters, input schedules, and enter game statistics. If you're a coach and don't have an account yet, sign up and your request will be reviewed by the league office.</p>
<p>We'll be adding more features throughout the season. Stay tuned and good luck to all teams!</p>`,
      },
      {
        title: '2026 Season Preview: Teams to Watch',
        body: `<p>The 2026 lacrosse season is shaping up to be one of the most competitive in recent memory. Here's a look at some of the programs expected to make noise this spring.</p>
<p><strong>Upper Conference Contenders</strong></p>
<p>The returning champions enter the season with a loaded roster and three returning all-conference attackmen. They'll face a stiff challenge from a program that finished runner-up last year and added several key transfers during the offseason.</p>
<p><strong>One to Watch</strong></p>
<p>Keep an eye on a mid-table program that quietly went 7-3 down the stretch last season. With their senior class now fully healthy and a new coach who ran a top-10 collegiate offense, they could surprise some people.</p>
<p><strong>Schedule Notes</strong></p>
<p>Playoff seeding will be determined by conference win percentage. The top four teams from each conference advance. Check the Standings page throughout the season for live bracket implications.</p>`,
      },
      {
        title: 'How to Use Recruitment Profiles',
        body: `<p>If you're a high school lacrosse player with aspirations to play at the college level, your recruitment profile on this site can be a valuable tool to get in front of coaches.</p>
<p><strong>Setting up your profile</strong></p>
<p>Log in to your player account and navigate to your profile page. Toggle the visibility to "Public" and fill out your academic information, GPA, graduation year, and positions played. You can link to highlight film from YouTube or Hudl.</p>
<p><strong>What coaches see</strong></p>
<p>College coaches browsing the recruitment directory can view your season and career statistics pulled directly from league data, alongside any highlights and contact information you've made public.</p>
<p><strong>NCAA Contact Periods</strong></p>
<p>Watch the banner at the top of this site — league admins post updates when NCAA contact periods open and close. During a contact period, coaches may reach out directly. Outside of contact periods, player-initiated contact is still permitted.</p>
<p>Questions? Reach out to the league office via the contact page.</p>`,
      },
    ];

    for (const article of articles) {
      await client.query(
        `INSERT INTO articles (author_id, title, body, status, published_at) VALUES ($1, $2, $3, 'published', NOW())
         ON CONFLICT DO NOTHING`,
        [adminId, article.title, article.body]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
    console.log('Super admin login: admin@lacrosseleague.com / changeme123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
