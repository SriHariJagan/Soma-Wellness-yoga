// ============================================================
// controllers/oauthController.js — OAuth callback handlers
// Generates JWT tokens and redirects to frontend with token
// ============================================================
import crypto from "crypto";
import passport from "passport";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken } from "../utils/token.js";
import logger from "../notification/logger.js";

const MODULE = "OAuthCtrl";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const OAUTH_SUCCESS_REDIRECT = process.env.OAUTH_SUCCESS_REDIRECT || `${FRONTEND_URL}/social/success`;
const OAUTH_FAILURE_REDIRECT = process.env.OAUTH_FAILURE_REDIRECT || `${FRONTEND_URL}/login?socialError=1`;

const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

// Issue tokens and redirect to frontend with token in URL fragment
function issueTokensAndRedirect(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store refresh token hash
  User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: { $each: [hashToken(refreshToken)], $slice: -5 } },
    lastLogin: new Date(),
  }).catch((err) => {
    logger.error(MODULE, "Failed to store refresh token", { error: err.message });
  });

  // Redirect to frontend with tokens in URL hash (not query params for security)
  const redirectUrl = `${OAUTH_SUCCESS_REDIRECT}#token=${encodeURIComponent(accessToken)}&user=${encodeURIComponent(JSON.stringify({
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar || "",
    phone: user.phone || "",
  }))}`;

  res.redirect(redirectUrl);
}

// ── Google ─────────────────────────────────────────────────
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

export const googleCallback = [
  passport.authenticate("google", { failureRedirect: OAUTH_FAILURE_REDIRECT, session: false }),
  (req, res) => {
    if (!req.user) return res.redirect(OAUTH_FAILURE_REDIRECT);
    issueTokensAndRedirect(res, req.user);
  },
];

// ── Facebook ───────────────────────────────────────────────
export const facebookAuth = passport.authenticate("facebook", {
  scope: ["email"],
  session: false,
});

export const facebookCallback = [
  passport.authenticate("facebook", { failureRedirect: OAUTH_FAILURE_REDIRECT, session: false }),
  (req, res) => {
    if (!req.user) return res.redirect(OAUTH_FAILURE_REDIRECT);
    issueTokensAndRedirect(res, req.user);
  },
];

// ── Instagram ──────────────────────────────────────────────
export const instagramAuth = passport.authenticate("instagram", {
  scope: ["user_profile"],
  session: false,
});

export const instagramCallback = [
  passport.authenticate("instagram", { failureRedirect: OAUTH_FAILURE_REDIRECT, session: false }),
  (req, res) => {
    if (!req.user) return res.redirect(OAUTH_FAILURE_REDIRECT);
    issueTokensAndRedirect(res, req.user);
  },
];
