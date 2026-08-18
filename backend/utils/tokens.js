const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function signRefreshToken() {
  // A random opaque token — not a JWT. We store only its hash in the DB (see User model),
  // so the raw value that lives in the browser cookie is useless if the DB ever leaks.
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  return { raw, tokenHash, expiresAt };
}

function hashRefreshToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const isProd = process.env.NODE_ENV === "production";

// Cross-domain in production (frontend on Vercel, backend on Render/Railway) needs
// SameSite=None + Secure. Same-site local dev (localhost:3000 -> localhost:5000) works
// fine with Lax and doesn't require HTTPS.
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

function accessCookieOptions() {
  return { ...baseCookieOptions, maxAge: 15 * 60 * 1000 };
}

function refreshCookieOptions() {
  return { ...baseCookieOptions, maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000, path: "/api/auth" };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
};
