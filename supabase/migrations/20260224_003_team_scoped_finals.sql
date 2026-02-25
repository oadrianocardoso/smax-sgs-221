begin;

-- Finals now belong to a team context.
-- This allows the same final number to exist in multiple teams,
-- while keeping each final unique inside each team.

alter table public.smax_specialist_finals
  add column if not exists team_id bigint;

update public.smax_specialist_finals sf
set team_id = s.team_id
from public.smax_specialists s
where s.id = sf.specialist_id
  and (sf.team_id is null or sf.team_id <> s.team_id);

-- Safety cleanup before uniqueness constraints
with ranked as (
  select
    ctid,
    row_number() over (
      partition by team_id, final
      order by created_at desc nulls last, specialist_id desc
    ) as rn
  from public.smax_specialist_finals
  where team_id is not null
)
delete from public.smax_specialist_finals f
using ranked r
where f.ctid = r.ctid
  and r.rn > 1;

delete from public.smax_specialist_finals
where team_id is null;

alter table public.smax_specialist_finals
  alter column team_id set not null;

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

create or replace function public.smax_set_final_team_id()
returns trigger
language plpgsql
as $$
declare
  v_team_id bigint;
begin
  select s.team_id
  into v_team_id
  from public.smax_specialists s
  where s.id = new.specialist_id;

  if v_team_id is null then
    raise exception 'Especialista % inexistente para final %', new.specialist_id, new.final;
  end if;

  if new.team_id is null then
    new.team_id := v_team_id;
  elsif new.team_id <> v_team_id then
    raise exception 'team_id (%) diferente do team_id do especialista (%)', new.team_id, v_team_id;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'trg_smax_specialist_finals_set_team_id'
  ) then
    drop trigger trg_smax_specialist_finals_set_team_id on public.smax_specialist_finals;
  end if;

  create trigger trg_smax_specialist_finals_set_team_id
  before insert or update on public.smax_specialist_finals
  for each row
  execute function public.smax_set_final_team_id();
end;
$$;

create index if not exists smax_specialist_finals_team_idx
  on public.smax_specialist_finals(team_id);

commit;
