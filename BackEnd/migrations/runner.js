const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const MIGRATIONS_DIR = __dirname;

// Migrations numbered below this existed before this automated runner and
// were already applied by hand in production, or are already reflected in
// BackEnd/templates/tenant_schema.sql for a fresh local bootstrap. They're
// backfilled into schema_migrations as already-satisfied on the runner's
// first-ever boot, never re-executed. Only migrations >= this number go
// through the live execute-and-track path below. Permanent one-time cutover
// value — never bump it for future migrations.
const HISTORICAL_CUTOFF = 66;

function listMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && /^\d/.test(f))
    .map((filename) => ({
      filename,
      number: parseInt(filename.match(/^(\d+)/)[1], 10),
      path: path.join(MIGRATIONS_DIR, filename),
    }))
    .sort((a, b) => a.number - b.number || a.filename.localeCompare(b.filename));
}

// Content-based classification — same convention Database/apply-migrations.sh
// already relies on for the {schema_name}/{schema} placeholders, plus
// detecting the newer self-contained "loop over public.companies" style
// (e.g. BackEnd/migrations/61_product_price_levels.sql).
function classify(sql) {
  if (/\{schema_name\}|\{schema\}/.test(sql)) return 'legacy-per-tenant';
  if (/DO\s+\$\$[\s\S]*FROM\s+public\.companies/i.test(sql)) return 'self-contained-per-tenant';
  return 'public-only';
}

async function ensureTrackingTable() {
  const existsRes = await db.query(`SELECT to_regclass('public.schema_migrations') AS reg`);
  const firstBoot = existsRes.rows[0].reg === null;
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id                SERIAL PRIMARY KEY,
      schema_name       VARCHAR(100) NOT NULL,
      migration_number  INTEGER      NOT NULL,
      filename          VARCHAR(255) NOT NULL,
      applied_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_schema_migrations UNIQUE (schema_name, migration_number)
    )
  `);
  return { firstBoot };
}

async function getCompanies() {
  const res = await db.query(
    `SELECT id, schema_name FROM public.companies WHERE schema_name IS NOT NULL AND schema_name != 'public'`
  );
  return res.rows;
}

async function markApplied(schemaName, number, filename) {
  await db.query(
    `INSERT INTO public.schema_migrations (schema_name, migration_number, filename)
     VALUES ($1, $2, $3) ON CONFLICT (schema_name, migration_number) DO NOTHING`,
    [schemaName, number, filename]
  );
}

// First-ever boot only: record every pre-cutoff migration as already
// satisfied for every current schema, without executing any of them —
// they're already reflected in the live database (production: applied by
// hand historically; local: baked into tenant_schema.sql at bootstrap).
async function backfillHistorical(files, companies) {
  const historical = files.filter((f) => f.number < HISTORICAL_CUTOFF);
  for (const file of historical) {
    const sql = fs.readFileSync(file.path, 'utf8');
    const kind = classify(sql);
    const schemaNames = kind === 'public-only' ? ['public'] : companies.map((c) => c.schema_name);
    for (const schemaName of schemaNames) {
      await markApplied(schemaName, file.number, file.filename);
    }
  }
}

async function loadAppliedSet() {
  const res = await db.query(`SELECT schema_name, migration_number FROM public.schema_migrations`);
  return new Set(res.rows.map((r) => `${r.schema_name}::${r.migration_number}`));
}

function substitute(sql, schemaName, companyId) {
  return sql
    .replace(/\{schema_name\}/g, schemaName)
    .replace(/\{schema\}/g, schemaName)
    .replace(/\{company_id\}/g, companyId != null ? String(companyId) : '');
}

// Runs the whole file as one transaction — atomic per migration (or per
// migration-per-company for legacy files): either it's fully applied or
// left exactly as it was, logged, and retried on the next boot.
async function runOne(sql, label) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[migrations] FAILED ${label} — will retry next boot: ${err.message}`);
    return false;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  const { firstBoot } = await ensureTrackingTable();
  const files = listMigrationFiles();
  const companies = await getCompanies();

  if (firstBoot) {
    console.log('[migrations] first boot with tracking — backfilling historical migrations as already-applied');
    await backfillHistorical(files, companies);
  }

  const applied = await loadAppliedSet();
  let appliedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const file of files.filter((f) => f.number >= HISTORICAL_CUTOFF)) {
    const sql = fs.readFileSync(file.path, 'utf8');
    const kind = classify(sql);

    if (kind === 'public-only') {
      if (applied.has(`public::${file.number}`)) { skippedCount++; continue; }
      const ok = await runOne(sql, `${file.filename} (public)`);
      if (ok) { await markApplied('public', file.number, file.filename); appliedCount++; }
      else failedCount++;
      continue;
    }

    if (kind === 'self-contained-per-tenant') {
      const missing = companies.filter((c) => !applied.has(`${c.schema_name}::${file.number}`));
      if (missing.length === 0) { skippedCount++; continue; }
      const ok = await runOne(sql, `${file.filename} (all tenants)`);
      if (ok) {
        for (const c of companies) await markApplied(c.schema_name, file.number, file.filename);
        appliedCount++;
      } else {
        failedCount++;
      }
      continue;
    }

    // legacy-per-tenant: substituted and executed once per company
    let fileHadWork = false;
    for (const c of companies) {
      if (applied.has(`${c.schema_name}::${file.number}`)) continue;
      fileHadWork = true;
      const companySql = substitute(sql, c.schema_name, c.id);
      const ok = await runOne(companySql, `${file.filename} (${c.schema_name})`);
      if (ok) { await markApplied(c.schema_name, file.number, file.filename); appliedCount++; }
      else failedCount++;
    }
    if (!fileHadWork) skippedCount++;
  }

  console.log(`[migrations] done — applied: ${appliedCount}, skipped: ${skippedCount}, failed (will retry): ${failedCount}`);
}

module.exports = { runMigrations, listMigrationFiles, classify, HISTORICAL_CUTOFF };
