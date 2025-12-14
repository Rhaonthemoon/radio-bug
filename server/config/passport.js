const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * Configurazione Passport con Google OAuth2
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Cerca se l'utente esiste già con questo Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Se non esiste, cerca per email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Utente esiste con email ma senza Google ID - collega l'account
          user.googleId = profile.id;
          user.avatar = profile.photos[0]?.value;
          await user.save();
        } else {
          // Crea nuovo utente
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            artistName: profile.displayName,
            avatar: profile.photos[0]?.value,
            role: 'artist',
            authProvider: 'google'
          });
          await user.save();
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serializzazione utente (non necessaria per API JWT, ma richiesta da Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
