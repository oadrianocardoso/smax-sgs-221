const { Client } = require('pg');

async function check(port, db) {
  const c = new Client({ host: '187.77.232.228', port, user: 'admin', password: 'postmax', database: db, ssl: false });
  await c.connect();
  const t = await c.query("select count(*)::int as c from information_schema.tables where table_schema='public' and table_name like 'smax_%'");
  const names = await c.query("select table_name from information_schema.tables where table_schema='public' and table_name like 'smax_%' order by table_name");
  await c.end();
  return { port, db, count: t.rows[0].c, names: names.rows.map(r=>r.table_name) };
}

(async () => {
  const dbs = ['postgres', 'sgs-smax', 'sgs_bi', 'postgres-bi'];
  for (const port of [5432, 5433]) {
    for (const db of dbs) {
      try {
        const r = await check(port, db);
        console.log(JSON.stringify(r));
      } catch (e) {
        console.log(JSON.stringify({ port, db, error: e.message }));
      }
    }
  }
})().catch((e)=>{ console.error(e); process.exit(1); });
