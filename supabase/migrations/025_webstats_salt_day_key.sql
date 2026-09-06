-- Salt minting had a race that corrupts visitor identity.
--
-- 022 let any request that found no current salt mint one. Concurrent beacons
-- each read the empty (or expired) table, each inserted, and each hashed with
-- the salt it had just created — so one visitor arriving on three parallel
-- requests became three visitors. Observed in the first smoke test: three
-- salts written inside 80ms.
--
-- It is not only a cold-start problem. At every rotation boundary, every
-- in-flight request sees an expired salt and mints its own, fragmenting that
-- window's visitor counts. Application-level "check then insert" cannot fix
-- this; the constraint has to be in the database.
--
-- Keying a salt to its UTC day and making that unique means concurrent inserts
-- collapse to one winner and the losers read back the winner's row. It also
-- makes rotation exactly daily, which is what Plausible does and what the
-- anonymity argument in identity.ts assumes.

-- Existing rows are smoke-test data, but dedupe rather than truncate so this
-- is safe to run against a database that has real traffic.
delete from public.webstats_salts a
using public.webstats_salts b
where a.created_at > b.created_at
  and date_trunc('day', a.created_at at time zone 'utc')
    = date_trunc('day', b.created_at at time zone 'utc');

alter table public.webstats_salts
  add column if not exists day date;

update public.webstats_salts
set day = (created_at at time zone 'utc')::date
where day is null;

alter table public.webstats_salts
  alter column day set not null,
  alter column day set default (now() at time zone 'utc')::date;

create unique index if not exists webstats_salts_day
  on public.webstats_salts (day);
