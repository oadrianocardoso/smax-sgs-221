begin;

alter table public.smax_teams
  add column if not exists id_smax_grupo int;

commit;
