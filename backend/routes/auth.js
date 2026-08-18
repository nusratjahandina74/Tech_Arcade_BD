const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const OtpCode = require("../models/OtpCode");
const { validateBody } = require("../middleware/validate");
const { registerSchema, loginSchema, requestOtpSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } = require("../schemas/authSchemas");
const { requireAuth } = require("../middleware/auth");
const { sendSms } = require("../utils/sms");
const { sendEmail } = require("../utils/email");
const { passwordResetEmail, passwordChangedEmail } = require("../templates/emails");
const PasswordResetToken = require("../models/PasswordResetToken");
const {
  signAccessToken,
  signRefreshToken,
  hashRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
} = require("../utils/tokens");

const router = express.Router();

// Slow down brute-force login/register attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

// OTP requests are cheap to abuse (each one costs real SMS money), so this is
// stricter than the general auth limiter.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: { message: "Too many OTP requests for this number. Please wait a few minutes." },
});

async function issueSession(res, user, userAgent) {
  const accessToken = signAccessToken(user);
  const { raw, tokenHash, expiresAt } = signRefreshToken();

  user.refreshTokens.push({ tokenHash, expiresAt, userAgent: userAgent?.slice(0, 200) || "" });
  // Cap stored sessions per user so this array can't grow unbounded
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(-10);
  }
  await user.save();

  res.cookie("ta_access_token", accessToken, accessCookieOptions());
  res.cookie("ta_refresh_token", raw, refreshCookieOptions());
}

// POST /api/auth/register — client self-registration
router.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email, isDeleted: false });
  if (existing) {
    return res.status(400).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, phone, passwordHash, role: "client" });

  await issueSession(res, user, req.headers["user-agent"]);
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/otp/request — sends a 4-digit code by SMS, works for both
// existing and brand-new customers (no separate "register" step needed).
router.post("/otp/request", otpRequestLimiter, validateBody(requestOtpSchema), async (req, res) => {
  const { phone } = req.body;

  const code = String(Math.floor(1000 + Math.random() * 9000)); // 4 digits
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await OtpCode.create({ phone, codeHash, expiresAt });

  try {
    await sendSms(phone, `Your TechArcade verification code is ${code}. It expires in 5 minutes.`);
  } catch (err) {
    console.error("[otp] SMS send failed:", err.message);
    return res.status(502).json({ message: "Could not send the SMS right now. Please try again shortly." });
  }

  const isDev = process.env.NODE_ENV !== "production";
  res.json({
    message: "Verification code sent.",
    // Only ever included outside production, and only because no real
    // gateway may be configured yet — lets you test the whole flow first.
    ...(isDev ? { devCode: code } : {}),
  });
});

// POST /api/auth/otp/verify — logs an existing customer in, or creates a new
// account on the fly for a phone number that's never ordered before.
router.post("/otp/verify", authLimiter, validateBody(verifyOtpSchema), async (req, res) => {
  const { phone, code, name } = req.body;
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  const otp = await OtpCode.findOne({ phone, consumed: false }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ message: "Code expired or not found. Please request a new one." });
  }
  if (otp.attempts >= 5) {
    return res.status(400).json({ message: "Too many incorrect attempts. Please request a new code." });
  }
  if (otp.codeHash !== codeHash) {
    otp.attempts += 1;
    await otp.save();
    return res.status(400).json({ message: "Incorrect code." });
  }

  otp.consumed = true;
  await otp.save();

  let user = await User.findOne({ phone, isDeleted: false });
  if (!user) {
    user = await User.create({ name: name || "Customer", phone, role: "client", isVerified: true });
  } else if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  await issueSession(res, user, req.headers["user-agent"]);
  res.json({ user: { id: user._id, name: user.name, phone: user.phone, role: user.role } });
});

// POST /api/auth/forgot-password — always responds the same way whether or not
// the email exists, so we never leak which addresses have accounts.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { message: "Too many reset requests. Please try again later." },
});

router.post("/forgot-password", forgotPasswordLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, isDeleted: false });

  if (user && user.email) {
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await PasswordResetToken.create({ user: user._id, tokenHash, expiresAt });

    const resetUrl = `${process.env.FRONTEND_URL}/account/reset-password?token=${raw}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your TechArcade password",
        html: passwordResetEmail({ name: user.name, resetUrl }),
      });
    } catch (err) {
      console.error("[email] Password reset send failed:", err.message);
      // Deliberately still return success below — don't leak whether the
      // email step failed, and don't block the (rate-limited) response.
    }
  }

  res.json({ message: "If that email is registered, a password reset link has been sent." });
});

// POST /api/auth/reset-password — consumes the emailed token, sets the new
// password, and revokes every existing session (password resets are a
// security event, not just a preference change).
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), async (req, res) => {
  const { token, newPassword } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetRecord = await PasswordResetToken.findOne({ tokenHash });
  if (!resetRecord || resetRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
  }

  const user = await User.findById(resetRecord.user);
  if (!user || user.isDeleted) {
    return res.status(400).json({ message: "Account not found." });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.refreshTokens = []; // log out every other device/session
  await user.save();
  await PasswordResetToken.deleteOne({ _id: resetRecord._id });

  sendEmail({
    to: user.email,
    subject: "Your TechArcade password was changed",
    html: passwordChangedEmail({ name: user.name }),
  }).catch((err) => console.error("[email] Password-changed notice failed:", err.message));

  res.json({ message: "Password updated. Please log in with your new password." });
});

// POST /api/auth/login — works for client, admin, and manager accounts alike
router.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isDeleted: false });
  // Same generic error whether the email or the password was wrong, so we
  // don't leak which accounts exist.
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  await issueSession(res, user, req.headers["user-agent"]);
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/refresh — rotates the refresh token and issues a new access token.
// Scoped cookie path (/api/auth) means only this route ever sees the refresh cookie.
router.post("/refresh", async (req, res) => {
  const raw = req.cookies?.ta_refresh_token;
  if (!raw) return res.status(401).json({ message: "Not logged in." });

  const tokenHash = hashRefreshToken(raw);
  const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash, isDeleted: false });

  if (!user) {
    res.clearCookie("ta_access_token", { path: "/" });
    res.clearCookie("ta_refresh_token", { path: "/api/auth" });
    return res.status(401).json({ message: "Session expired, please log in again." });
  }

  const stored = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    await user.save();
    return res.status(401).json({ message: "Session expired, please log in again." });
  }

  // Rotation: the used refresh token is removed and a brand new one issued,
  // so a stolen-but-already-used token can never be replayed.
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  await issueSession(res, user, req.headers["user-agent"]);

  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// POST /api/auth/logout — clears cookies and revokes the refresh token server-side
router.post("/logout", async (req, res) => {
  const raw = req.cookies?.ta_refresh_token;
  if (raw) {
    const tokenHash = hashRefreshToken(raw);
    await User.updateOne({ "refreshTokens.tokenHash": tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
  }
  res.clearCookie("ta_access_token", { path: "/" });
  res.clearCookie("ta_refresh_token", { path: "/api/auth" });
  res.json({ message: "Logged out." });
});

// GET /api/auth/me — lets the frontend check "am I logged in, and as what role"
router.get("/me", requireAuth(), async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
