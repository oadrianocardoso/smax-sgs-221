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

  const info = await client.query('select current_database() as db, current_user as usr, now() as now');
  console.log(JSON.stringify(info.rows[0], null, 2));

  const tables = await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_name like 'smax_%' order by table_name");
  console.log('tables:', tables.rowCount);
  for (const row of tables.rows) console.log(row.table_name);

  await client.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
