// ============================================================
// routes/auth.js  —  mounted at /api/auth
// ============================================================
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many attempts, please try again later.",
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again later.",
});

router.post("/register", authLimiter, validate(schemas.register), register);
router.post("/login", loginLimiter, validate(schemas.login), login);
router.post("/refresh", loginLimiter, refresh);
router.post("/logout", loginLimiter, logout);
router.post(
  "/forgot-password",
  authLimiter,
  validate(schemas.forgotPassword),
  forgotPassword,
);
router.post(
  "/reset-password/:token",
  authLimiter,
  validate(schemas.resetPassword),
  resetPassword,
);

router.get("/profile", requireAuth, getProfile);
router.put(
  "/profile",
  requireAuth,
  validate(schemas.updateProfile),
  updateProfile,
);
router.post(
  "/change-password",
  requireAuth,
  validate(schemas.changePassword),
  changePassword,
);

export default router;
