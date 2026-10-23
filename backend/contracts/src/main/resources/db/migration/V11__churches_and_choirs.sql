-- Churches, choirs and ministries — RFC 0009 (contracts/rfcs/0009-churches-and-choirs.md). Every
-- profile is still an artist; it now says what kind, which church it belongs to, and where that
-- church sits in the Kenyan church's structure.

-- ---------------------------------------------------------------------------
-- The structure the church itself uses in Kenya: East-Central Africa Division → two union
-- conferences → the conferences and fields under them. From the SDA Church in Kenya directory
-- (Oct 2026), which took it from the unions' own pages and the Adventist Yearbook. A NULL
-- headquarters or website is one the directory could not confirm.
-- ---------------------------------------------------------------------------

CREATE TABLE conferences (
    id           TEXT    PRIMARY KEY,
    name         TEXT    NOT NULL UNIQUE,
    short_name   TEXT,
    kind         TEXT    NOT NULL CHECK (kind IN ('division', 'union', 'conference', 'field')),
    parent_id    TEXT    REFERENCES conferences (id),
    headquarters TEXT,
    website      TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    -- Only the division stands alone; every union is in it, every conference or field in a union.
    CONSTRAINT conferences_parent_by_kind CHECK ((kind = 'division') = (parent_id IS NULL))
);

INSERT INTO conferences (id, name, short_name, kind, parent_id, headquarters, website, sort_order) VALUES
    ('ecd',  'East-Central Africa Division',      'ECD',  'division',   NULL,   'Advent Hill, Mbagathi, Nairobi', 'https://ecd.adventist.org', 0),
    ('ekuc', 'East Kenya Union Conference',       'EKUC', 'union',      'ecd',  'Jakaya Kikwete Road, Nairobi',   'https://eku.adventist.org', 1),
    ('wkuc', 'West Kenya Union Conference',       'WKUC', 'union',      'ecd',  'Kanyakwar, off Kakamega Road, Kisumu', NULL,              2),
    -- East Kenya Union: 4 conferences, 7 fields
    ('ckc',  'Central Kenya Conference',          'CKC',  'conference', 'ekuc', 'Karura, Red Hill Road, Nairobi', 'https://ckc.adventist.or.ke', 10),
    ('crvc', 'Central Rift Valley Conference',    'CRVC', 'conference', 'ekuc', 'Nakuru',                         'https://centralriftvalleyconference.org', 11),
    ('nc',   'Nyamira Conference',                'NC',   'conference', 'ekuc', 'Nyamira',                        NULL, 12),
    ('skc',  'South Kenya Conference',            'SKC',  'conference', 'ekuc', 'Kisii',                          NULL, 13),
    ('enf',  'East Nairobi Field',                'ENF',  'field',      'ekuc', 'Syokimau, Machakos County',      NULL, 14),
    ('kcf',  'Kenya Coast Field',                 'KCF',  'field',      'ekuc', 'Coast region',                   'https://kcf.adventist.or.ke', 15),
    ('nekf', 'North East Kenya Field',            'NEKF', 'field',      'ekuc', 'Meru',                           'https://nef.adventist.or.ke', 16),
    ('nwf',  'Nyamira West Field',                'NWF',  'field',      'ekuc', NULL,                             NULL, 17),
    ('sekf', 'South East Kenya Field',            'SEKF', 'field',      'ekuc', NULL,                             NULL, 18),
    ('snkf', 'South Nairobi Kajiado Field',       'SNKF', 'field',      'ekuc', NULL,                             NULL, 19),
    ('srvf', 'South Rift Valley Field',           'SRVF', 'field',      'ekuc', NULL,                             NULL, 20),
    -- West Kenya Union: 5 conferences, 7 fields
    ('cnc',  'Central Nyanza Conference',         'CNC',  'conference', 'wkuc', 'Kisumu',                         'https://cncadventist.org', 30),
    ('grvc', 'Greater Rift Valley Conference',    'GRVC', 'conference', 'wkuc', 'Eldoret',                        NULL, 31),
    ('klc',  'Kenya Lake Conference',             'KLC',  'conference', 'wkuc', 'Kendu Bay',                      'https://klc.adventistafrica.org', 32),
    ('rc',   'Ranen Conference',                  'RC',   'conference', 'wkuc', 'Sare-Awendo, Migori',            'https://rcadventist.org', 33),
    ('wkc',  'Western Kenya Conference',          'WKC',  'conference', 'wkuc', 'Webuye',                         NULL, 34),
    ('lvf',  'Lake Victoria Field',               'LVF',  'field',      'wkuc', 'Homa Bay',                       'https://lvfadventist.org', 35),
    ('nrvf', 'North Rift Valley Field',           'NRVF', 'field',      'wkuc', 'Kitale',                         NULL, 36),
    ('nwnf', 'North-West Nyanza Field',           'NWNF', 'field',      'wkuc', NULL,                             NULL, 37),
    ('senf', 'South East Nyanza Field',           'SENF', 'field',      'wkuc', NULL,                             NULL, 38),
    ('swnf', 'South West Nyanza Field',           'SWNF', 'field',      'wkuc', NULL,                             NULL, 39),
    ('sklf', 'Southern Kenya Lake Field',         'SKLF', 'field',      'wkuc', 'Oyugis',                         'https://skl.adventistafrica.org', 40),
    ('wrvf', 'West Rift Valley Field',            'WRVF', 'field',      'wkuc', 'Kapsabet',                       NULL, 41);

