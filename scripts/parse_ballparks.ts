/**
 * Parse Retrosheet Ballpark Data
 *
 * Usage:
 *   bun run scripts/parse_ballparks.ts
 *
 * Input:  data/extracted/reference/ (ballpark files)
 * Output: data/parsed/ballparks.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "reference");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "ballparks.json");

interface Ballpark {
  retrosheet_id: string;
  name: string;
  aka: string | null;
  city: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  league: string | null;
  notes: string | null;
}

function findBallparkFile(): string {
  if (!fs.existsSync(EXTRACTED_DIR)) {
    throw new Error(`Directory not found: ${EXTRACTED_DIR}. Run download_retrosheet.ts first.`);
  }
  const files = fs.readdirSync(EXTRACTED_DIR);
  const candidates = [
    "parkcode.txt",
    "ParkCode.txt",
    "ballparks.csv",
    "Ballparks.csv",
    "parkcode.csv",
  ];
  for (const name of candidates) {
    if (files.includes(name)) return path.join(EXTRACTED_DIR, name);
  }
  const match = files.find(
    (f) => f.toLowerCase().includes("park") && (f.endsWith(".csv") || f.endsWith(".txt"))
  );
  if (match) return path.join(EXTRACTED_DIR, match);

  throw new Error(`No ballpark file found in ${EXTRACTED_DIR}. Available: ${files.join(", ")}`);
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

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim().replace(/"/g, "");
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split("/");
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

function clean(val: string): string | null {
  const trimmed = val?.trim().replace(/^"|"$/g, "");
  return trimmed && trimmed !== "" ? trimmed : null;
}

function main() {
  console.log("=== Parsing Retrosheet Ballpark Data ===\n");

  const filePath = findBallparkFile();
  console.log(`Reading: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

  const ballparks: Ballpark[] = [];
  let warnings = 0;

  // parkcode.txt format: PARKID,NAME,AKA,CITY,STATE,START,END,LEAGUE,NOTES
  for (let i = 0; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 5) continue;

      // Skip header
      if (fields[0].toLowerCase() === "parkid" || fields[0].toLowerCase() === "id") continue;

      const id = (fields[0] || "").replace(/"/g, "").trim();
      if (!id) continue;

      ballparks.push({
        retrosheet_id: id,
        name: (fields[1] || "").replace(/"/g, "").trim(),
        aka: clean(fields[2] || ""),
        city: (fields[3] || "").replace(/"/g, "").trim(),
        state: (fields[4] || "").replace(/"/g, "").trim(),
        start_date: parseDate(fields[5] || ""),
        end_date: parseDate(fields[6] || ""),
        league: clean(fields[7] || ""),
        notes: clean(fields[8] || ""),
      });
    } catch (err: any) {
      warnings++;
      if (warnings <= 5) {
        console.warn(`  Warning line ${i + 1}: ${err.message}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(ballparks, null, 2));

  const states = new Set(ballparks.map((b) => b.state).filter(Boolean));

  console.log(`\nParsed ${ballparks.length} ballparks:`);
  console.log(`  States/provinces: ${states.size}`);
  console.log(`  Warnings:         ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);

  // Spot check
  const yankeeStadium = ballparks.find(
    (b) => b.name.includes("Yankee") || b.retrosheet_id.startsWith("NYC")
  );
  if (yankeeStadium) {
    console.log(`\nSpot check — ${yankeeStadium.name}:`);
    console.log(`  ID: ${yankeeStadium.retrosheet_id}`);
    console.log(`  City: ${yankeeStadium.city}, ${yankeeStadium.state}`);
    console.log(`  Opened: ${yankeeStadium.start_date}`);
  }
}

main();
