require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const User = require("./models/User");

const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payment");
const settingsRoutes = require("./routes/settings");
const userRoutes = require("./routes/users");
const teamRoutes = require("./routes/team");
const auditLogRoutes = require("./routes/auditLogs");
const couponRoutes = require("./routes/coupons");
const reviewRoutes = require("./routes/reviews");
const rmaRoutes = require("./routes/rma");
const supportRoutes = require("./routes/support");
const landingPageRoutes = require("./routes/landingPages");

const app = express();

// --- Security middleware ---
app.use(helmet());
const allowedOrigins = [
  "http://localhost:3000",
  "https://tech-arcade-bd.vercel.app",
  "https://tech-arcade-bd-frontend-52go1ae7a-nusratjahandina74s-projects.vercel.app" 
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Blocked by CORS Policy"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" })); 
app.use(cookieParser());
app.use(mongoSanitize()); 
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Routes ---
app.use("/api/products/:productId/reviews", reviewRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/rma", rmaRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/landing-pages", landingPageRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get('/', (req, res) => {
  res.send('Tech Arcade BD Backend is running successfully!');
});
// Fallback 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ message: "Not found." }));

// Generic error handler — never leak stack traces to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  // Create the first admin account automatically if none exists yet
  const adminCount = await User.countDocuments({ role: { $in: ["admin", "manager"] } });
  if (adminCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await User.create({
      name: "Shop Owner",
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: "admin",
      isVerified: true,
    });
    console.log(`First admin account created: ${process.env.ADMIN_EMAIL}`);
    console.log("IMPORTANT: log in and change this password, then remove ADMIN_PASSWORD from .env.");
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
