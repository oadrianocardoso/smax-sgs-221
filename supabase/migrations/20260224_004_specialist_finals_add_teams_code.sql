begin;

-- Add team code directly on finals table for easier auditing/reporting.
-- Expected shape: specialist_id, final, teams (plus internal team_id).

alter table public.smax_specialist_finals
  add column if not exists team_id bigint;

alter table public.smax_specialist_finals
  add column if not exists teams text;

update public.smax_specialist_finals sf
set
  team_id = s.team_id,
  teams = t.code
from public.smax_specialists s
join public.smax_teams t on t.id = s.team_id
where s.id = sf.specialist_id
  and (
    sf.team_id is distinct from s.team_id
    or sf.teams is distinct from t.code
  );

-- Cleanup invalid or duplicate rows before constraints
with ranked as (
  select
    ctid,
    row_number() over (
      partition by coalesce(teams, ''), final
      order by created_at desc nulls last, specialist_id desc
    ) as rn
  from public.smax_specialist_finals
)
delete from public.smax_specialist_finals f
using ranked r
where f.ctid = r.ctid
  and r.rn > 1;

delete from public.smax_specialist_finals
where team_id is null
   or teams is null
   or btrim(teams) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'smax_specialist_finals_team_fk'
  ) then
    alter table public.smax_specialist_finals
      add constraint smax_specialist_finals_team_fk
      foreign key (team_id)
      references public.smax_teams(id)
      on delete cascade;
  end if;
end;
$$;

alter table public.smax_specialist_finals
  alter column team_id set not null;

alter table public.smax_specialist_finals
  alter column teams set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'smax_specialist_finals_team_final_uniq'
  ) then
    alter table public.smax_specialist_finals
      add constraint smax_specialist_finals_team_final_uniq
      unique (team_id, final);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'smax_specialist_finals_teams_final_uniq'
  ) then
    alter table public.smax_specialist_finals
      add constraint smax_specialist_finals_teams_final_uniq
      unique (teams, final);
  end if;
end;
$$;

create index if not exists smax_specialist_finals_team_idx
  on public.smax_specialist_finals(team_id);

create index if not exists smax_specialist_finals_teams_idx
  on public.smax_specialist_finals(teams);

create or replace function public.smax_set_final_team_id()
returns trigger
language plpgsql
as $$
declare
  v_team_id bigint;
  v_team_code text;
begin
  select s.team_id, t.code
  into v_team_id, v_team_code
  from public.smax_specialists s
  join public.smax_teams t on t.id = s.team_id
  where s.id = new.specialist_id;

  if v_team_id is null then
    raise exception 'Especialista % inexistente para final %', new.specialist_id, new.final;
  end if;

  if new.team_id is null then
    new.team_id := v_team_id;
  elsif new.team_id <> v_team_id then
    raise exception 'team_id (%) diferente do team_id do especialista (%)', new.team_id, v_team_id;
  end if;

  if new.teams is null or btrim(new.teams) = '' then
    new.teams := v_team_code;
  elsif new.teams <> v_team_code then
    raise exception 'teams (%) diferente da equipe do especialista (%)', new.teams, v_team_code;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_smax_specialist_finals_set_team_id'
  ) then
    create trigger trg_smax_specialist_finals_set_team_id
    before insert or update on public.smax_specialist_finals
    for each row
    execute function public.smax_set_final_team_id();
  end if;
end;
$$;

commit;
