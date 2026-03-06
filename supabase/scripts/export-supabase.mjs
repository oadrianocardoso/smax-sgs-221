import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_URL = 'https://hzjlgwuorhexkzcoxmay.supabase.co';
const DEFAULT_TABLES = [
  'smax_teams',
  'smax_specialists',
  'smax_specialist_finals',
  'smax_specialist_highlight_terms',
  'smax_specialist_tags',
  'smax_specialist_tag_keywords',
  'smax_highlight_groups',
  'smax_detractors',
  'smax_feature_prefs',
  'smax_automatizadores',
  'smax_highlight_terms',
  'smax_auto_tag_rules',
  'smax_specialist_tag_rules',
  'smax_attendant_highlight_terms',
  'smax_attendant_tag_rules',
  'smax_attendants'
];

const baseUrl = String(process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/+$/, '');
const apiKey = String(process.env.SUPABASE_KEY || '').trim();
const pageSize = Number(process.env.PAGE_SIZE || 1000);
const outDir = process.env.OUT_DIR || path.resolve('supabase', 'export', `snapshot-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}`);
const tables = (process.env.TABLES ? process.env.TABLES.split(',') : DEFAULT_TABLES)
  .map((v) => v.trim())
  .filter(Boolean);

if (!apiKey) {
  console.error('SUPABASE_KEY ausente. Defina a variavel de ambiente e tente novamente.');
  process.exit(1);
}

const headers = {
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`
};

async function fetchJson(url, extra = {}) {
  const res = await fetch(url, {
    method: extra.method || 'GET',
    headers: {
      ...headers,
      ...(extra.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { res, data, text };
}

async function tryExportOpenApi() {
  const url = `${baseUrl}/rest/v1/`;
  const { res, data, text } = await fetchJson(url, {
    headers: { Accept: 'application/openapi+json' }
  });

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof data === 'object' && data ? data : { message: text }
    };
  }

  if (!data || typeof data !== 'object' || !data.paths) {
    return {
      ok: false,
      status: res.status,
      error: { message: 'Resposta sem documento OpenAPI.' }
    };
  }

  return { ok: true, status: res.status, openapi: data };
}

function parseContentRange(headerValue) {
  if (!headerValue) return null;
  const m = String(headerValue).match(/\/(\d+)$/);
  if (!m) return null;
  return Number(m[1]);
}

async function fetchTableCount(table) {
  const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`;
  const { res, data, text } = await fetchJson(url, {
    headers: { Prefer: 'count=exact' }
  });

  if (res.status === 404) {
    return { exists: false, count: 0 };
  }
  if (!res.ok) {
    return {
      exists: true,
      error: {
        status: res.status,
        body: typeof data === 'object' && data ? data : text
      }
    };
  }

  const count = parseContentRange(res.headers.get('content-range'));
  return { exists: true, count: Number.isFinite(count) ? count : null };
}

