/**
 * export-contract.ts
 *
 * Exports the frontend report registry as a machine-readable JSON artifact.
 * PHP integration tests (FrontendRegistryAuditTest) consume this file to
 * validate that the frontend registry matches the backend contract.
 *
 * Usage: npx tsx scripts/export-contract.ts
 * Output: contract/registry.json
 *
 * This script MUST be run whenever reportRegistry.ts is modified.
 * The generated file should be committed to version control.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPORT_REGISTRY } from '../src/config/reportRegistry';

// ── ESM path resolution ──────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Build the export artifact ─────────────────────────────────
interface RegistryExport {
  version: string;
  generatedAt: string;
  sourceFile: string;
  reportCount: number;
  reports: typeof REPORT_REGISTRY;
}

const artifact: RegistryExport = {
  version: '1.0',
  generatedAt: new Date().toISOString(),
  sourceFile: 'src/config/reportRegistry.ts',
  reportCount: REPORT_REGISTRY.length,
  reports: REPORT_REGISTRY,
};

// ── Validate before writing ───────────────────────────────────
function validate(registry: RegistryExport): void {
  const errors: string[] = [];

  if (registry.reportCount !== 26) {
    errors.push(
      `Expected 26 reports, got ${registry.reportCount}`,
    );
  }

  const slugs = new Set<string>();
  for (const report of registry.reports) {
    if (slugs.has(report.slug)) {
      errors.push(`Duplicate slug: ${report.slug}`);
    }
    slugs.add(report.slug);

    if (!report.label) {
      errors.push(`${report.slug}: missing label`);
    }
    if (!report.group) {
      errors.push(`${report.slug}: missing group`);
    }
    if (report.columns.length === 0) {
      errors.push(`${report.slug}: no columns defined`);
    }
    for (const col of report.columns) {
      if (!col.key) {
        errors.push(`${report.slug}: column missing key`);
      }
      if (!col.type) {
        errors.push(`${report.slug}.${col.key}: missing type`);
      }
    }
    if (report.filters.length === 0) {
      errors.push(`${report.slug}: no filters defined`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Registry export validation failed:');
    for (const err of errors) {
      console.error(`   • ${err}`);
    }
    process.exit(1);
  }
}

// ── Write the file ────────────────────────────────────────────
validate(artifact);

const outputPath = resolve(PROJECT_ROOT, 'contract', 'registry.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + '\n', 'utf-8');

console.log(`✅ Exported ${artifact.reportCount} reports → ${outputPath}`);
console.log(`   Generated at: ${artifact.generatedAt}`);
