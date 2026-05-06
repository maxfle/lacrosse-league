import { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  CardMedia, CardActionArea, Select, MenuItem, FormControl,
  InputLabel, IconButton, Chip, Skeleton, Divider, Paper,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';


interface GameCard {
  id: string;
  game_date: string;
  home_team_name: string;
  home_team_id: string;
  away_team_name: string;
  away_team_id: string;
  home_total?: number;
  away_total?: number;
  field_name?: string;
}

interface Article {
  id: string;
  title: string;
  image_url: string | null;
  published_at: string;
  author_name: string;
}

const TICKER_PAGE_SIZE = 5;

function ScoreTicker({
  title,
  games,
  loading,
  type,
  selectedLevel,
  onLevelChange,
}: {
  title: string;
  games: GameCard[];
  loading: boolean;
  type: 'recent' | 'upcoming';
  selectedLevel: string;
  onLevelChange: (level: string) => void;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const pages = Math.ceil(games.length / TICKER_PAGE_SIZE);
  const visible = games.slice(page * TICKER_PAGE_SIZE, (page + 1) * TICKER_PAGE_SIZE);

  const handleClick = (game: GameCard) => {
    if (type === 'recent') navigate(`/games/${game.id}`);
    else navigate(`/teams/${game.home_team_id}`);
  };

  return (
    <Box>
      <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ lineHeight: 1, display: 'block', mb: 0.5 }}>
        {title}
      </Typography>
      <Paper elevation={1} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 2 }}>
        {/* Left: level dropdown */}
        <FormControl size="small" sx={{ width: 140, flexShrink: 0 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={selectedLevel}
            label="Level"
            onChange={(e) => { onLevelChange(e.target.value); setPage(0); }}
          >
            <MenuItem value="varsity">Varsity</MenuItem>
            <MenuItem value="jv">Junior Varsity</MenuItem>
          </Select>
        </FormControl>

        {/* Prev arrow */}
        <IconButton size="small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} sx={{ color: 'text.primary', flexShrink: 0 }}>
          <ChevronLeftIcon />
        </IconButton>

        {/* Cards */}
        <Box sx={{ flex: 1, display: 'flex', gap: 1.5, overflow: 'hidden', minWidth: 0 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" width={190} height={80} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
              ))
            : visible.length === 0
            ? <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No games to display</Typography>
            : visible.map((game) => (
                <Card
                  key={game.id}
                  variant="outlined"
                  sx={{
                    minWidth: 180, maxWidth: 205, flexShrink: 0, cursor: 'pointer',
                    bgcolor: 'white', border: '1px solid', borderColor: 'grey.500',
                    '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                  }}
                  onClick={() => handleClick(game)}
                >
                  <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                    {type === 'recent' ? (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 120, color: 'text.primary' }}>{game.home_team_name}</Typography>
                          <Typography variant="body2" fontWeight={700} color="text.primary">{game.home_total}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 120, color: 'text.primary' }}>{game.away_team_name}</Typography>
                          <Typography variant="body2" fontWeight={700} color="text.primary">{game.away_total}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(game.game_date).toLocaleDateString()}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" noWrap fontWeight={600} color="text.primary">{game.home_team_name}</Typography>
                        <Typography variant="caption" color="text.secondary">vs</Typography>
                        <Typography variant="body2" noWrap fontWeight={600} color="text.primary">{game.away_team_name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                          {new Date(game.game_date).toLocaleDateString()} {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
        </Box>

        {/* Next arrow */}
        <IconButton size="small" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} sx={{ color: 'text.primary', flexShrink: 0 }}>
          <ChevronRightIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}

interface LaxRankingRow {
  ranking: number;
  name: string;
  wins: number;
  losses: number;
  rating: number;
  logo_large_url?: string;
}

function ArizonaRankingsWidget() {
  const [rows, setRows] = useState<LaxRankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/proxy/laxnumbers/ratings?y=2026&v=3013')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const ranked = [...rows].sort((a, b) => a.ranking - b.ranking);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEventsIcon color="warning" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>AZ Rankings</Typography>
        <Chip
          icon={<OpenInNewIcon sx={{ fontSize: '0.75rem !important' }} />}
          label="laxnumbers.com"
          component="a"
          href="https://laxnumbers.com/ratings.php?y=2026&v=3013"
          target="_blank"
          rel="noopener noreferrer"
          clickable
          size="small"
          variant="outlined"
          sx={{ ml: 'auto', fontSize: '0.7rem' }}
        />
      </Box>
      <Divider />
      <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={36} sx={{ mx: 2 }} />
          ))
        ) : ranked.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No data</Typography>
        ) : (
          ranked.map((row, i) => (
            <Box key={row.ranking}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.75, gap: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.ranking}
                </Typography>
                {row.logo_large_url && (
                  <Box component="img" src={row.logo_large_url} alt="" sx={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                )}
                <Typography variant="body2" sx={{ flex: 1, fontWeight: i < 3 ? 700 : 400 }} noWrap>
                  {row.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.wins}–{row.losses}
                </Typography>
              </Box>
              {i < ranked.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Box>
    </Card>
  );
}

export default function HomePage() {
  const [recentLevel, setRecentLevel] = useState('varsity');
  const [upcomingLevel, setUpcomingLevel] = useState('varsity');
  const [recentGames, setRecentGames] = useState<GameCard[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<GameCard[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlePage, setArticlePage] = useState(0);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/articles').then((r) => setArticles(r.data));
  }, []);

  useEffect(() => {
    setLoadingRecent(true);
    api.get(`/games/recent?level=${recentLevel}`)
      .then((r) => setRecentGames(r.data))
      .finally(() => setLoadingRecent(false));
  }, [recentLevel]);

  useEffect(() => {
    setLoadingUpcoming(true);
    api.get(`/games/upcoming?level=${upcomingLevel}`)
      .then((r) => setUpcomingGames(r.data))
      .finally(() => setLoadingUpcoming(false));
  }, [upcomingLevel]);

  const ARTICLES_PER_PAGE = 4;
  const articlePages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const visibleArticles = articles.slice(articlePage * ARTICLES_PER_PAGE, (articlePage + 1) * ARTICLES_PER_PAGE);

  return (
    <Box>
      {/* Score Tickers */}
      <Box sx={{ bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'grey.300', py: 1.5 }}>
        <Container maxWidth="lg">
          <ScoreTicker
            title="Recent Results"
            games={recentGames}
            loading={loadingRecent}
            type="recent"
            selectedLevel={recentLevel}
            onLevelChange={setRecentLevel}
          />
          <Divider sx={{ my: 1.5 }} />
          <ScoreTicker
            title="Upcoming Games"
            games={upcomingGames}
            loading={loadingUpcoming}
            type="upcoming"
            selectedLevel={upcomingLevel}
            onLevelChange={setUpcomingLevel}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* News & Rankings Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Article Slider — 8/12 */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" fontWeight={700}>News & Updates</Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={() => setArticlePage((p) => Math.max(0, p - 1))} disabled={articlePage === 0}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="caption" color="text.secondary">{articlePage + 1}/{Math.max(1, articlePages)}</Typography>
                <IconButton size="small" onClick={() => setArticlePage((p) => Math.min(articlePages - 1, p + 1))} disabled={articlePage >= articlePages - 1}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
              <Grid container spacing={2}>
                {visibleArticles.map((article) => (
                  <Grid item xs={12} sm={6} key={article.id}>
                    <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate(`/articles/${article.id}`)}>
                      <CardActionArea>
                        {article.image_url && (
                          <CardMedia component="img" height="140" image={article.image_url} alt={article.title} />
                        )}
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            {article.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {article.author_name} · {new Date(article.published_at).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Rankings Widget — 4/12 */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={700} mb={2}>AZ Rankings</Typography>
            <ArizonaRankingsWidget />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
