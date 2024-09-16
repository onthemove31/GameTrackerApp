const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const app = express();
app.set('view engine', 'ejs');

// Configure session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure Passport for Steam
passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000/',
  apiKey: process.env.STEAM_API_KEY
}, function(identifier, profile, done) {
  profile.identifier = identifier;
  return done(null, profile);
}));

// Configure Passport for Microsoft (Xbox)
passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/microsoft/callback',
  scope: ['user.read']
}, function(accessToken, refreshToken, profile, done) {
  return done(null, profile);
}));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Routes
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/profile', ensureAuthenticated, (req, res) => {
  res.render('profile', { user: req.user });
});

app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/profile');
});

app.get('/auth/microsoft', passport.authenticate('microsoft'));

app.get('/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/profile');
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});