/**
 * Parse Retrosheet Biographical Data
 *
 * Reads the biofile (pipe-delimited or CSV) and outputs structured JSON.
 *
 * Usage:
 *   bun run scripts/parse_players.ts
 *
 * Input:  data/extracted/bio/biofile0.csv (or biofile0101.txt)
 * Output: data/parsed/players.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "bio");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "players.json");

// Biofile fields in order (32 fields)
const BIOFILE_FIELDS = [
  "retrosheet_id",
  "last_name",
  "use_name",
  "full_name",
  "birth_date",
  "birth_city",
  "birth_state",
  "birth_country",
  "death_date",
  "death_city",
  "death_state",
  "death_country",
  "cemetery",
  "cemetery_city",
  "cemetery_state",
  "cemetery_country",
  "cemetery_note",
  "birth_name",
  "alt_name",
  "debut_player",
  "last_player",
  "debut_coach",
  "last_coach",
  "debut_manager",
  "last_manager",
  "debut_umpire",
  "last_umpire",
  "bats",
  "throws",
  "height",
  "weight",
  "hall_of_fame",
] as const;

interface Player {
  retrosheet_id: string;
  last_name: string;
  first_name: string;
  full_name: string;
  birth_name: string | null;
  alt_name: string | null;
  birth_date: string | null;
  birth_city: string | null;
  birth_state: string | null;
  birth_country: string | null;
  death_date: string | null;
  death_city: string | null;
  death_state: string | null;
  death_country: string | null;
  debut_player: string | null;
  last_player: string | null;
  debut_coach: string | null;
  last_coach: string | null;
  debut_manager: string | null;
  last_manager: string | null;
  debut_umpire: string | null;
  last_umpire: string | null;
  bats: string | null;
  throws: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  hall_of_fame: boolean;
  roles: string[]; // player, coach, manager, umpire
}

function findBiofile(): string {
  // Try known filenames
  const candidates = [
    "biofile0.csv",
    "biofile.csv",
    "biofile0101.txt",
    "biofile.txt",
    "BioFile0.csv",
  ];

  for (const name of candidates) {
    const p = path.join(EXTRACTED_DIR, name);
    if (fs.existsSync(p)) return p;
  }

  // Fall back to any .csv or .txt in the directory
  if (fs.existsSync(EXTRACTED_DIR)) {
    const files = fs.readdirSync(EXTRACTED_DIR);
    const match = files.find(
      (f) =>
        f.toLowerCase().includes("bio") &&
        (f.endsWith(".csv") || f.endsWith(".txt"))
    );
    if (match) return path.join(EXTRACTED_DIR, match);
  }

  throw new Error(
    `No biofile found in ${EXTRACTED_DIR}. Run download_retrosheet.ts first.`
  );
}

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();
  // Retrosheet dates are typically YYYYMMDD or YYYY/MM/DD or MM/DD/YYYY
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, "-");
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [m, d, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed; // return as-is if unrecognized
}

function clean(val: string): string | null {
  const trimmed = val?.trim().replace(/^"|"$/g, "");
  return trimmed && trimmed !== "" ? trimmed : null;
}

function parseLine(line: string): Record<string, string> {
  // Detect delimiter: pipe or comma
  const delimiter = line.includes("|") ? "|" : ",";
  const parts = line.split(delimiter);
  const record: Record<string, string> = {};
  for (let i = 0; i < BIOFILE_FIELDS.length && i < parts.length; i++) {
    record[BIOFILE_FIELDS[i]] = parts[i].trim().replace(/^"|"$/g, "");
  }
  return record;
}

function toPlayer(raw: Record<string, string>): Player {
  const roles: string[] = [];
  if (raw.debut_player) roles.push("player");
  if (raw.debut_coach) roles.push("coach");
  if (raw.debut_manager) roles.push("manager");
  if (raw.debut_umpire) roles.push("umpire");

  const heightRaw = clean(raw.height);
  const weightRaw = clean(raw.weight);

  return {
    retrosheet_id: raw.retrosheet_id,
    last_name: raw.last_name || "",
    first_name: raw.use_name || "",
    full_name: raw.full_name || "",
    birth_name: clean(raw.birth_name),
    alt_name: clean(raw.alt_name),
    birth_date: parseDate(raw.birth_date || ""),
    birth_city: clean(raw.birth_city),
    birth_state: clean(raw.birth_state),
    birth_country: clean(raw.birth_country),
    death_date: parseDate(raw.death_date || ""),
    death_city: clean(raw.death_city),
    death_state: clean(raw.death_state),
    death_country: clean(raw.death_country),
    debut_player: parseDate(raw.debut_player || ""),
    last_player: parseDate(raw.last_player || ""),
    debut_coach: parseDate(raw.debut_coach || ""),
    last_coach: parseDate(raw.last_coach || ""),
    debut_manager: parseDate(raw.debut_manager || ""),
    last_manager: parseDate(raw.last_manager || ""),
    debut_umpire: parseDate(raw.debut_umpire || ""),
    last_umpire: parseDate(raw.last_umpire || ""),
    bats: clean(raw.bats),
    throws: clean(raw.throws),
    height_inches: heightRaw ? parseInt(heightRaw) || null : null,
    weight_lbs: weightRaw ? parseInt(weightRaw) || null : null,
    hall_of_fame: (raw.hall_of_fame || "").trim().toUpperCase() === "HOF" ||
                  (raw.hall_of_fame || "").trim().toUpperCase() === "Y" ||
                  (raw.hall_of_fame || "").trim() !== "",
    roles,
  };
}

function main() {
  console.log("=== Parsing Retrosheet Biographical Data ===\n");

  const filePath = findBiofile();
  console.log(`Reading: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

  // Skip header if present
  const firstLine = lines[0].toLowerCase();
  const startIdx =
    firstLine.includes("retrosheet") || firstLine.includes("id,") || firstLine.includes("id|")
      ? 1
      : 0;

  const players: Player[] = [];
  let warnings = 0;

  for (let i = startIdx; i < lines.length; i++) {
    try {
      const raw = parseLine(lines[i]);
      if (!raw.retrosheet_id) {
        warnings++;
        continue;
      }
      players.push(toPlayer(raw));
    } catch (err: any) {
      warnings++;
      if (warnings <= 5) {
        console.warn(`  Warning line ${i + 1}: ${err.message}`);
      }
    }
  }

  // Write output
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(players, null, 2));

  // Summary
  const hofCount = players.filter((p) => p.hall_of_fame).length;
  const playerCount = players.filter((p) => p.roles.includes("player")).length;
  const managerCount = players.filter((p) => p.roles.includes("manager")).length;
  const umpireCount = players.filter((p) => p.roles.includes("umpire")).length;
  const coachCount = players.filter((p) => p.roles.includes("coach")).length;

  console.log(`\nParsed ${players.length} people:`);
  console.log(`  Players:    ${playerCount}`);
  console.log(`  Managers:   ${managerCount}`);
  console.log(`  Coaches:    ${coachCount}`);
  console.log(`  Umpires:    ${umpireCount}`);
  console.log(`  HoF:        ${hofCount}`);
  console.log(`  Warnings:   ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);

  // Spot check
  const ruth = players.find((p) => p.retrosheet_id === "ruthb101");
  if (ruth) {
    console.log(`\nSpot check — Babe Ruth:`);
    console.log(`  Name: ${ruth.first_name} ${ruth.last_name}`);
    console.log(`  Born: ${ruth.birth_date} in ${ruth.birth_city}, ${ruth.birth_state}`);
    console.log(`  Debut: ${ruth.debut_player}, Last: ${ruth.last_player}`);
    console.log(`  HoF: ${ruth.hall_of_fame}`);
  }
}

main();
