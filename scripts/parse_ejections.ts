/**
 * Parse Retrosheet Ejection Data
 *
 * Usage:
 *   bun run scripts/parse_ejections.ts
 *
 * Input:  data/extracted/ejections/
 * Output: data/parsed/ejections.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "ejections");
const CSV_DIR = path.join(BASE_DIR, "extracted", "csv");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "ejections.json");

interface Ejection {
  game_id: string;
  date: string;
  game_number: string | null;
  ejected_id: string;
  ejected_name: string;
  team: string;
  role: string;
  umpire_id: string;
  umpire_name: string;
  inning: string | null;
  reason: string | null;
}

function findEjectionFile(): string {
  // Check dedicated ejections directory first
  if (fs.existsSync(EXTRACTED_DIR)) {
    const files = fs.readdirSync(EXTRACTED_DIR);
    const match = files.find(
      (f) =>
        (f.toLowerCase().includes("eject") || f.toLowerCase().includes("ej")) &&
        (f.endsWith(".csv") || f.endsWith(".txt"))
    );
    if (match) return path.join(EXTRACTED_DIR, match);
  }

  // Fall back to master CSV directory (ejections.csv from csvdownloads.zip)
  const csvPath = path.join(CSV_DIR, "ejections.csv");
  if (fs.existsSync(csvPath)) return csvPath;

  throw new Error(`No ejection file found in ${EXTRACTED_DIR} or ${CSV_DIR}. Run download_retrosheet.ts first.`);
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
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

function clean(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^"|"$/g, "");
  return trimmed !== "" ? trimmed : null;
}

function extractDateFromGameId(gameId: string): string {
  // Game IDs typically: TEA YYYYMMDDG (e.g., NYA200305210)
  const match = gameId.match(/(\d{4})(\d{2})(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return "";
}

function main() {
  console.log("=== Parsing Retrosheet Ejection Data ===\n");

  const filePath = findEjectionFile();
  console.log(`Reading: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

  const ejections: Ejection[] = [];
  let warnings = 0;
  let headerSkipped = false;

  // Ejection file format (from docs):
  // GameID, Date, GameNo, EjectedID, EjectedName, Team, Role, UmpireID, UmpireName, Inning, Reason

  for (let i = 0; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    // Skip header if present
    if (!headerSkipped && fields[0]?.toLowerCase().includes("game")) {
      headerSkipped = true;
      continue;
    }

    if (fields.length < 7) {
      warnings++;
      continue;
    }

    try {
      const gameId = (fields[0] || "").replace(/"/g, "").trim();
      const dateField = clean(fields[1]);
      const date = dateField || extractDateFromGameId(gameId);

      ejections.push({
        game_id: gameId,
        date,
        game_number: clean(fields[2]),
        ejected_id: (fields[3] || "").replace(/"/g, "").trim(),
        ejected_name: (fields[4] || "").replace(/"/g, "").trim(),
        team: (fields[5] || "").replace(/"/g, "").trim(),
        role: (fields[6] || "").replace(/"/g, "").trim(),
        umpire_id: (fields[7] || "").replace(/"/g, "").trim(),
        umpire_name: (fields[8] || "").replace(/"/g, "").trim(),
        inning: clean(fields[9]),
        reason: clean(fields[10]),
      });
    } catch (err: any) {
      warnings++;
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(ejections, null, 2));

  const roles = new Map<string, number>();
  for (const e of ejections) {
    roles.set(e.role, (roles.get(e.role) || 0) + 1);
  }

  console.log(`\nParsed ${ejections.length} ejections:`);
  for (const [role, count] of roles) {
    console.log(`  ${role}: ${count}`);
  }
  console.log(`  Warnings: ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main();
