CREATE OR REPLACE VIEW v_aktivni_podsjetnici AS
SELECT
  p.podsjetnik_id,
  p.biljka_id,
  b.korisnik_id,
  p.rok,
  p.vrsta_podsjetnika,
  p.status,
  p.izvor,
  p.dogadjaj_id,
  p.created_at,
  (p.rok < now()) AS kasni,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM (p.rok - now())) / 86400.0))::int AS dana_do_roka
FROM podsjetnik p
JOIN biljka b ON b.biljka_id = p.biljka_id
WHERE p.status = 'aktivan'
  AND p.rok <= now() + interval '7 days';