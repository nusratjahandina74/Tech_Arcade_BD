const jwt = require("jsonwebtoken");

// Reads the short-lived access token from an HttpOnly cookie (never from
// localStorage or an Authorization header — that would be readable by any
// injected script, which is exactly what HttpOnly cookies protect against).
function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const token = req.cookies?.ta_access_token;
    if (!token) {
      return res.status(401).json({ message: "Login required." });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "You don't have access to this." });
      }
      req.user = decoded; // { id, email, role, name }
      next();
    } catch (err) {
      return res.status(401).json({ message: "Session expired, please log in again." });
    }
  };
}

// Kept as the same name/shape the rest of the app already imports —
// admin and manager roles both reach the admin panel; route-level checks
// can further restrict manager-only actions where needed.
const requireAdmin = requireAuth(["admin", "manager"]);

// Strictly the shop owner — used for actions a manager should never be able
// to do (changing payment numbers, deleting products, managing team accounts).
const requireOwner = requireAuth(["admin"]);

// Delivery staff: can see orders that are ready to ship and mark them
// delivered — nothing else in the admin panel.
const requireDelivery = requireAuth(["admin", "manager", "delivery"]);

// For routes usable by both guests and logged-in clients (e.g. placing an
// order): attaches req.user if a valid session cookie is present, but never
// blocks the request if it isn't.
function attachUserIfPresent(req, res, next) {
  const token = req.cookies?.ta_access_token;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    // expired/invalid token on an optional route — just proceed as a guest
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireOwner, requireDelivery, attachUserIfPresent };
