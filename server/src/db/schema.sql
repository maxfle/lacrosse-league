-- ============================================================
-- LACROSSE LEAGUE WEBSITE — DATABASE SCHEMA
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'coach', 'player');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  role user_role NOT NULL DEFAULT 'player',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false, -- coaches require admin approval
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAGUE STRUCTURE
-- ============================================================

CREATE TYPE sport_type AS ENUM ('boys_lacrosse', 'girls_lacrosse');
CREATE TYPE conference_level AS ENUM ('varsity', 'jv');

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sport sport_type NOT NULL DEFAULT 'boys_lacrosse',
  state VARCHAR(2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level conference_level NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A "team" is a program's entry in a specific conference for a specific season year
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, conference_id, season_year)
);

-- Coaches are linked to programs (not teams, so they persist across seasons)
CREATE TABLE program_coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_head_coach BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, user_id)
);

-- ============================================================
-- PLAYERS & ROSTERS
-- ============================================================

CREATE TYPE player_position AS ENUM (
  'attack', 'midfield', 'defense', 'goalie', 'faceoff_specialist', 'lsm'
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null until player claims profile
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  jersey_number VARCHAR(4) NOT NULL,
  position player_position NOT NULL,
  grad_year INT NOT NULL, -- e.g. 2026 means graduating 2026 (12th grade)
  invite_email VARCHAR(255) NOT NULL,
  invite_sent_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A player appears on a team's roster for a given season
CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, player_id, season_year)
);

-- ============================================================
-- GAMES
-- ============================================================

CREATE TYPE game_type AS ENUM ('regular_season', 'playoff', 'tournament', 'scrimmage');
CREATE TYPE game_status AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_date TIMESTAMPTZ NOT NULL,
  game_type game_type NOT NULL DEFAULT 'regular_season',
  is_conference BOOLEAN NOT NULL DEFAULT true,
  is_in_state BOOLEAN NOT NULL DEFAULT true,
  field_name VARCHAR(255),
  field_address VARCHAR(500),
  status game_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Score by period (quarters = 1-4, overtime = 5, 6, 7, ...)
CREATE TABLE game_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  period_number INT NOT NULL, -- 1=Q1, 2=Q2, 3=Q3, 4=Q4, 5+=OT
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  UNIQUE(game_id, period_number)
);

-- ============================================================
-- PLAYER GAME STATS (PUBLIC)
-- ============================================================

CREATE TABLE player_game_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- Scoring
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  -- Shooting
  shots_on_cage INT NOT NULL DEFAULT 0,
  shots_off_cage INT NOT NULL DEFAULT 0,
  -- Possession
  ground_balls INT NOT NULL DEFAULT 0,
  caused_turnovers INT NOT NULL DEFAULT 0,
  -- Goalie
  saves INT NOT NULL DEFAULT 0,
  goals_allowed INT NOT NULL DEFAULT 0,
  -- Special teams
  man_up_goals INT NOT NULL DEFAULT 0,
  man_down_goals INT NOT NULL DEFAULT 0,
  -- Clears
  clears_attempted INT NOT NULL DEFAULT 0,
  clears_successful INT NOT NULL DEFAULT 0,
  -- Boys only
  faceoffs_won INT NOT NULL DEFAULT 0,
  faceoffs_lost INT NOT NULL DEFAULT 0,
  faceoffs_attempted INT NOT NULL DEFAULT 0,
  -- Girls only
  draw_controls INT NOT NULL DEFAULT 0,
  UNIQUE(game_id, player_id)
);

-- ============================================================
-- PLAYER GAME STATS (COACH-ONLY, NEVER PUBLIC)
-- ============================================================

CREATE TABLE player_game_stats_private (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  unforced_turnovers INT NOT NULL DEFAULT 0,
  UNIQUE(game_id, player_id)
);

CREATE TYPE penalty_type AS ENUM (
  'slash', 'cross_check', 'illegal_body_check', 'unsportsmanlike',
  'crease_violation', 'pushing', 'holding', 'illegal_procedure', 'other'
);

CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  infraction_type penalty_type NOT NULL,
  quarter INT NOT NULL CHECK (quarter >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scoring summary (for game detail page chronological goal log)
CREATE TABLE scoring_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assist_id UUID REFERENCES players(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quarter INT NOT NULL CHECK (quarter >= 1),
  is_man_up BOOLEAN NOT NULL DEFAULT false,
  is_man_down BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ARTICLES
-- ============================================================

CREATE TYPE article_status AS ENUM ('draft', 'pending_review', 'published', 'rejected');

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  image_url VARCHAR(1000),
  status article_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECRUITING PERIOD BANNER
-- ============================================================

CREATE TYPE recruiting_period_type AS ENUM ('dead', 'no_contact', 'contact', 'evaluation');

CREATE TABLE recruiting_period (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_type recruiting_period_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sport sport_type NOT NULL DEFAULT 'boys_lacrosse',
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECRUITMENT PROFILES
-- ============================================================

CREATE TYPE commitment_status AS ENUM ('uncommitted', 'has_offer', 'committed', 'signed');

CREATE TABLE recruitment_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  gpa DECIMAL(3,2),
  possible_majors TEXT, -- comma-separated or JSON array
  travel_clubs TEXT,
  awards TEXT,
  commitment_status commitment_status NOT NULL DEFAULT 'uncommitted',
  committed_to VARCHAR(255), -- school name if committed
  extracurriculars TEXT,
  -- Contact info (only visible to coaches with permission)
  phone VARCHAR(20),
  parent_name VARCHAR(255),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE highlight_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruitment_profile_id UUID NOT NULL REFERENCES recruitment_profiles(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIEBREAKER RULES (placeholder for post-launch)
-- ============================================================

CREATE TABLE tiebreaker_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  rule_order INT NOT NULL,
  rule_type VARCHAR(100) NOT NULL, -- e.g. 'head_to_head', 'goal_differential', 'goals_against'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conference_id, rule_order)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX idx_player_game_stats_player ON player_game_stats(player_id);
CREATE INDEX idx_roster_entries_team ON roster_entries(team_id);
CREATE INDEX idx_roster_entries_player ON roster_entries(player_id);
CREATE INDEX idx_players_program ON players(program_id);
CREATE INDEX idx_teams_program ON teams(program_id);
CREATE INDEX idx_teams_conference ON teams(conference_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_scoring_events_game ON scoring_events(game_id);
