const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  const r = await db.query(
    "SELECT * FROM biljka WHERE korisnik_id=$1 ORDER BY biljka_id DESC",
    [req.user.korisnik_id]
  );
  res.json(r.rows);
});

router.post("/", async (req, res) => {
  const { naziv, vrsta, datum_nabave, lokacija } = req.body || {};
  if (!naziv) return res.status(400).json({ error: "naziv required" });

  const r = await db.query(
    "INSERT INTO biljka(korisnik_id,naziv,vrsta,datum_nabave,lokacija) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [req.user.korisnik_id, naziv, vrsta || null, datum_nabave || null, lokacija || null]
  );
  res.json(r.rows[0]);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { naziv, vrsta, datum_nabave, lokacija } = req.body || {};

  const r = await db.query(
    `UPDATE biljka
     SET naziv=COALESCE($1,naziv),
         vrsta=COALESCE($2,vrsta),
         datum_nabave=COALESCE($3,datum_nabave),
         lokacija=COALESCE($4,lokacija)
     WHERE biljka_id=$5 AND korisnik_id=$6
     RETURNING *`,
    [naziv ?? null, vrsta ?? null, datum_nabave ?? null, lokacija ?? null, id, req.user.korisnik_id]
  );

  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(r.rows[0]);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const r = await db.query(
    "DELETE FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2 RETURNING biljka_id",
    [id, req.user.korisnik_id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

module.exports = router;