const { Pool } = require("pg");

const pool = new Pool({
  host: String(process.env.PGHOST || "localhost"),
  port: Number(process.env.PGPORT || 5432),
  user: String(process.env.PGUSER || "plantuser"),
  password: String(process.env.PGPASSWORD || ""),
  database: String(process.env.PGDATABASE || "plantdb"),
});

pool.on("error", (err) => {
  console.error("PG POOL ERROR:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};