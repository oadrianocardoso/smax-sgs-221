begin;

with palette(name_key, insert_name, bg, fg) as (
  values
  ('ADRIANO',          'ADRIANO',          '#E6E66A', '#000'),
  ('DANIEL LEAL',      'DANIEL LEAL',      '#E6A85C', '#000'),
  ('DOUGLAS MACHADO',  'DOUGLAS MACHADO',  '#66CCCC', '#000'),
  ('DOUGLAS SUGAHARA', 'DOUGLAS SUGAHARA', '#4FA6A6', '#fff'),
  ('IONE',             'IONE',             '#4D4D4D', '#fff'),
  ('ISA',              'ISA',              '#5C6FA6', '#fff'),
  ('IVAN',             'IVAN',             '#9A9A52', '#000'),
  ('LAIS AKEMI',       'LAIS AKEMI',       '#D966D9', '#000'),
  ('LAIS MARTINS',     'LAIS MARTINS',     '#B85CB8', '#fff'),
  ('LEONARDO',         'LEONARDO',         '#8E5A8E', '#fff'),
  ('LUANA',            'LUANA',            '#7ACC7A', '#000'),
  ('LUIS FELIPE',      'LUIS FELIPE',      '#5CA3A3', '#000'),
  ('MARCELO',          'MARCELO',          '#A05252', '#fff'),
  ('MARLON',           'MARLON',           '#A0A0A0', '#000'),
  ('ROBSON',           'ROBSON',           '#CCCCCC', '#000'),
  ('RODRIGO',          'RODRIGO',          '#999999', '#000'),
  ('SAMUEL',           'SAMUEL',           '#66A3CC', '#000'),
  ('YVES',             'YVES',             '#2F4F8F', '#fff')
),
tokens as (
  select
    name_key,
    insert_name,
    bg,
    fg,
    regexp_split_to_array(upper(name_key), '\s+') as toks
  from palette
),
matches as (
  select
    s.id,
    tk.name_key,
    row_number() over (
      partition by s.id
      order by cardinality(tk.toks) desc, tk.name_key
    ) as rn
  from public.smax_specialists s
  join public.smax_teams t on t.id = s.team_id
  join tokens tk on (
    select bool_and(upper(s.name) like '%' || tok || '%')
    from unnest(tk.toks) tok
  )
  where t.is_active = true
),
updated as (
  update public.smax_specialists s
  set
    bg_color = tk.bg,
    fg_color = tk.fg
  from matches m
  join tokens tk on tk.name_key = m.name_key
  where s.id = m.id
    and m.rn = 1
  returning s.id
),
missing as (
  select tk.*
  from tokens tk
  where not exists (
    select 1
    from matches m
    where m.name_key = tk.name_key
      and m.rn = 1
  )
),
target_team as (
  select id as team_id
  from public.smax_teams
  where code = 'SGS 2.2.1'
  limit 1
),
base_sort as (
  select coalesce(max(s.sort_order), 0) as max_sort
  from public.smax_specialists s
  join target_team tt on tt.team_id = s.team_id
)
insert into public.smax_specialists (
  team_id,
  name,
  nickname,
  bg_color,
  fg_color,
  is_absent,
  sort_order
)
select
  tt.team_id,
  m.insert_name,
  '',
  m.bg,
  m.fg,
  false,
  bs.max_sort + row_number() over (order by m.name_key)
from missing m
cross join target_team tt
cross join base_sort bs;

commit;
