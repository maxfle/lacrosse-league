# Lacrosse Stats Website — Full Project Specification

## Tech Stack
- **Frontend:** React, Material UI, TypeScript
- **Backend:** Node.js, TypeScript, REST API
- **Database:** PostgreSQL
- **Hosting:** Railway
- **Auth:** Email/password + Google OAuth

---

## Scope

### V1 Launch
- Public front page
- Team & player profile pages
- Standings
- Coach dashboard (roster, schedule, stat entry)
- Admin approval flows
- User authentication
- Player recruitment profiles

### Post-Launch
- Multi-league & tournament support
- Girls lacrosse structure
- Additional social logins (beyond Google)
- Article submission/approval workflow

---

## Sport Scope
- **Lacrosse only** — boys and girls
- Boys and girls use the same base stat model with sport-type-aware differences:
  - Boys: faceoffs (won/lost/attempted)
  - Girls: draw controls
- **V1 launches with boys lacrosse only** (girls structure TBD, added by admin later)

---

## League Structure
- **Hierarchy:** League → Conference → Program (school) → Team → Roster
- **Boys conferences:** Upper (varsity), Lower (varsity), JV (unified, all programs)
- A program can have a varsity team, JV team, or both
- Players have a single account and can be linked to multiple rosters. Their account should persist through the years and shouldn't need to be re-created. After their 12th grade season they shouldn't be on the roster anymore, but assume they are on the roster for the following season. 
- When creating the .csv roster template, pre-fill out the players that should still be on the roster from last year.

---

## User Roles & Permissions

| Role | Capabilities |
|---|---|
| Super Admin | Everything — promotes users to Admin, manages leagues |
| Admin | Approves coach accounts & teams, publishes articles, manages recruiting period banner |
| Coach | Manages their team's roster, schedule, and stats; approves player profile visibility; submits articles for review |
| Player | Creates and manages their own recruitment profile |

### Authentication
- Email/password + Google OAuth
- Email verification required
- Forgot password flow
- Players are invited via auto-email when a coach adds them to a roster (must sign up with the coach-provided email)

---

## Public Front Page

### Score Tickers
- Two stacked rows: **Recent Results** (top) and **Upcoming Games** (bottom)
- Left/right arrow navigation — no auto-scroll
- Conference dropdown on each ticker independently: Upper (default), Lower, JV
- Recent Results: last 7 days — shows final score, clickable to game detail page
- Upcoming Games: next 7 days — shows date/time and opponent, clickable to team page

### Article Slider
- Below the tickers
- Admin-published articles with title, body, image, and publish date
- Rich text editor (TipTap or Quill)
- **V1 launches with one dummy article** introducing the website
- Coach article submission (pending admin approval) is a post-launch feature

### Rankings Section
- Linked banner/widget to laxnumbers.com
- No scraping or competing rankings system

### NCAA Recruiting Period Banner
- Admin-set field: period type (Dead / No Contact / Contact / Evaluation) + start/end date
- Displayed site-wide
- Includes static link to NCAA.org for full rulebook

---

## Game Detail Page
- Final score + score by quarter
- Unlimited overtime periods displayed
- Team stat totals
- Scoring summary: quarter → scorer → assist (no timestamps)
- Per-player box score (public stats only)
- Head-to-head history strip between the two teams

---

## Stats Model

### Public Player Stats (per game + season totals + career totals)
| Stat | Boys | Girls |
|---|---|---|
| Goals | ✅ | ✅ |
| Assists | ✅ | ✅ |
| Shots on cage | ✅ | ✅ |
| Shots off cage | ✅ | ✅ |
| Ground balls | ✅ | ✅ |
| Caused turnovers | ✅ | ✅ |
| Saves | ✅ (goalies) | ✅ (goalies) |
| Man-up goals | ✅ | ✅ |
| Man-down goals | ✅ | ✅ |
| Clears attempted | ✅ | ✅ |
| Clears successful | ✅ | ✅ |
| Faceoffs won/lost/attempted | ✅ | ❌ |
| Draw controls | ❌ | ✅ |

### Coach-Only Stats (never shown publicly)
- Unforced turnovers (per player)
- Penalties (player, infraction type, quarter)

### In-State vs. Out-of-State Split
- All stat pages show split totals: in-state games vs. all games

---

