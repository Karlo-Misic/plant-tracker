const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const plantRoutes = require("./routes/plants");
const eventRoutes = require("./routes/events");
const reminderRoutes = require("./routes/reminders");
const photoRoutes = require("./routes/photos");
const stateRoutes = require("./routes/state");

const app = express();
app.use(cors());
app.use(express.json());

for (const k of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"]) {
  if (!process.env[k]) {
    throw new Error(`Missing env: ${k} (provjeri .env u rootu projekta)`);
  }
}

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);
app.use("/plants", plantRoutes);
app.use("/events", eventRoutes);
app.use("/reminders", reminderRoutes);
app.use("/photos", photoRoutes);
app.use("/state", stateRoutes);

const frontendDir = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontendDir));

const uploadsDir = path.resolve(__dirname, "../../uploads");
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));