-- ---------------------------------------------------------------------------
-- What a profile is. church_id keeps its meaning — the contributor that holds the rights — and
-- home_church_id is new: the church profile a choir, group or preacher belongs to. NULL there is
-- what "independent" means.
-- ---------------------------------------------------------------------------

ALTER TABLE artists
    ADD COLUMN kind           TEXT NOT NULL DEFAULT 'choir',
    ADD COLUMN ensemble       TEXT,
    ADD COLUMN home_church_id UUID REFERENCES artists (id) ON DELETE SET NULL,
    ADD COLUMN conference_id  TEXT REFERENCES conferences (id) ON DELETE SET NULL,
    ADD COLUMN location       TEXT,
    ADD CONSTRAINT artists_kind_check
        CHECK (kind IN ('church', 'choir', 'group', 'soloist', 'preacher', 'ministry')),
    ADD CONSTRAINT artists_ensemble_check
        CHECK (ensemble IN ('main', 'youth', 'children', 'women', 'men', 'other')),
    ADD CONSTRAINT artists_ensemble_only_choirs CHECK (ensemble IS NULL OR kind = 'choir'),
    ADD CONSTRAINT artists_church_has_no_home CHECK (kind <> 'church' OR home_church_id IS NULL),
    ADD CONSTRAINT artists_not_own_home CHECK (home_church_id IS DISTINCT FROM id);

CREATE INDEX artists_home_church_idx ON artists (home_church_id);
CREATE INDEX artists_kind_idx ON artists (kind);

-- A home is a church profile, and stays one while anything calls it home. A CHECK cannot look at
-- another row, so this is a trigger, like the publication gate in V1.
CREATE OR REPLACE FUNCTION enforce_home_church_is_a_church()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.home_church_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM artists WHERE id = NEW.home_church_id AND kind = 'church') THEN
        RAISE EXCEPTION
            'artist % cannot belong to %: that is not a church profile', NEW.id, NEW.home_church_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.kind = 'church' AND NEW.kind <> 'church'
       AND EXISTS (SELECT 1 FROM artists WHERE home_church_id = NEW.id) THEN
        RAISE EXCEPTION
            'artist % is home to other profiles and must stay a church', NEW.id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artists_home_church_gate
    BEFORE INSERT OR UPDATE OF home_church_id, kind ON artists
    FOR EACH ROW EXECUTE FUNCTION enforce_home_church_is_a_church();

-- ---------------------------------------------------------------------------
-- Existing profiles: a best reading of each name and its recordings. Editors correct any of them
-- in the admin portal (Artists → the profile).
-- ---------------------------------------------------------------------------

UPDATE artists a SET kind = CASE
    WHEN a.name ~* '^(pastor|pr\.?|elder|evangelist|rev\.?|dr\.?)\s' THEN 'preacher'
    WHEN a.name ~* '\m(choir|chorale|chorus|singers|youth)\M' THEN 'choir'
    WHEN a.name ~* '\m(church|cathedral|fellowship)\M'
         AND a.name !~* '\m(worship team|praise|band)\M' THEN 'church'
    WHEN NOT EXISTS (SELECT 1 FROM media_items m WHERE m.artist_id = a.id AND m.media_type = 'song')
         AND EXISTS (SELECT 1 FROM media_items m WHERE m.artist_id = a.id AND m.media_type = 'sermon') THEN 'preacher'
    WHEN NOT EXISTS (SELECT 1 FROM media_items m WHERE m.artist_id = a.id AND m.media_type <> 'podcast')
         AND EXISTS (SELECT 1 FROM media_items m WHERE m.artist_id = a.id) THEN 'ministry'
    ELSE 'group'
END;

UPDATE artists SET ensemble = CASE
    WHEN name ~* '\m(youth|young)\M' THEN 'youth'
    WHEN name ~* '\m(children|kids|junior|pathfinders?|adventurers?)\M' THEN 'children'
    WHEN name ~* '\m(women|ladies|dorcas)\M' THEN 'women'
    WHEN name ~* '\m(men''s|male voice|brothers)\M' THEN 'men'
    ELSE 'main'
END
WHERE kind = 'choir';

-- Development seed covers (picsum.photos) were never pictures of anyone. Without one, a profile
-- now shows the gospel placeholder for its kind (catalog Covers, advent-wave/public/covers/).
UPDATE artists SET cover_url = NULL WHERE cover_url LIKE 'https://picsum.photos/%';
