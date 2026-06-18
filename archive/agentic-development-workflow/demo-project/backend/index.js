chazzconst express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Initialize DB and start
db.initialize();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});