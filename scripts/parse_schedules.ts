/**
 * Parse Retrosheet Schedule Data
 *
 * Reads schedule .TXT files and outputs structured JSON.
 *
 * Usage:
 *   bun run scripts/parse_schedules.ts
 *
 * Input:  data/extracted/schedules/ (*.TXT files)
 * Output: data/parsed/schedules.ndjson
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "schedules");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "schedules.ndjson");

interface ScheduleEntry {
  date: string;
  game_number: string;
  day_of_week: string;
  visiting_team: string;
  visiting_league: string | null;
  visiting_game_number: string | null;
  home_team: string;
  home_league: string | null;
  home_game_number: string | null;
  time_of_day: string | null;
  postponement_info: string | null;
  makeup_date: string | null;
}

function findScheduleFiles(): string[] {
  const files: string[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".TXT") || entry.name.endsWith(".txt") || entry.name.endsWith(".csv")) {
        files.push(fullPath);
      }
    }
  }

  scanDir(EXTRACTED_DIR);
  return files.sort();
}

function clean(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^"|"$/g, "");
  return trimmed !== "" ? trimmed : null;
}

function parseDate(raw: string): string {
  const d = raw.replace(/"/g, "").trim();
  if (/^\d{8}$/.test(d)) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return d;
}

function main() {
  console.log("=== Parsing Retrosheet Schedule Data ===\n");

  const schedFiles = findScheduleFiles();
  if (schedFiles.length === 0) {
    console.error("No schedule files found. Run download_retrosheet.ts first.");
    process.exit(1);
  }

  console.log(`Found ${schedFiles.length} schedule files`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const outStream = fs.createWriteStream(OUTPUT_PATH);

  let totalEntries = 0;
  let warnings = 0;
  const yearRange = { min: "9999", max: "0000" };

  for (const filePath of schedFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

    for (const line of lines) {
      const fields = line.split(",").map((f) => f.trim().replace(/^"|"$/g, ""));

      // Schedule format: date, game_number, day_of_week, visiting_team, visiting_league,
      // visiting_game_number, home_team, home_league, home_game_number, time_of_day,
      // postponement_info, makeup_date
      if (fields.length < 7) {
        warnings++;
        continue;
      }

      // Skip headers
      if (fields[0].toLowerCase() === "date") continue;

      const entry: ScheduleEntry = {
        date: parseDate(fields[0]),
        game_number: fields[1] || "0",
        day_of_week: fields[2] || "",
        visiting_team: fields[3] || "",
        visiting_league: clean(fields[4]),
        visiting_game_number: clean(fields[5]),
        home_team: fields[6] || "",
        home_league: clean(fields[7]),
        home_game_number: clean(fields[8]),
        time_of_day: clean(fields[9]),
        postponement_info: clean(fields[10]),
        makeup_date: clean(fields[11]),
      };

      outStream.write(JSON.stringify(entry) + "\n");
      totalEntries++;

      const year = entry.date.slice(0, 4);
      if (year < yearRange.min) yearRange.min = year;
      if (year > yearRange.max) yearRange.max = year;
    }
  }

  outStream.end();

  console.log(`\nParsed ${totalEntries} schedule entries:`);
  console.log(`  Year range: ${yearRange.min}-${yearRange.max}`);
  console.log(`  Warnings:   ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH} (NDJSON format)`);
}

main();
