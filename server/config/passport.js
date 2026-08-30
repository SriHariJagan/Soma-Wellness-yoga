// ============================================================
// config/passport.js — OAuth strategies (Google, Facebook, Instagram)
// ============================================================
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as InstagramStrategy } from "passport-oauth2";
import User from "../models/User.js";
import logger from "../notification/logger.js";

const MODULE = "Passport";

// ── Helper: find or create user from OAuth profile ──────────
async function findOrCreateUser(profile, provider) {
  const email =
    profile.emails?.[0]?.value?.toLowerCase().trim() || null;
  const avatar =
    profile.photos?.[0]?.value || "";
  const providerId = profile.id;
  const displayName =
    profile.displayName ||
    [profile.name?.givenName, profile.name?.familyName]
      .filter(Boolean)
      .join(" ") ||
    "Social User";

  // 1. Check if user already linked this OAuth account
  const existingByProvider = await User.findOne({
    "oauth.provider": provider,
    "oauth.providerId": providerId,
  });
  if (existingByProvider) {
    existingByProvider.lastLogin = new Date();
    await existingByProvider.save();
    return existingByProvider;
  }

  // 2. If email exists, link to existing account
  if (email) {
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      existingByEmail.oauth = existingByEmail.oauth || [];
      existingByEmail.oauth.push({ provider, providerId });
      if (avatar && !existingByEmail.avatar) existingByEmail.avatar = avatar;
      existingByEmail.lastLogin = new Date();
      await existingByEmail.save();
      return existingByEmail;
    }
  }

  // 3. Create new user
  const newUser = await User.create({
    name: displayName,
    email: email || `${provider}_${providerId}@soma-oauth.local`,
    password: crypto.randomBytes(18).toString("hex"),
    avatar,
    emailVerified: !!email,
    oauth: [{ provider, providerId }],
  });

  logger.info(MODULE, `New user created via ${provider}`, {
    userId: String(newUser._id),
    email: newUser.email,
  });

  return newUser;
}

// ── Google Strategy ────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
        scope: ["profile", "email"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(profile, "google");
          done(null, user);
        } catch (err) {
          logger.error(MODULE, "Google OAuth error", { error: err.message });
          done(err, null);
        }
      }
    )
  );
  logger.info(MODULE, "Google OAuth strategy registered");
} else {
  logger.warn(MODULE, "Google OAuth disabled — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

// ── Facebook Strategy ──────────────────────────────────────
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/facebook/callback`,
        profileFields: ["id", "displayName", "emails", "photos"],
        scope: ["email"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(profile, "facebook");
          done(null, user);
        } catch (err) {
          logger.error(MODULE, "Facebook OAuth error", { error: err.message });
          done(err, null);
        }
      }
    )
  );
  logger.info(MODULE, "Facebook OAuth strategy registered");
} else {
  logger.warn(MODULE, "Facebook OAuth disabled — missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET");
}

// ── Instagram Strategy (OAuth2 via Instagram Basic Display) ──
if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
  passport.use(
    "instagram",
    new InstagramStrategy(
      {
        authorizationURL: "https://api.instagram.com/oauth/authorize",
        tokenURL: "https://api.instagram.com/oauth/access_token",
        clientID: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/instagram/callback`,
        scope: ["user_profile"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Instagram Basic Display API doesn't return email or full name
          // Profile only contains { id, username }
          const igProfile = {
            id: profile.id,
            displayName: profile.username || "Instagram User",
            emails: [],
            photos: [],
          };
          const user = await findOrCreateUser(igProfile, "instagram");
          done(null, user);
        } catch (err) {
          logger.error(MODULE, "Instagram OAuth error", { error: err.message });
          done(err, null);
        }
      }
    )
  );
  logger.info(MODULE, "Instagram OAuth strategy registered");
} else {
  logger.warn(MODULE, "Instagram OAuth disabled — missing INSTAGRAM_CLIENT_ID or INSTAGRAM_CLIENT_SECRET");
}

// ── Serialization (required by Passport, though we use stateless JWT) ──
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
