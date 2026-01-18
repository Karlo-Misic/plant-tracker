CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS korisnik (
  korisnik_id      SERIAL PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  lozinka_hash     TEXT NOT NULL,
  datum_kreiranja  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biljka (
  biljka_id     SERIAL PRIMARY KEY,
  korisnik_id   INT NOT NULL REFERENCES korisnik(korisnik_id) ON DELETE CASCADE,
  naziv         TEXT NOT NULL,
  vrsta         TEXT,
  datum_nabave  DATE,
  lokacija      TEXT
);

CREATE TABLE IF NOT EXISTS dogadjaj_njege (
  dogadjaj_id        SERIAL PRIMARY KEY,
  biljka_id          INT NOT NULL REFERENCES biljka(biljka_id) ON DELETE CASCADE,
  vrsta_dogadjaja    TEXT NOT NULL,
  vrijeme_dogadjaja  TIMESTAMPTZ NOT NULL DEFAULT now(),
  opis               TEXT
);

CREATE TABLE IF NOT EXISTS podsjetnik (
  podsjetnik_id     SERIAL PRIMARY KEY,
  biljka_id         INT NOT NULL REFERENCES biljka(biljka_id) ON DELETE CASCADE,
  rok               TIMESTAMPTZ NOT NULL,
  vrsta_podsjetnika TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aktivan',
  izvor             TEXT NOT NULL DEFAULT 'rucni',
  dogadjaj_id       INT NULL REFERENCES dogadjaj_njege(dogadjaj_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fotografija (
  fotografija_id    SERIAL PRIMARY KEY,
  biljka_id         INT NOT NULL REFERENCES biljka(biljka_id) ON DELETE CASCADE,
  vrijeme_nastanka  TIMESTAMPTZ NOT NULL DEFAULT now(),
  opis              TEXT,
  putanja_datoteke  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stanje_biljke (
  stanje_id            SERIAL PRIMARY KEY,
  biljka_id            INT NOT NULL REFERENCES biljka(biljka_id) ON DELETE CASCADE,
  razdoblje_valjanosti TSRANGE NOT NULL,
  visina_cm            REAL,
  broj_listova         INT,
  ocjena_zdravlja      INT,
  napomena             TEXT
);

ALTER TABLE stanje_biljke
  ADD CONSTRAINT stanje_no_overlap
  EXCLUDE USING gist (
    biljka_id WITH =,
    razdoblje_valjanosti WITH &&
  );

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id     BIGSERIAL PRIMARY KEY,
  tablica      TEXT NOT NULL,
  operacija    TEXT NOT NULL,
  zapis_id     TEXT,
  korisnik_id  INT,
  detalji      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);