async function fetchAllRows(table) {
  const rows = [];
  const columns = new Set();
  let offset = 0;

  while (true) {
    const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=${pageSize}&offset=${offset}`;
    const { res, data, text } = await fetchJson(url);

    if (res.status === 404) {
      return { exists: false, rows: [], columns: [] };
    }

    if (!res.ok) {
      return {
        exists: true,
        error: {
          status: res.status,
          body: typeof data === 'object' && data ? data : text
        },
        rows,
        columns: Array.from(columns)
      };
    }

    const batch = Array.isArray(data) ? data : [];
    for (const row of batch) {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => columns.add(k));
      }
    }
    rows.push(...batch);

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return { exists: true, rows, columns: Array.from(columns).sort() };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(path.join(outDir, 'content'), { recursive: true });

  const startedAt = new Date().toISOString();
  const manifest = {
    source: baseUrl,
    startedAt,
    pageSize,
    tables,
    structure: {},
    content: {}
  };

  const openapiResult = await tryExportOpenApi();
  if (openapiResult.ok) {
    manifest.structure.openapi = {
      status: openapiResult.status,
      exported: true,
      path: 'structure.openapi.json'
    };
    await fs.writeFile(
      path.join(outDir, 'structure.openapi.json'),
      JSON.stringify(openapiResult.openapi, null, 2),
      'utf8'
    );
  } else {
    manifest.structure.openapi = {
      status: openapiResult.status,
      exported: false,
      error: openapiResult.error
    };
  }

  const inferred = {};

  for (const table of tables) {
    const countInfo = await fetchTableCount(table);

    if (!countInfo.exists) {
      manifest.content[table] = { exists: false, exported: false, reason: 'Tabela nao encontrada' };
      inferred[table] = { exists: false, columns: [] };
      continue;
    }

    if (countInfo.error) {
      manifest.content[table] = {
        exists: true,
        exported: false,
        reason: 'Falha ao consultar contagem',
        error: countInfo.error
      };
      inferred[table] = { exists: true, columns: [], error: countInfo.error };
      continue;
    }

    const rowsInfo = await fetchAllRows(table);
    if (!rowsInfo.exists) {
      manifest.content[table] = { exists: false, exported: false, reason: 'Tabela nao encontrada' };
      inferred[table] = { exists: false, columns: [] };
      continue;
    }

    if (rowsInfo.error) {
      manifest.content[table] = {
        exists: true,
        exported: false,
        reason: 'Falha ao exportar linhas',
        error: rowsInfo.error,
        fetchedRows: rowsInfo.rows.length,
        expectedCount: countInfo.count
      };
      inferred[table] = { exists: true, columns: rowsInfo.columns, error: rowsInfo.error };
      continue;
    }

    const fileName = `content/${table}.json`;
    await fs.writeFile(path.join(outDir, fileName), JSON.stringify(rowsInfo.rows, null, 2), 'utf8');

    manifest.content[table] = {
      exists: true,
      exported: true,
      file: fileName,
      rows: rowsInfo.rows.length,
      reportedCount: countInfo.count
    };

    inferred[table] = {
      exists: true,
      columns: rowsInfo.columns,
      rows: rowsInfo.rows.length
    };
  }

  manifest.structure.inferred = {
    exported: true,
    path: 'structure.inferred.json'
  };
  manifest.finishedAt = new Date().toISOString();

  await fs.writeFile(path.join(outDir, 'structure.inferred.json'), JSON.stringify(inferred, null, 2), 'utf8');
  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const lines = [];
  lines.push(`# Supabase Export`);
  lines.push(``);
  lines.push(`- Source: ${manifest.source}`);
  lines.push(`- Started at: ${manifest.startedAt}`);
  lines.push(`- Finished at: ${manifest.finishedAt}`);
  lines.push(`- Page size: ${manifest.pageSize}`);
  lines.push(``);
  lines.push(`## Structure`);
  lines.push(`- OpenAPI exported: ${manifest.structure.openapi.exported ? 'yes' : 'no'}`);
  if (!manifest.structure.openapi.exported) {
    lines.push(`- OpenAPI error: ${JSON.stringify(manifest.structure.openapi.error)}`);
  }
  lines.push(`- Inferred structure: structure.inferred.json`);
  lines.push(``);
  lines.push(`## Content`);
  for (const table of tables) {
    const item = manifest.content[table];
    if (!item) continue;
    if (!item.exists) {
      lines.push(`- ${table}: not found`);
      continue;
    }
    if (!item.exported) {
      lines.push(`- ${table}: export failed (${item.reason})`);
      continue;
    }
    lines.push(`- ${table}: ${item.rows} rows -> ${item.file}`);
  }

  await fs.writeFile(path.join(outDir, 'README.md'), lines.join('\n'), 'utf8');

  console.log(`Export concluido em: ${outDir}`);
  console.log(`OpenAPI exported: ${manifest.structure.openapi.exported}`);
  for (const table of tables) {
    const item = manifest.content[table];
    if (!item) continue;
    if (item.exported) {
      console.log(`${table}: ${item.rows} rows`);
    } else if (!item.exists) {
      console.log(`${table}: not found`);
    } else {
      console.log(`${table}: failed (${item.reason})`);
    }
  }
}

main().catch((err) => {
  console.error('Falha na exportacao:', err);
  process.exit(1);
});
