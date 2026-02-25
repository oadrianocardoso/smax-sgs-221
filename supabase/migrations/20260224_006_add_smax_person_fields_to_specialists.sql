begin;

alter table public.smax_specialists
  add column if not exists smax_person_id bigint;

alter table public.smax_specialists
  add column if not exists smax_location text;

alter table public.smax_specialists
  add column if not exists smax_person_name text;

create unique index if not exists smax_specialists_team_person_uniq_idx
  on public.smax_specialists(team_id, smax_person_id)
  where smax_person_id is not null;

commit;
