/**
 * Parse Retrosheet Special Collections
 *
 * Each collection has the same 7-CSV structure as the master files.
 * We extract just the gameinfo.csv from each into a combined JSON.
 *
 * Usage: bun run scripts/parse_special.ts
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const SPECIAL_DIR = path.join(BASE_DIR, "extracted", "special");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "special_collections.json");

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const COLLECTION_LABELS: Record<string, string> = {
  "3HR": "3+ Home Run Games",
  "15K": "15+ Strikeout Games",
  "20innings": "20+ Inning Games",
  "20runss": "20+ Runs Scored Games",
  cycles: "Batting Cycles",
  interracial: "Interracial Exhibition Games (1925-1948)",
  nohitters: "No-Hitters",
  tripleplays: "Triple Plays",
};

function main() {
  console.log("=== Parsing Special Collections ===\n");

  if (!fs.existsSync(SPECIAL_DIR)) {
    console.error("No special collections found. Run download first.");
    process.exit(1);
  }

  const collections: Record<string, any[]> = {};

  for (const dir of fs.readdirSync(SPECIAL_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const name = dir.name;
    const gameInfoPath = path.join(SPECIAL_DIR, name, "gameinfo.csv");
    if (!fs.existsSync(gameInfoPath)) {
      console.log(`  Skipping ${name} (no gameinfo.csv)`);
      continue;
    }

    const content = fs.readFileSync(gameInfoPath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) continue;

    const headers = parseCSVLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    );

    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const rec: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const val = (fields[j] || "").trim();
        if (val) rec[headers[j]] = val;
      }
      records.push(rec);
    }

    const label = COLLECTION_LABELS[name] || name;
    collections[name] = records;
    console.log(`  ${label}: ${records.length} games`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(collections, null, 2));

  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main();
