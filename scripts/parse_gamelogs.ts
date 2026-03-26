/**
 * Parse Retrosheet Game Log Data
 *
 * Reads GL*.TXT files (161 fields per line) and outputs structured JSON.
 *
 * Usage:
 *   bun run scripts/parse_gamelogs.ts
 *
 * Input:  data/extracted/gamelogs/ (GL*.TXT files)
 * Output: data/parsed/gamelogs.ndjson (newline-delimited JSON — large file)
 */

import * as fs from "fs";
import * as path from "path";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "gamelogs");
const OUTPUT_PATH = path.join(BASE_DIR, "parsed", "gamelogs.ndjson");

interface GameLog {
  date: string;
  game_number: string;
  day_of_week: string;
  visiting_team: string;
  visiting_league: string;
  home_team: string;
  home_league: string;
  visiting_score: number | null;
  home_score: number | null;
  game_length_outs: number | null;
  day_night: string | null;
  completion_info: string | null;
  forfeit_info: string | null;
  park_id: string | null;
  attendance: number | null;
  duration_minutes: number | null;
  // Visiting team offense
  v_at_bats: number | null;
  v_hits: number | null;
  v_doubles: number | null;
  v_triples: number | null;
  v_home_runs: number | null;
  v_rbi: number | null;
  v_walks: number | null;
  v_strikeouts: number | null;
  v_stolen_bases: number | null;
  v_left_on_base: number | null;
  // Home team offense
  h_at_bats: number | null;
  h_hits: number | null;
  h_doubles: number | null;
  h_triples: number | null;
  h_home_runs: number | null;
  h_rbi: number | null;
  h_walks: number | null;
  h_strikeouts: number | null;
  h_stolen_bases: number | null;
  h_left_on_base: number | null;
  // Key people
  hp_umpire_id: string | null;
  hp_umpire_name: string | null;
  winning_pitcher_id: string | null;
  winning_pitcher_name: string | null;
  losing_pitcher_id: string | null;
  losing_pitcher_name: string | null;
  save_pitcher_id: string | null;
  save_pitcher_name: string | null;
  v_starting_pitcher_id: string | null;
  v_starting_pitcher_name: string | null;
  h_starting_pitcher_id: string | null;
  h_starting_pitcher_name: string | null;
  v_manager_id: string | null;
  h_manager_id: string | null;
  acquisition_info: string | null;
}

function findGamelogFiles(): string[] {
  const files: string[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (
        entry.name.toUpperCase().startsWith("GL") &&
        entry.name.toUpperCase().endsWith(".TXT")
      ) {
        files.push(fullPath);
      }
    }
  }

  scanDir(EXTRACTED_DIR);
  return files.sort();
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function clean(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^"|"$/g, "");
  return trimmed !== "" ? trimmed : null;
}

function num(val: string | undefined): number | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/"/g, "");
  if (trimmed === "" || trimmed === "-1") return null;
  const n = parseInt(trimmed);
  return isNaN(n) ? null : n;
}

function parseDate(raw: string): string {
  const d = raw.replace(/"/g, "").trim();
  if (d.length === 8) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return d;
}

function parseGame(fields: string[]): GameLog {
  return {
    date: parseDate(fields[0] || ""),
    game_number: clean(fields[1]) || "0",
    day_of_week: clean(fields[2]) || "",
    visiting_team: clean(fields[3]) || "",
    visiting_league: clean(fields[4]) || "",
    home_team: clean(fields[6]) || "",
    home_league: clean(fields[7]) || "",
    visiting_score: num(fields[9]),
    home_score: num(fields[10]),
    game_length_outs: num(fields[11]),
    day_night: clean(fields[12]),
    completion_info: clean(fields[13]),
    forfeit_info: clean(fields[14]),
    park_id: clean(fields[16]),
    attendance: num(fields[17]),
    duration_minutes: num(fields[18]),
    // Visiting offense (fields 21-37, 0-indexed)
    v_at_bats: num(fields[21]),
    v_hits: num(fields[22]),
    v_doubles: num(fields[23]),
    v_triples: num(fields[24]),
    v_home_runs: num(fields[25]),
    v_rbi: num(fields[26]),
    v_walks: num(fields[31]),
    v_strikeouts: num(fields[33]),
    v_stolen_bases: num(fields[34]),
    v_left_on_base: num(fields[38]),
    // Home offense (fields 49-65, 0-indexed)
    h_at_bats: num(fields[49]),
    h_hits: num(fields[50]),
    h_doubles: num(fields[51]),
    h_triples: num(fields[52]),
    h_home_runs: num(fields[53]),
    h_rbi: num(fields[54]),
    h_walks: num(fields[59]),
    h_strikeouts: num(fields[61]),
    h_stolen_bases: num(fields[62]),
    h_left_on_base: num(fields[66]),
    // Umpires (0-indexed: 77=HP ump ID, 78=HP ump name)
    hp_umpire_id: clean(fields[77]),
    hp_umpire_name: clean(fields[78]),
    // Managers (0-indexed: 89=V mgr ID, 91=H mgr ID)
    v_manager_id: clean(fields[89]),
    h_manager_id: clean(fields[91]),
    // Pitchers
    winning_pitcher_id: clean(fields[93]),
    winning_pitcher_name: clean(fields[94]),
    losing_pitcher_id: clean(fields[95]),
    losing_pitcher_name: clean(fields[96]),
    save_pitcher_id: clean(fields[97]),
    save_pitcher_name: clean(fields[98]),
    // Starting pitchers
    v_starting_pitcher_id: clean(fields[101]),
    v_starting_pitcher_name: clean(fields[102]),
    h_starting_pitcher_id: clean(fields[103]),
    h_starting_pitcher_name: clean(fields[104]),
    acquisition_info: clean(fields[160]),
  };
}

function main() {
  console.log("=== Parsing Retrosheet Game Log Data ===\n");

  const glFiles = findGamelogFiles();
  if (glFiles.length === 0) {
    console.error("No GL*.TXT files found. Run download_retrosheet.ts first.");
    process.exit(1);
  }

  console.log(`Found ${glFiles.length} game log files`);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const outStream = fs.createWriteStream(OUTPUT_PATH);

  let totalGames = 0;
  let warnings = 0;
  const yearRange = { min: "9999", max: "0000" };
  const teamsSeen = new Set<string>();

  for (const filePath of glFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

    for (let i = 0; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);
        if (fields.length < 20) continue;

        const game = parseGame(fields);
        if (!game.date || !game.visiting_team) continue;

        outStream.write(JSON.stringify(game) + "\n");
        totalGames++;

        const year = game.date.slice(0, 4);
        if (year < yearRange.min) yearRange.min = year;
        if (year > yearRange.max) yearRange.max = year;
        teamsSeen.add(game.visiting_team);
        teamsSeen.add(game.home_team);
      } catch (err: any) {
        warnings++;
      }
    }
  }

  outStream.end();

  console.log(`\nParsed ${totalGames} games:`);
  console.log(`  Year range:   ${yearRange.min}-${yearRange.max}`);
  console.log(`  Unique teams: ${teamsSeen.size}`);
  console.log(`  Warnings:     ${warnings}`);
  console.log(`\nOutput: ${OUTPUT_PATH} (NDJSON format)`);
}

main();
