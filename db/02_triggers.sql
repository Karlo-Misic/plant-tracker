CREATE OR REPLACE FUNCTION audit_write(_table text, _op text, _id text, _uid int, _details jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_log(tablica, operacija, zapis_id, korisnik_id, detalji)
  VALUES (_table, _op, _id, _uid, _details);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_event_auto_reminder()
RETURNS trigger AS $$
DECLARE
  v_uid int;
BEGIN
  SELECT b.korisnik_id INTO v_uid
  FROM biljka b
  WHERE b.biljka_id = NEW.biljka_id;

  IF lower(NEW.vrsta_dogadjaja) IN ('presađivanje','presadjivanje','repotting') THEN
    INSERT INTO podsjetnik(biljka_id, rok, vrsta_podsjetnika, status, izvor, dogadjaj_id)
    VALUES (NEW.biljka_id, NEW.vrijeme_dogadjaja + interval '7 days', 'kontrola_nakon_presađivanja', 'aktivan', 'automatski', NEW.dogadjaj_id);
  END IF;

  PERFORM audit_write('dogadjaj_njege','INSERT', NEW.dogadjaj_id::text, v_uid,
    jsonb_build_object('biljka_id',NEW.biljka_id,'vrsta',NEW.vrsta_dogadjaja,'vrijeme',NEW.vrijeme_dogadjaja,'opis',NEW.opis)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_event_auto_reminder ON dogadjaj_njege;
CREATE TRIGGER t_event_auto_reminder
AFTER INSERT ON dogadjaj_njege
FOR EACH ROW
EXECUTE FUNCTION trg_event_auto_reminder();

CREATE OR REPLACE FUNCTION trg_state_audit()
RETURNS trigger AS $$
DECLARE
  v_uid int;
BEGIN
  SELECT b.korisnik_id INTO v_uid
  FROM biljka b
  WHERE b.biljka_id = NEW.biljka_id;

  PERFORM audit_write('stanje_biljke','INSERT', NEW.stanje_id::text, v_uid,
    jsonb_build_object('biljka_id',NEW.biljka_id,'razdoblje',NEW.razdoblje_valjanosti::text,'visina_cm',NEW.visina_cm,'broj_listova',NEW.broj_listova,'ocjena_zdravlja',NEW.ocjena_zdravlja,'napomena',NEW.napomena)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_state_audit ON stanje_biljke;
CREATE TRIGGER t_state_audit
AFTER INSERT ON stanje_biljke
FOR EACH ROW
EXECUTE FUNCTION trg_state_audit();