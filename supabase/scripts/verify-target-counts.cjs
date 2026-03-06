const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: '187.77.232.228',
    port: 5433,
    user: 'admin',
    password: 'postmax',
    database: 'sgs-smax',
    ssl: false
  });
  await client.connect();

  const tables = [
    'smax_teams',
    'smax_specialists',
    'smax_specialist_finals',
    'smax_specialist_highlight_terms',
    'smax_specialist_tags',
    'smax_specialist_tag_keywords',
    'smax_highlight_groups',
    'smax_detractors',
    'smax_feature_prefs',
    'smax_automatizadores'
  ];

  for (const t of tables) {
    const r = await client.query(`select count(*)::int as c from public."${t}"`);
    console.log(`${t}: ${r.rows[0].c}`);
  }

  const check = await client.query(`
    select t.code as team_code, count(*)::int as specialists
    from public.smax_specialists s
    join public.smax_teams t on t.id = s.team_id
    group by t.code
    order by t.code
  `);
  console.log('specialists_per_team:', JSON.stringify(check.rows));

  await client.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
