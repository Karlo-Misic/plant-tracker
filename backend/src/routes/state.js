const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function toPgTimestamp(input) {
  if (input === null || input === undefined) return "";
  const s = String(input).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.replace("T", " ");

  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = m[1],
      mm = m[2],
      yyyy = m[3];
    return `${yyyy}-${mm}-${dd} 00:00:00`;
  }

  return s;
}

async function assertOwnPlant(biljka_id, korisnik_id) {
  const { rows } = await db.query(
    `SELECT 1 FROM biljka WHERE biljka_id=$1 AND korisnik_id=$2 LIMIT 1`,
    [biljka_id, korisnik_id]
  );
  return !!rows[0];
}

router.get("/:biljka_id", async (req, res) => {
  try {
    const biljka_id = Number(req.params.biljka_id);
    if (!Number.isFinite(biljka_id) || biljka_id <= 0) {
      return res.status(400).json({ error: "Neispravan biljka_id" });
    }

    const ok = await assertOwnPlant(biljka_id, req.user.korisnik_id);
    if (!ok) return res.status(404).json({ error: "Plant not found" });

    const r = await db.query(
      `SELECT stanje_id, biljka_id, visina_cm, broj_listova, ocjena_zdravlja, napomena,
              razdoblje_valjanosti::text AS valjanost
         FROM stanje_biljke
        WHERE biljka_id = $1
        ORDER BY lower(razdoblje_valjanosti) DESC`,
      [biljka_id]
    );

    res.json(r.rows);
  } catch (e) {
    console.error("STATE GET error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:biljka_id/at", async (req, res) => {
  try {
    const biljka_id = Number(req.params.biljka_id);
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "date query param is required" });

    if (!Number.isFinite(biljka_id) || biljka_id <= 0) {
      return res.status(400).json({ error: "Neispravan biljka_id" });
    }

    const ok = await assertOwnPlant(biljka_id, req.user.korisnik_id);
    if (!ok) return res.status(404).json({ error: "Plant not found" });

    const r = await db.query(
      `SELECT stanje_id, biljka_id, visina_cm, broj_listova, ocjena_zdravlja, napomena,
              razdoblje_valjanosti::text AS valjanost
         FROM stanje_na_datum($1, $2::date)`,
      [biljka_id, date]
    );

    res.json(r.rows[0] || null);
  } catch (e) {
    console.error("STATE GET /:biljka_id/at error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:biljka_id", async (req, res) => {
  try {
    const biljka_id = Number(req.params.biljka_id);
    if (!Number.isFinite(biljka_id) || biljka_id <= 0) {
      return res.status(400).json({ error: "Neispravan biljka_id" });
    }

    const { od, do: doVal, doo, visina_cm, broj_listova, ocjena_zdravlja, napomena } = req.body || {};
    const doRaw = doVal ?? doo;

    const odTs = toPgTimestamp(od);
    const doTs = toPgTimestamp(doRaw);

    if (!odTs || !doTs) {
      return res.status(400).json({ error: "Moraš unijeti 'od' i 'do' za razdoblje valjanosti." });
    }

    const chk = await db.query(`select ($1::timestamp < $2::timestamp) as ok`, [odTs, doTs]);
    if (!chk.rows[0]?.ok) {
      return res.status(400).json({ error: "'Od' mora biti prije 'Do'." });
    }

    const own = await assertOwnPlant(biljka_id, req.user.korisnik_id);
    if (!own) return res.status(403).json({ error: "Nemaš pristup ovoj biljci" });

    const r = await db.query(
      `INSERT INTO stanje_biljke
        (biljka_id, razdoblje_valjanosti, visina_cm, broj_listova, ocjena_zdravlja, napomena)
       VALUES ($1, tsrange($2::timestamp, $3::timestamp, '[)'), $4, $5, $6, $7)
       RETURNING stanje_id, biljka_id, visina_cm, broj_listova, ocjena_zdravlja, napomena,
                 razdoblje_valjanosti::text AS valjanost`,
      [
        biljka_id,
        odTs,
        doTs,
        visina_cm ?? null,
        broj_listova ?? null,
        ocjena_zdravlja ?? null,
        napomena ?? null,
      ]
    );

    res.json(r.rows[0]);
  } catch (e) {
    console.error("STATE POST error:", e);

    if (e && e.code === "23P01") {
      return res.status(409).json({
        error: "Razdoblje valjanosti se preklapa s postojećim stanjem za ovu biljku. Odaberi drugi raspon.",
      });
    }

    if (e && e.code === "22007") {
      return res.status(400).json({ error: "Neispravan format datuma (od/do)." });
    }

    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;