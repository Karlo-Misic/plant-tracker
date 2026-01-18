const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function getUserId(req) {
  return req.user?.korisnik_id ?? req.user?.id;
}

async function assertPlantOwner(biljka_id, userId) {
  const r = await db.query(
    "SELECT biljka_id FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2",
    [biljka_id, userId]
  );
  return r.rows.length > 0;
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    const r = await db.query(
      `SELECT p.*
       FROM podsjetnik p
       JOIN biljka b ON b.biljka_id = p.biljka_id
       WHERE b.korisnik_id = $1
       ORDER BY p.rok ASC, p.podsjetnik_id DESC`,
      [userId]
    );

    res.json(r.rows);
  } catch (e) {
    console.error("REMINDERS GET / ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/active", async (req, res) => {
  try {
    const userId = getUserId(req);
    const pid = Number(req.query.biljka_id);
    if (!pid || Number.isNaN(pid)) return res.status(400).json({ error: "biljka_id je obavezan" });

    const ok = await assertPlantOwner(pid, userId);
    if (!ok) return res.status(403).json({ error: "Forbidden" });

    const r = await db.query(
      `SELECT *
       FROM v_aktivni_podsjetnici
       WHERE biljka_id=$1 AND korisnik_id=$2
       ORDER BY rok ASC, podsjetnik_id DESC`,
      [pid, userId]
    );

    res.json(r.rows);
  } catch (e) {
    console.error("REMINDERS GET /active ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/upcoming", async (req, res) => {
  try {
    const userId = getUserId(req);
    const r = await db.query(
      `SELECT *
       FROM v_aktivni_podsjetnici
       WHERE korisnik_id=$1
       ORDER BY rok ASC, podsjetnik_id DESC`,
      [userId]
    );
    res.json(r.rows);
  } catch (e) {
    console.error("REMINDERS GET /upcoming ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:biljka_id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const biljka_id = Number(req.params.biljka_id);
    if (Number.isNaN(biljka_id)) return res.status(400).json({ error: "invalid biljka_id" });

    const ok = await assertPlantOwner(biljka_id, userId);
    if (!ok) return res.status(403).json({ error: "Forbidden" });

    const r = await db.query(
      `SELECT *
       FROM podsjetnik
       WHERE biljka_id=$1
       ORDER BY rok ASC, podsjetnik_id DESC`,
      [biljka_id]
    );

    res.json(r.rows);
  } catch (e) {
    console.error("REMINDERS GET /:biljka_id ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:biljka_id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const biljka_id = Number(req.params.biljka_id);
    const { rok, vrsta_podsjetnika, status } = req.body || {};

    if (Number.isNaN(biljka_id)) return res.status(400).json({ error: "invalid biljka_id" });
    if (!rok || !vrsta_podsjetnika) {
      return res.status(400).json({ error: "rok i vrsta_podsjetnika su obavezni" });
    }

    const ok = await assertPlantOwner(biljka_id, userId);
    if (!ok) return res.status(403).json({ error: "Forbidden" });

    const r = await db.query(
      `INSERT INTO podsjetnik (biljka_id, rok, vrsta_podsjetnika, status, izvor)
       VALUES ($1,$2,$3,$4,'rucni')
       RETURNING *`,
      [biljka_id, rok, vrsta_podsjetnika, status || "aktivan"]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("REMINDERS POST /:biljka_id ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { biljka_id, rok, vrsta_podsjetnika, status } = req.body || {};
    const pid = Number(biljka_id);

    if (!pid) return res.status(400).json({ error: "biljka_id je obavezan" });
    if (!rok || !vrsta_podsjetnika) {
      return res.status(400).json({ error: "rok i vrsta_podsjetnika su obavezni" });
    }

    const ok = await assertPlantOwner(pid, userId);
    if (!ok) return res.status(403).json({ error: "Forbidden" });

    const r = await db.query(
      `INSERT INTO podsjetnik (biljka_id, rok, vrsta_podsjetnika, status, izvor)
       VALUES ($1,$2,$3,$4,'rucni')
       RETURNING *`,
      [pid, rok, vrsta_podsjetnika, status || "aktivan"]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("REMINDERS POST / ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:podsjetnik_id/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    const podsjetnik_id = Number(req.params.podsjetnik_id);
    const { status } = req.body || {};

    const r = await db.query(
      `UPDATE podsjetnik p
       SET status=$1
       FROM biljka b
       WHERE p.podsjetnik_id=$2
         AND b.biljka_id = p.biljka_id
         AND b.korisnik_id=$3
       RETURNING p.*`,
      [status, podsjetnik_id, userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error("REMINDERS PUT status ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:podsjetnik_id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const podsjetnik_id = Number(req.params.podsjetnik_id);

    const r = await db.query(
      `DELETE FROM podsjetnik p
       USING biljka b
       WHERE p.podsjetnik_id=$1
         AND b.biljka_id = p.biljka_id
         AND b.korisnik_id=$2
       RETURNING p.podsjetnik_id`,
      [podsjetnik_id, userId]
    );

    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error("REMINDERS DELETE ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;