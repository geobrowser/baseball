/**
 * Parse Retrosheet Team/Franchise Data
 *
 * Usage:
 *   bun run scripts/parse_teams.ts
 *
 * Input:  data/extracted/reference/ (team files)
 * Output: data/parsed/teams.json
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "reference");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "teams.json");

interface Team {
  retrosheet_id: string;
  league: string;
  city: string;
  nickname: string;
  full_name: string;
  first_year: number | null;
  last_year: number | null;
  alt_ids: string[];
}

function findTeamFile(): string {
  if (!fs.existsSync(EXTRACTED_DIR)) {
    throw new Error(`Directory not found: ${EXTRACTED_DIR}. Run download_retrosheet.ts first.`);
  }
  const files = fs.readdirSync(EXTRACTED_DIR);
  // Look for team-related files
  const candidates = [
    "CurrentNames.csv",
    "currentnames.csv",
    "TEAMABR.TXT",
    "teamabr.txt",
    "Teams.csv",
    "teams.csv",
  ];
  for (const name of candidates) {
    if (files.includes(name)) return path.join(EXTRACTED_DIR, name);
  }
  // Fallback: any file with "team" in name
  const match = files.find(
    (f) => f.toLowerCase().includes("team") && (f.endsWith(".csv") || f.endsWith(".txt"))
  );
  if (match) return path.join(EXTRACTED_DIR, match);

  throw new Error(`No team file found in ${EXTRACTED_DIR}. Available: ${files.join(", ")}`);
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

function main() {
  console.log("=== Parsing Retrosheet Team Data ===\n");

  const filePath = findTeamFile();
  console.log(`Reading: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

  const teams: Team[] = [];
  let warnings = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);

      // CurrentNames.csv format: franchise_id, league, city, nickname, first_year, last_year, ...
      // TEAMABR.TXT format may differ
      // We'll auto-detect based on content
      if (fields.length < 4) continue;

      // Skip obvious header lines
      if (fields[0].toLowerCase() === "id" || fields[0].toLowerCase() === "franchise") continue;

      const id = fields[0].replace(/"/g, "");
      if (!id || id.length < 2) continue;

      const team: Team = {
        retrosheet_id: id,
        league: fields[1]?.replace(/"/g, "") || "",
        city: fields[2]?.replace(/"/g, "") || "",
        nickname: fields[3]?.replace(/"/g, "") || "",
        full_name: `${fields[2]?.replace(/"/g, "")} ${fields[3]?.replace(/"/g, "")}`.trim(),
        first_year: fields[4] ? parseInt(fields[4]) || null : null,
        last_year: fields[5] ? parseInt(fields[5]) || null : null,
        alt_ids: fields.length > 6
          ? fields.slice(6).filter((f) => f.trim() !== "").map((f) => f.replace(/"/g, ""))
          : [],
      };

      teams.push(team);
    } catch (err: any) {
      warnings++;
      if (warnings <= 5) {
        console.warn(`  Warning line ${i + 1}: ${err.message}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(teams, null, 2));

  const activeTeams = teams.filter(
    (t) => t.last_year === null || t.last_year >= 2024
  );

  console.log(`\nParsed ${teams.length} teams/franchises:`);
  console.log(`  Active (current): ${activeTeams.length}`);
  console.log(`  Historical:       ${teams.length - activeTeams.length}`);
  console.log(`  Warnings:         ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);

  // Spot check
  const yankees = teams.find(
    (t) => t.nickname.includes("Yankees") || t.retrosheet_id === "NYA"
  );
  if (yankees) {
    console.log(`\nSpot check — Yankees:`);
    console.log(`  ID: ${yankees.retrosheet_id}`);
    console.log(`  Name: ${yankees.full_name}`);
    console.log(`  League: ${yankees.league}`);
    console.log(`  Years: ${yankees.first_year}-${yankees.last_year || "present"}`);
  }
}

main();
