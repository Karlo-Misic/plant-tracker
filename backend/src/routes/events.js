const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/:biljka_id", async (req, res) => {
  const biljka_id = Number(req.params.biljka_id);

  const own = await db.query("SELECT 1 FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2", [biljka_id, req.user.korisnik_id]);
  if (!own.rows[0]) return res.status(404).json({ error: "Plant not found" });

  const r = await db.query(
    "SELECT * FROM dogadjaj_njege WHERE biljka_id=$1 ORDER BY vrijeme_dogadjaja DESC, dogadjaj_id DESC",
    [biljka_id]
  );
  res.json(r.rows);
});

router.post("/:biljka_id", async (req, res) => {
  const biljka_id = Number(req.params.biljka_id);
  const { vrsta_dogadjaja, vrijeme_dogadjaja, opis } = req.body || {};
  if (!vrsta_dogadjaja) return res.status(400).json({ error: "vrsta_dogadjaja required" });

  const own = await db.query("SELECT 1 FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2", [biljka_id, req.user.korisnik_id]);
  if (!own.rows[0]) return res.status(404).json({ error: "Plant not found" });

  const r = await db.query(
    `INSERT INTO dogadjaj_njege(biljka_id, vrsta_dogadjaja, vrijeme_dogadjaja, opis)
     VALUES ($1,$2,COALESCE($3,now()),$4) RETURNING *`,
    [biljka_id, vrsta_dogadjaja, vrijeme_dogadjaja || null, opis || null]
  );
  res.json(r.rows[0]);
});

module.exports = router;