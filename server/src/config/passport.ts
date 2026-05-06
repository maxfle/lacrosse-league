import { PassportStatic } from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../db/pool';

export function configurePassport(passport: PassportStatic) {
  // JWT strategy
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET as string,
      },
      async (payload, done) => {
        try {
          const result = await pool.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
          if (result.rows.length === 0) return done(null, false);
          return done(null, result.rows[0]);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), false);

          // Check if user exists by google_id or email
          let result = await pool.query(
            'SELECT * FROM users WHERE google_id = $1 OR email = $2',
            [profile.id, email]
          );

          if (result.rows.length > 0) {
            const user = result.rows[0];
            // Link google_id if signing in via email account
            if (!user.google_id) {
              await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
            }
            return done(null, user);
          }

          // Create new user — role defaults to 'player', requires approval if coach
          const newUser = await pool.query(
            `INSERT INTO users (email, google_id, first_name, last_name, is_verified, role)
             VALUES ($1, $2, $3, $4, true, 'player')
             RETURNING *`,
            [email, profile.id, profile.name?.givenName || '', profile.name?.familyName || '']
          );
          return done(null, newUser.rows[0]);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );
}