## Game Data Fields
- Date
- Opponent
- Home/Away
- Field name + address
- Game type: Regular Season / Playoff / Tournament / Scrimmage
- Conference vs. Non-conference flag
- In-state vs. Out-of-state flag
- Score by quarter + unlimited overtime periods

---

## Team Hub Page
Tabbed layout with icon + text tabs:

1. **Schedule/Results** (default tab)
   - Full season schedule
   - Upcoming games + past results
   - "Box Score" button on each completed game
2. **Roster** — player list with links to profiles
3. **Stats** — season stat leaders and team totals
4. **History** — previous seasons via dropdown

### Sidebar Widgets (visible on all tabs)
- League standings (highlighting current team)
- Team stat leaders (top 3–5 players in key categories)

---

## Player Profile Page
- Career stats summary (top)
- Current season game log
- Previous seasons via dropdown
- **Recruitment profile button** — visible only if coach has enabled it; otherwise hidden or shows "access required"

---

## Standings
- Conference record only (no overall record on standings page, but team hub shows both)
- Win/loss, sorted by win percentage
- No tiebreaker logic in v1 — tiebreaker rules are admin-configurable (post-launch)
- JV standings displayed separately, sorted by win percentage, labeled unofficial

---

## Coach Dashboard

### Roster Management
- Download CSV template
- Upload filled CSV to create/update roster
- Edit individual players after import
- Player fields: name, jersey number, position, grade, email address
- Coach-provided email triggers auto-invite to player

### Schedule Management
- Add/edit games with all game data fields
- Mark games as completed to unlock stat entry

### Stat Entry
- Spreadsheet-style grid: rows = players, columns = stat categories
- Tab-navigable between cells
- Save entire game at once
- Mobile-friendly
- Includes both public and coach-only stats (coach-only columns clearly labeled)

---

## Recruitment Profiles

### Player-Managed Fields
- GPA
- Possible majors
- Travel club(s)
- Awards
- Commitment status / offer received
- Extracurricular activities
- Highlight film links (YouTube, Hudl, etc. — URL fields only)
- Contact info

### Visibility Rules
- Private by default
- Coach can make public at player's request
- Contact info never exposed directly — all outreach routes through the coach
- NCAA recruiting period banner informs college coaches of current contact rules

---

## Admin Dashboard

### Approval Queues
- Pending coach account approvals
- Pending team approvals
- (Post-launch: pending article approvals)

### Controls
- NCAA recruiting period banner (type + dates)
- League/conference structure management
- Promote users to Admin role
- Publish articles

---

## Email Notifications

| Trigger | Recipient |
|---|---|
| Coach added player to roster | Player (invitation email) |
| New coach account pending approval | Admin |
| Coach account approved/rejected | Coach |
| Player requests profile made public | Coach |
| Player profile visibility changed | Player |
| (Post-launch) Article submitted for review | Admin |
| (Post-launch) Article approved/rejected | Coach |

---

## Data Model — Key Entities (high level)

- `users` (id, email, role, google_id, verified)
- `leagues` (id, name, sport)
- `conferences` (id, league_id, name, level: varsity/jv)
- `programs` (id, league_id, school_name)
- `teams` (id, program_id, conference_id, season_year)
- `players` (id, user_id, program_id, name, number, position, grade, email)
- `roster_entries` (id, team_id, player_id)
- `games` (id, home_team_id, away_team_id, date, location, game_type, is_conference, is_in_state, status)
- `game_periods` (id, game_id, period_number, home_score, away_score)
- `player_game_stats` (id, game_id, player_id, ...stat columns)
- `player_game_stats_private` (id, game_id, player_id, unforced_turnovers, ...penalty columns)
- `penalties` (id, game_id, player_id, infraction_type, quarter)
- `recruitment_profiles` (id, player_id, is_public, gpa, majors, clubs, awards, commitment_status, extracurriculars, contact_info)
- `highlight_links` (id, recruitment_profile_id, url, label)
- `articles` (id, author_id, title, body, image_url, published_at, status)
- `recruiting_period` (id, period_type, start_date, end_date)
- `tiebreaker_rules` (id, conference_id, rule_order, rule_type) ← placeholder for post-launch

---

## Post-Launch Roadmap
1. Multi-league & tournament support (multi-tenancy)
2. Girls lacrosse conference structure
3. Article submission/approval workflow for coaches
4. Additional social logins
5. Admin-configurable tiebreaker rules
6. In-app notification system
