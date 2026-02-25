# Supabase setup (SMAX SGS 221)

## 1) Execute migration
Run these files in Supabase SQL Editor, in order:

- `supabase/migrations/20260224_001_smax_schema_and_seed.sql`
- `supabase/migrations/20260224_002_smax_auto_tag_rules.sql`
- `supabase/migrations/20260224_003_team_scoped_finals.sql`
- `supabase/migrations/20260224_004_specialist_finals_add_teams_code.sql`
- `supabase/migrations/20260224_005_add_id_smax_grupo_to_teams.sql`
- `supabase/migrations/20260224_006_add_smax_person_fields_to_specialists.sql`
- `supabase/migrations/20260224_007_seed_smax_automatizadores.sql`
- `supabase/migrations/20260224_008_restore_specialist_colors.sql`

It creates and seeds:

- `public.smax_teams`
- `public.smax_specialists`
- `public.smax_specialist_finals`
- `public.smax_highlight_groups`
- `public.smax_highlight_terms`
- `public.smax_detractors`
- `public.smax_feature_prefs`
- `public.smax_auto_tag_rules`
- `public.smax_automatizadores`

`20260224_003_team_scoped_finals.sql` enforces:

- finals are unique per team (`team_id + final`)
- same final can be reused in other teams

`20260224_004_specialist_finals_add_teams_code.sql` adds:

- `teams` column in `smax_specialist_finals` (team code)
- final shape for auditing: `specialist_id`, `final`, `teams`

`20260224_005_add_id_smax_grupo_to_teams.sql` adds:

- `id_smax_grupo` (`int`) in `smax_teams`

`20260224_006_add_smax_person_fields_to_specialists.sql` adds:

- `smax_person_id` (`bigint`) in `smax_specialists`
- `smax_location` (`text`) in `smax_specialists`
- `smax_person_name` (`text`) in `smax_specialists`

`20260224_007_seed_smax_automatizadores.sql`:

- adjusts `smax_automatizadores.matricula` to `integer`
- creates unique index by `matricula`
- seeds/updates `matricula`, `nome`, `lotacao` from `inserts_servidores.sql`

`20260224_008_restore_specialist_colors.sql`:

- restores specialist color palette (`bg_color`, `fg_color`) by name matching
- creates missing attendants in `SGS 2.2.1` when not found

## 2) Quick validation queries

```sql
select code, name, is_active
from public.smax_teams
order by code;
```

```sql
select t.code as team_code, s.name, s.nickname, s.bg_color, s.fg_color, s.is_absent, s.sort_order
from public.smax_specialists s
join public.smax_teams t on t.id = s.team_id
order by t.code, s.sort_order, s.name;
```

```sql
select s.name, array_agg(f.final order by f.final) as finals
from public.smax_specialists s
join public.smax_specialist_finals f on f.specialist_id = s.id
join public.smax_teams t on t.id = s.team_id
where t.code = 'SGS 2.2.1'
group by s.name
order by s.name;
```

```sql
select t.code as team_code, f.final, count(*) as qty
from public.smax_specialist_finals f
join public.smax_teams t on t.id = f.team_id
group by t.code, f.final
having count(*) > 1
order by t.code, f.final;
```

```sql
select f.specialist_id, f.final, f.teams
from public.smax_specialist_finals f
order by f.teams, f.final, f.specialist_id;
```

```sql
select g.group_key, g.css_class, t.match_type, t.term, t.regex_flags, t.sort_order
from public.smax_highlight_terms t
join public.smax_highlight_groups g on g.id = t.group_id
order by g.sort_order, t.match_type, t.sort_order;
```

```sql
select full_name, sort_order
from public.smax_detractors
order by sort_order;
```

```sql
select tag_label, keywords, sort_order
from public.smax_auto_tag_rules
where is_active = true
order by sort_order;
```
