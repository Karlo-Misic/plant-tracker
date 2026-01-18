const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "tajna";

let cachedCols = null;

async function getKorisnikColumns() {
  if (cachedCols) return cachedCols;
  const q = `
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'korisnik'
  `;
  const { rows } = await db.query(q);
  cachedCols = new Set(rows.map((r) => r.column_name));
  return cachedCols;
}

function pickFirst(cols, candidates) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

async function getAuthMapping() {
  const cols = await getKorisnikColumns();

  const idCol = pickFirst(cols, ["korisnik_id", "user_id", "id"]);
  const emailCol = pickFirst(cols, ["email", "mail", "username", "korisnicko_ime"]);
  const passCol = pickFirst(cols, ["lozinka_hash", "password_hash", "hash", "lozinka", "password"]);

  if (!idCol || !emailCol || !passCol) {
    throw new Error(`Tablica korisnik nema očekivane stupce (id/email/pass).`);
  }

  return { idCol, emailCol, passCol };
}

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) return res.status(400).json({ error: "email i password su obavezni" });
    if (password.length < 6) return res.status(400).json({ error: "Lozinka mora imati barem 6 znakova" });

    const { idCol, emailCol, passCol } = await getAuthMapping();

    const ex = await db.query(
      `select ${idCol} as id from korisnik where ${emailCol} = $1 limit 1`,
      [email]
    );
    if (ex.rows.length) return res.status(409).json({ error: "Email već postoji" });

    const hash = await bcrypt.hash(password, 10);

    const ins = await db.query(
      `insert into korisnik (${emailCol}, ${passCol})
       values ($1, $2)
       returning ${idCol} as id, ${emailCol} as email`,
      [email, hash]
    );

    const user = ins.rows[0];
    const token = jwt.sign({ korisnik_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ ok: true, token, user: { korisnik_id: user.id, email: user.email } });
  } catch (e) {
    console.error("REGISTER ERROR:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) return res.status(400).json({ error: "email i password su obavezni" });

    const { idCol, emailCol, passCol } = await getAuthMapping();

    const r = await db.query(
      `select ${idCol} as id, ${emailCol} as email, ${passCol} as pass
       from korisnik where ${emailCol} = $1 limit 1`,
      [email]
    );
    if (!r.rows.length) return res.status(401).json({ error: "Neispravni podaci" });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, String(user.pass));
    if (!ok) return res.status(401).json({ error: "Neispravni podaci" });

    const token = jwt.sign({ korisnik_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ ok: true, token, user: { korisnik_id: user.id, email: user.email } });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;