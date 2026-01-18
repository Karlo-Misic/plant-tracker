const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safe);
  },
});

const upload = multer({ storage });

router.get("/:biljka_id", async (req, res) => {
  const biljka_id = Number(req.params.biljka_id);

  const own = await db.query("SELECT 1 FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2", [biljka_id, req.user.korisnik_id]);
  if (!own.rows[0]) return res.status(404).json({ error: "Plant not found" });

  const r = await db.query(
    "SELECT * FROM fotografija WHERE biljka_id=$1 ORDER BY vrijeme_nastanka DESC, fotografija_id DESC",
    [biljka_id]
  );
  res.json(r.rows);
});

router.post("/:biljka_id", upload.single("file"), async (req, res) => {
  const biljka_id = Number(req.params.biljka_id);
  const { opis, vrijeme_nastanka } = req.body || {};

  const own = await db.query("SELECT 1 FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2", [biljka_id, req.user.korisnik_id]);
  if (!own.rows[0]) return res.status(404).json({ error: "Plant not found" });

  if (!req.file) return res.status(400).json({ error: "file required (multipart/form-data)" });

  const filePath = path.join(uploadDir, req.file.filename);

  const r = await db.query(
    `INSERT INTO fotografija(biljka_id, vrijeme_nastanka, opis, putanja_datoteke)
     VALUES ($1, COALESCE($2, now()), $3, $4) RETURNING *`,
    [biljka_id, vrijeme_nastanka || null, opis || null, filePath]
  );

  res.json(r.rows[0]);
});

module.exports = router;