/**
 * Parse Retrosheet Roster Data
 *
 * Reads all .ROS files and produces a unified roster JSON.
 *
 * Usage:
 *   bun run scripts/parse_rosters.ts
 *
 * Input:  data/extracted/reference/ (*.ROS files)
 * Output: data/parsed/rosters.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "reference");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "rosters.json");

interface RosterEntry {
  player_id: string;
  last_name: string;
  first_name: string;
  bats: string | null;
  throws: string | null;
  team_id: string;
  position: string | null;
  year: number;
}

function findRosterFiles(): string[] {
  const files: string[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.toUpperCase().endsWith(".ROS")) {
        files.push(fullPath);
      }
    }
  }

  scanDir(EXTRACTED_DIR);

  // Also check events directory since rosters are often bundled with event files
  scanDir(path.join(BASE_DIR, "extracted", "events"));

  return files;
}

function extractYearAndTeam(filename: string): { team: string; year: number } | null {
  // Roster filenames: TEAMYYYY.ROS (e.g., NYA2023.ROS)
  const base = path.basename(filename, ".ROS").toUpperCase();
  const match = base.match(/^([A-Z]{3})(\d{4})$/);
  if (match) {
    return { team: match[1], year: parseInt(match[2]) };
  }
  // Try alternate pattern: YYYY_TEAM or TEAM_YYYY
  const match2 = base.match(/^(\d{4})([A-Z]{3})$/);
  if (match2) {
    return { team: match2[2], year: parseInt(match2[1]) };
  }
  return null;
}

function main() {
  console.log("=== Parsing Retrosheet Roster Data ===\n");

  const rosFiles = findRosterFiles();
  if (rosFiles.length === 0) {
    console.error("No .ROS files found. Run download_retrosheet.ts first.");
    process.exit(1);
  }

  console.log(`Found ${rosFiles.length} roster files`);

  const entries: RosterEntry[] = [];
  let warnings = 0;
  const yearRange = { min: Infinity, max: -Infinity };

  for (const filePath of rosFiles) {
    const meta = extractYearAndTeam(path.basename(filePath, ".ROS"));
    if (!meta) {
      warnings++;
      continue;
    }

    yearRange.min = Math.min(yearRange.min, meta.year);
    yearRange.max = Math.max(yearRange.max, meta.year);

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

    for (const line of lines) {
      const fields = line.split(",").map((f) => f.trim().replace(/"/g, ""));
      // ROS format: playerID, lastName, firstName, bats, throws, team, position
      if (fields.length < 6) continue;

      entries.push({
        player_id: fields[0],
        last_name: fields[1],
        first_name: fields[2],
        bats: fields[3] || null,
        throws: fields[4] || null,
        team_id: fields[5] || meta.team,
        position: fields[6] || null,
        year: meta.year,
      });
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2));

  const uniquePlayers = new Set(entries.map((e) => e.player_id)).size;
  const uniqueTeams = new Set(entries.map((e) => e.team_id)).size;

  console.log(`\nParsed ${entries.length} roster entries:`);
  console.log(`  Unique players: ${uniquePlayers}`);
  console.log(`  Unique teams:   ${uniqueTeams}`);
  console.log(`  Year range:     ${yearRange.min}-${yearRange.max}`);
  console.log(`  Warnings:       ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main();
