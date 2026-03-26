/**
 * Summarize & Validate Retrosheet Data
 *
 * Prints a comprehensive summary of all parsed data with spot checks.
 *
 * Usage:
 *   bun run scripts/summarize_data.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const PARSED_DIR = path.join(BASE_DIR, "parsed");

function loadJSON(filename: string): any[] | null {
  const filePath = path.join(PARSED_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function countNDJSON(filename: string): number {
  const filePath = path.join(PARSED_DIR, filename);
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").filter((l) => l.trim() !== "").length;
}

function loadFirstNDJSON(filename: string, n: number): any[] {
  const filePath = path.join(PARSED_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((l) => l.trim() !== "")
    .slice(0, n)
    .map((l) => JSON.parse(l));
}

function fileSize(filePath: string): string {
  if (!fs.existsSync(filePath)) return "N/A";
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        Retrosheet Data Summary & Validation            ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ── Disk Usage ──────────────────────────────────────────────────────
  console.log("─── Disk Usage ───");
  try {
    const rawDu = execSync(`du -sh "${path.join(BASE_DIR, "raw")}" 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    console.log(`  Raw:       ${rawDu.split("\t")[0]}`);
  } catch {
    console.log("  Raw:       (not available)");
  }
  try {
    const extDu = execSync(`du -sh "${path.join(BASE_DIR, "extracted")}" 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    console.log(`  Extracted: ${extDu.split("\t")[0]}`);
  } catch {
    console.log("  Extracted: (not available)");
  }
  try {
    const parsedDu = execSync(`du -sh "${PARSED_DIR}" 2>/dev/null`, {
      encoding: "utf-8",
    }).trim();
    console.log(`  Parsed:    ${parsedDu.split("\t")[0]}`);
  } catch {
    console.log("  Parsed:    (not available)");
  }

  // ── Players ─────────────────────────────────────────────────────────
  console.log("\n─── Players (players.json) ───");
  const players = loadJSON("players.json");
  if (players) {
    const hofCount = players.filter((p: any) => p.hall_of_fame).length;
    const playerCount = players.filter((p: any) => p.roles?.includes("player")).length;
    const managerCount = players.filter((p: any) => p.roles?.includes("manager")).length;
    const umpireCount = players.filter((p: any) => p.roles?.includes("umpire")).length;

    console.log(`  Total people:  ${players.length.toLocaleString()}`);
    console.log(`  Players:       ${playerCount.toLocaleString()}`);
    console.log(`  Managers:      ${managerCount.toLocaleString()}`);
    console.log(`  Umpires:       ${umpireCount.toLocaleString()}`);
    console.log(`  Hall of Fame:  ${hofCount}`);
    console.log(`  File size:     ${fileSize(path.join(PARSED_DIR, "players.json"))}`);

    // Spot checks
    const ruth = players.find((p: any) => p.retrosheet_id === "ruthb101");
    const jackie = players.find((p: any) => p.retrosheet_id === "robij101");
    const trout = players.find((p: any) => p.retrosheet_id === "troum001");

    if (ruth) {
      console.log(`\n  ✓ Babe Ruth: ${ruth.first_name} ${ruth.last_name}`);
      console.log(`    Born: ${ruth.birth_date}, Debut: ${ruth.debut_player}`);
      console.log(`    HoF: ${ruth.hall_of_fame}`);
    } else {
      console.log("  ✗ Babe Ruth NOT FOUND (expected ruthb101)");
    }

    if (jackie) {
      console.log(`  ✓ Jackie Robinson: ${jackie.first_name} ${jackie.last_name}`);
      console.log(`    Born: ${jackie.birth_date}, Debut: ${jackie.debut_player}`);
    } else {
      console.log("  ✗ Jackie Robinson NOT FOUND (expected robij101)");
    }

    if (trout) {
      console.log(`  ✓ Mike Trout: ${trout.first_name} ${trout.last_name}`);
      console.log(`    Born: ${trout.birth_date}, Debut: ${trout.debut_player}`);
    }
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Teams ───────────────────────────────────────────────────────────
  console.log("\n─── Teams (teams.json) ───");
  const teams = loadJSON("teams.json");
  if (teams) {
    const active = teams.filter(
      (t: any) => !t.last_year || t.last_year >= 2024
    ).length;
    console.log(`  Total franchises: ${teams.length}`);
    console.log(`  Active:           ${active}`);
    console.log(`  File size:        ${fileSize(path.join(PARSED_DIR, "teams.json"))}`);
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Ballparks ───────────────────────────────────────────────────────
  console.log("\n─── Ballparks (ballparks.json) ───");
  const ballparks = loadJSON("ballparks.json");
  if (ballparks) {
    console.log(`  Total ballparks: ${ballparks.length}`);
    console.log(`  File size:       ${fileSize(path.join(PARSED_DIR, "ballparks.json"))}`);
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Rosters ─────────────────────────────────────────────────────────
  console.log("\n─── Rosters (rosters.json) ───");
  const rosters = loadJSON("rosters.json");
  if (rosters) {
    const uniquePlayers = new Set(rosters.map((r: any) => r.player_id)).size;
    const years = rosters.map((r: any) => r.year).filter(Boolean);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    console.log(`  Total entries:   ${rosters.length.toLocaleString()}`);
    console.log(`  Unique players:  ${uniquePlayers.toLocaleString()}`);
    console.log(`  Year range:      ${minYear}-${maxYear}`);
    console.log(`  File size:       ${fileSize(path.join(PARSED_DIR, "rosters.json"))}`);
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Game Logs ───────────────────────────────────────────────────────
  console.log("\n─── Game Logs (gamelogs.ndjson) ───");
  const glCount = countNDJSON("gamelogs.ndjson");
  if (glCount > 0) {
    const sample = loadFirstNDJSON("gamelogs.ndjson", 5);
    console.log(`  Total games:  ${glCount.toLocaleString()}`);
    console.log(`  File size:    ${fileSize(path.join(PARSED_DIR, "gamelogs.ndjson"))}`);
    if (sample.length > 0) {
      console.log(`  First game:   ${sample[0].date} — ${sample[0].visiting_team} @ ${sample[0].home_team}`);
    }
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Ejections ───────────────────────────────────────────────────────
  console.log("\n─── Ejections (ejections.json) ───");
  const ejections = loadJSON("ejections.json");
  if (ejections) {
    console.log(`  Total ejections: ${ejections.length.toLocaleString()}`);
    console.log(`  File size:       ${fileSize(path.join(PARSED_DIR, "ejections.json"))}`);
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Schedules ───────────────────────────────────────────────────────
  console.log("\n─── Schedules (schedules.ndjson) ───");
  const schedCount = countNDJSON("schedules.ndjson");
  if (schedCount > 0) {
    console.log(`  Total entries: ${schedCount.toLocaleString()}`);
    console.log(`  File size:     ${fileSize(path.join(PARSED_DIR, "schedules.ndjson"))}`);
  } else {
    console.log("  (not parsed yet)");
  }

  // ── Master CSVs ─────────────────────────────────────────────────────
  console.log("\n─── Master CSV Files ───");
  const masterFiles = [
    "allplayers.ndjson",
    "gameinfo.ndjson",
    "teamstats.ndjson",
    "batting.ndjson",
    "pitching.ndjson",
    "fielding.ndjson",
    "plays.ndjson",
  ];
  for (const f of masterFiles) {
    const count = countNDJSON(f);
    if (count > 0) {
      console.log(
        `  ${f.padEnd(22)} ${String(count.toLocaleString()).padStart(12)} records  ${fileSize(path.join(PARSED_DIR, f)).padStart(8)}`
      );
    }
  }
  if (masterFiles.every((f) => countNDJSON(f) === 0)) {
    console.log("  (not parsed yet)");
  }

  // ── All parsed files ────────────────────────────────────────────────
  console.log("\n─── All Parsed Files ───");
  if (fs.existsSync(PARSED_DIR)) {
    const allFiles = fs.readdirSync(PARSED_DIR).sort();
    for (const f of allFiles) {
      console.log(`  ${f.padEnd(30)} ${fileSize(path.join(PARSED_DIR, f)).padStart(10)}`);
    }
  } else {
    console.log("  (no parsed directory)");
  }
}

main();
