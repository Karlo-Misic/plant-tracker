# Plant Tracker 🌿

Aplikacija za praćenje i pomoć u održavanju rasta biljaka (događaji njege, podsjetnici, fotografije i temporalna povijest stanja) izrađena za kolegij **Aktivne i temporalne baze podataka (PostgreSQL)**.

## Funkcionalnosti

* **Korisnici:** registracija i prijava (JWT)
* **Biljke:** dodavanje, prikaz i brisanje biljaka po korisniku
* **Događaji njege:** zalijevanje/prihrana/… s vremenom i opisom
* **Podsjetnici:** ručni + automatski (okidač nakon događaja njege), statusi (aktivan/izvršen/otkazan)
* **Fotografije:** upload i prikaz slika po biljci
* **Temporalno stanje biljke:** evidencija stanja kroz intervale valjanosti (`tsrange`) uz zabranu preklapanja (EXCLUDE constraint)
* **Audit log:** zapisivanje promjena (aktivni dio baze)

## Tehnologije

* PostgreSQL 16 (Docker)
* Node.js + Express (backend)
* HTML/CSS/JS (frontend)
* Postman (testiranje API-ja)

---

## Pokretanje (lokalno)

### Preduvjeti

* **Docker Desktop** (ili Docker Engine)
* **Node.js** (LTS preporuka)

### 1) Pokreni bazu (Docker)

U root direktoriju projekta:

```bash
docker compose up -d
```

Ovo će podići PostgreSQL i inicijalizirati bazu iz `db/*.sql` skripti.

### 2) Backend (API)

Instaliraj ovisnosti i pokreni server:

```bash
npm install
npm run dev
```

API će se pokrenuti na:

* `http://localhost:3001`

Health check:

* `GET http://localhost:3001/health`

### 3) Frontend

Frontend se servira iz backend-a (Express `static`), pa je dovoljno otvoriti:

* `http://localhost:3001/`

---

## Konfiguracija (.env)

U rootu projekta postoji `.env`. Minimalno:

```env
PGHOST=localhost
PGPORT=5432
PGUSER=plantuser
PGPASSWORD=plantpass
PGDATABASE=plantdb

PORT=3001
JWT_SECRET=dev_secret_change_me
```

> Napomena: port baze može biti različit ako je promijenjen u `docker-compose.yml` (npr. 5433).

---

## Struktura projekta (sažetak)

* `db/` - SQL skripte (shema, okidači, seed, view/funkcije)
* `backend/src/` - Express API (routes, middleware, db)
* `frontend/` - UI (`index.html`, `styles.css`, `app.js`)
* `uploads/` - spremljene slike

---

## Brzi scenarij testiranja

1. Registriraj korisnika
2. Dodaj biljku
3. Dodaj događaj njege (npr. "zalijevanje")
4. Provjeri podsjetnike (ručni i automatski)
5. Uploadaj fotografiju
6. Dodaj temporalno stanje (interval "od-do") i provjeri povijest stanja
