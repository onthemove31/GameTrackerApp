const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize the PostgreSQL client
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

client.connect();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000/',
  apiKey: process.env.STEAM_API_KEY
}, async (identifier, profile, done) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE steam_id = $1', [profile.id]);
    if (result.rows.length === 0) {
      const insertResult = await client.query(
        'INSERT INTO users (steam_id, display_name) VALUES ($1, $2) RETURNING *',
        [profile.id, profile.displayName]
      );
      return done(null, insertResult.rows[0]);
    }
    return done(null, result.rows[0]);
  } catch (err) {
    return done(err, null);
  }
}));

passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/microsoft/callback',
  scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE microsoft_id = $1', [profile.id]);
    if (result.rows.length === 0) {
      const insertResult = await client.query(
        'INSERT INTO users (microsoft_id, display_name) VALUES ($1, $2) RETURNING *',
        [profile.id, profile.displayName]
      );
      return done(null, insertResult.rows[0]);
    }
    return done(null, result.rows[0]);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;