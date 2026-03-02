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
- `supabase/migrations/20260302_010_add_specialist_scoped_rules.sql`
- `supabase/migrations/20260302_011_normalize_specialist_tags.sql`

It creates and seeds:

- `public.smax_teams`
- `public.smax_specialists`
- `public.smax_specialist_finals`
- `public.smax_specialist_highlight_terms`
- `public.smax_specialist_tags`
- `public.smax_specialist_tag_keywords`
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

`20260302_010_add_specialist_scoped_rules.sql`:

- creates `smax_specialist_highlight_terms` (highlight terms by specialist)
- creates legacy `smax_specialist_tag_rules` (tags by specialist with `keywords` in an array)
- migrates from legacy `smax_attendant_*` tables when they already exist
- otherwise seeds from the current global rules
- this migration is transitional for specialist-scoped rules

`20260302_011_normalize_specialist_tags.sql`:

- creates `smax_specialist_tags` (`1 specialist -> N tags`)
- creates `smax_specialist_tag_keywords` (`1 tag -> N keywords`)
- migrates data from `smax_specialist_tag_rules` when it already exists
- otherwise seeds from the current global rules
- this is the current model used by the script for tags

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
select t.code as team_code, s.name, g.group_key, h.match_type, h.term, h.sort_order
from public.smax_specialist_highlight_terms h
join public.smax_specialists s on s.id = h.specialist_id
join public.smax_teams t on t.id = s.team_id
join public.smax_highlight_groups g on g.id = h.group_id
order by t.code, s.name, g.sort_order, h.match_type, h.sort_order;
```

```sql
select full_name, sort_order
from public.smax_detractors
order by sort_order;
```

```sql
select t.code as team_code, s.name, st.tag_label, kw.keyword, st.sort_order, kw.sort_order
from public.smax_specialist_tags st
join public.smax_specialists s on s.id = st.specialist_id
join public.smax_teams t on t.id = s.team_id
left join public.smax_specialist_tag_keywords kw on kw.specialist_tag_id = st.id and kw.is_active = true
where st.is_active = true
order by t.code, s.name, st.sort_order, kw.sort_order;
```
