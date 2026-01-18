CREATE OR REPLACE FUNCTION stanje_na_datum(_biljka_id INT, _datum DATE)
RETURNS TABLE (
  stanje_id INT,
  biljka_id INT,
  razdoblje_valjanosti TSRANGE,
  visina_cm REAL,
  broj_listova INT,
  ocjena_zdravlja INT,
  napomena TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.stanje_id,
    s.biljka_id,
    s.razdoblje_valjanosti,
    s.visina_cm,
    s.broj_listova,
    s.ocjena_zdravlja,
    s.napomena
  FROM stanje_biljke s
  WHERE s.biljka_id = _biljka_id
    AND s.razdoblje_valjanosti @> (_datum::timestamp)
  ORDER BY lower(s.razdoblje_valjanosti) DESC
  LIMIT 1;
$$;