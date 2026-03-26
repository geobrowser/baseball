/**
 * Download & Extract ALL Retrosheet Data
 *
 * Downloads every available dataset from retrosheet.org and extracts
 * ZIP archives into organized directories under data/.
 *
 * Usage:
 *   bun run scripts/download_retrosheet.ts [--group <number>] [--skip-extract]
 *
 * Groups (run specific groups, or omit for all):
 *   1 = Reference data (bio, ballparks, teams, rosters)
 *   2 = Master CSV files (csvdownloads.zip, basiccsvs.zip)
 *   3 = League-specific & game-type CSVs
 *   4 = Event files (play-by-play native format)
 *   5 = Game logs
 *   6 = Supplementary (schedules, ejections, official totals, special collections)
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const RAW_DIR = path.join(BASE_DIR, "raw");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted");

// ─── Download Definitions ───────────────────────────────────────────────────

interface Download {
  url: string;
  rawSubdir: string;
  extractSubdir: string;
  filename?: string; // override auto-detected filename
}

// Group 1: Reference data
const GROUP_1_REFERENCE: Download[] = [
  {
    url: "https://www.retrosheet.org/downloads/biodata.zip",
    rawSubdir: "bio",
    extractSubdir: "bio",
  },
  {
    url: "https://www.retrosheet.org/biofile.zip",
    rawSubdir: "bio",
    extractSubdir: "bio",
  },
  {
    url: "https://www.retrosheet.org/ballparks.zip",
    rawSubdir: "reference",
    extractSubdir: "reference",
  },
  {
    url: "https://www.retrosheet.org/teams.zip",
    rawSubdir: "reference",
    extractSubdir: "reference",
  },
  {
    url: "https://www.retrosheet.org/rosters.zip",
    rawSubdir: "reference",
    extractSubdir: "reference",
  },
];

// Group 2: Master CSV files
const GROUP_2_CSV: Download[] = [
  {
    url: "https://www.retrosheet.org/downloads/csvdownloads.zip",
    rawSubdir: "csv",
    extractSubdir: "csv",
  },
  {
    url: "https://www.retrosheet.org/downloads/basiccsvs.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/basic",
  },
];

// Group 3: League-specific & game-type CSVs
const GROUP_3_LEAGUE: Download[] = [
  {
    url: "https://www.retrosheet.org/downloads/al-nl.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/al-nl",
  },
  {
    url: "https://www.retrosheet.org/downloads/federal.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/federal",
  },
  {
    url: "https://www.retrosheet.org/downloads/negroleagues.zip",
    rawSubdir: "negro_leagues",
    extractSubdir: "negro_leagues",
  },
  {
    url: "https://www.retrosheet.org/downloads/regular.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/regular",
  },
  {
    url: "https://www.retrosheet.org/downloads/allstar.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/allstar",
  },
  {
    url: "https://www.retrosheet.org/downloads/postseason.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/postseason",
  },
  {
    url: "https://www.retrosheet.org/downloads/tiebreakers.zip",
    rawSubdir: "csv",
    extractSubdir: "csv/tiebreakers",
  },
];

// Group 4: Event files (native play-by-play format)
const DECADES_EVE = [
  "1910s", "1920s", "1930s", "1940s", "1950s",
  "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
];
const DECADES_BOX = [
  "1870s", "1880s", "1890s", "1900s", "1910s", "1920s", "1930s",
  "1940s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
];

const GROUP_4_EVENTS: Download[] = [
  // Regular season event files by decade
  ...DECADES_EVE.map((d) => ({
    url: `https://www.retrosheet.org/events/${d}eve.zip`,
    rawSubdir: "events",
    extractSubdir: "events/regular",
  })),
  // Regular season box score files by decade
  ...DECADES_BOX.map((d) => ({
    url: `https://www.retrosheet.org/events/${d}box.zip`,
    rawSubdir: "events",
    extractSubdir: "events/boxscores",
  })),
  // Post-season
  {
    url: "https://www.retrosheet.org/events/allpost.zip",
    rawSubdir: "events",
    extractSubdir: "events/postseason",
  },
  // All-Star
  {
    url: "https://www.retrosheet.org/events/allas.zip",
    rawSubdir: "events",
    extractSubdir: "events/allstar",
  },
  // Negro League events
  {
    url: "https://www.retrosheet.org/events/allevr.zip",
    rawSubdir: "events",
    extractSubdir: "events/negro_league_events",
  },
  // Negro League box scores
  {
    url: "https://www.retrosheet.org/events/allebr.zip",
    rawSubdir: "events",
    extractSubdir: "events/negro_league_boxscores",
  },
  // All-Star + Post-season box score combined
  {
    url: "https://www.retrosheet.org/events/allebe.zip",
    rawSubdir: "events",
    extractSubdir: "events/allstar_postseason_box",
  },
];

// Group 5: Game logs
const GROUP_5_GAMELOGS: Download[] = [
  {
    url: "https://www.retrosheet.org/gamelogs/gl1871_2025.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/regular",
  },
  {
    url: "https://www.retrosheet.org/gamelogs/glws.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/world_series",
  },
  {
    url: "https://www.retrosheet.org/gamelogs/glas.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/allstar",
  },
  {
    url: "https://www.retrosheet.org/gamelogs/glwc.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/wild_card",
  },
  {
    url: "https://www.retrosheet.org/gamelogs/gldv.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/division_series",
  },
  {
    url: "https://www.retrosheet.org/gamelogs/gllc.zip",
    rawSubdir: "gamelogs",
    extractSubdir: "gamelogs/league_championship",
  },
];

// Group 6: Supplementary data
const GROUP_6_SUPPLEMENTARY: Download[] = [
  // Schedules
  {
    url: "https://www.retrosheet.org/schedule/index.html",
    rawSubdir: "schedules",
    extractSubdir: "schedules",
    filename: "_skip_index_", // We'll handle schedules specially
  },
  // Ejections
  {
    url: "https://www.retrosheet.org/ejections.zip",
    rawSubdir: "ejections",
    extractSubdir: "ejections",
  },
  // Special collections
  {
    url: "https://www.retrosheet.org/downloads/3HR.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/15K.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/20innings.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/20runss.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/cycles.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/interracial.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/nohitters.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
  {
    url: "https://www.retrosheet.org/downloads/tripleplays.zip",
    rawSubdir: "special",
    extractSubdir: "special",
  },
];

// Build schedule downloads dynamically (1877-2026)
function getScheduleDownloads(): Download[] {
  const downloads: Download[] = [];
  for (let year = 1877; year <= 2026; year++) {
    downloads.push({
      url: `https://www.retrosheet.org/schedule/${year}SKED.zip`,
      rawSubdir: "schedules",
      extractSubdir: "schedules",
    });
  }
  return downloads;
}

// Build official daily totals downloads dynamically
function getOfficialTotalsDownloads(): Download[] {
  const downloads: Download[] = [];

  // American League: 1901-1980
  for (let year = 1901; year <= 1980; year++) {
    downloads.push({
      url: `https://www.retrosheet.org/officialtotals/${year}AL.zip`,
      rawSubdir: "official_totals",
      extractSubdir: "official_totals/AL",
    });
  }

  // National League: 1891-1980
  for (let year = 1891; year <= 1980; year++) {
    downloads.push({
      url: `https://www.retrosheet.org/officialtotals/${year}NL.zip`,
      rawSubdir: "official_totals",
      extractSubdir: "official_totals/NL",
    });
  }

  // American Association: 1882-1891
  for (let year = 1882; year <= 1891; year++) {
    downloads.push({
      url: `https://www.retrosheet.org/officialtotals/${year}AA.zip`,
      rawSubdir: "official_totals",
      extractSubdir: "official_totals/AA",
    });
  }

  // Federal League: 1914-1915
  for (let year = 1914; year <= 1915; year++) {
    downloads.push({
      url: `https://www.retrosheet.org/officialtotals/${year}FL.zip`,
      rawSubdir: "official_totals",
      extractSubdir: "official_totals/FL",
    });
  }

  // Union Association: 1884
  downloads.push({
    url: "https://www.retrosheet.org/officialtotals/1884UA.zip",
    rawSubdir: "official_totals",
    extractSubdir: "official_totals/UA",
  });

  // Players League: 1890
  downloads.push({
    url: "https://www.retrosheet.org/officialtotals/1890PL.zip",
    rawSubdir: "official_totals",
    extractSubdir: "official_totals/PL",
  });

  return downloads;
}

// ─── Download & Extract Helpers ─────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadFile(
  url: string,
  destPath: string,
  retries = 3
): Promise<boolean> {
  if (fs.existsSync(destPath)) {
    return true; // already downloaded
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`  ⚠ 404 Not Found: ${url}`);
          return false;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      return true;
    } catch (err: any) {
      if (attempt < retries) {
        const delay = attempt * 2000;
        console.warn(
          `  Attempt ${attempt} failed for ${url}: ${err.message}. Retrying in ${delay / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(`  ✗ Failed after ${retries} attempts: ${url} — ${err.message}`);
        return false;
      }
    }
  }
  return false;
}

function extractZip(zipPath: string, destDir: string): boolean {
  ensureDir(destDir);
  try {
    execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, {
      stdio: "pipe",
      timeout: 120_000,
    });
    return true;
  } catch (err: any) {
    console.error(`  ✗ Extract failed: ${zipPath} — ${err.message}`);
    return false;
  }
}

async function processDownloads(
  downloads: Download[],
  groupName: string,
  skipExtract: boolean
): Promise<{ downloaded: number; extracted: number; skipped: number; failed: number }> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Group: ${groupName}`);
  console.log(`${"═".repeat(60)}`);

  let downloaded = 0;
  let extracted = 0;
  let skipped = 0;
  let failed = 0;

  for (const dl of downloads) {
    if (dl.filename === "_skip_index_") continue;

    const filename = dl.filename || dl.url.split("/").pop()!;
    const rawDir = path.join(RAW_DIR, dl.rawSubdir);
    const rawPath = path.join(rawDir, filename);
    const extractDir = path.join(EXTRACTED_DIR, dl.extractSubdir);

    ensureDir(rawDir);

    const alreadyHad = fs.existsSync(rawPath);
    const ok = await downloadFile(dl.url, rawPath);

    if (!ok) {
      failed++;
      continue;
    }

    if (alreadyHad) {
      skipped++;
      process.stdout.write(`  ✓ (cached) ${filename}\n`);
    } else {
      downloaded++;
      process.stdout.write(`  ✓ Downloaded ${filename}\n`);
    }

    if (!skipExtract && filename.endsWith(".zip")) {
      if (extractZip(rawPath, extractDir)) {
        extracted++;
      }
    }
  }

  console.log(
    `  Summary: ${downloaded} new, ${skipped} cached, ${extracted} extracted, ${failed} failed`
  );
  return { downloaded, extracted, skipped, failed };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const groupArg = args.indexOf("--group");
  const targetGroup = groupArg >= 0 ? parseInt(args[groupArg + 1]) : 0;
  const skipExtract = args.includes("--skip-extract");

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║          Retrosheet Data Downloader                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nBase directory: ${BASE_DIR}`);
  if (targetGroup) console.log(`Running group ${targetGroup} only`);
  if (skipExtract) console.log("Skipping extraction");

  const totals = { downloaded: 0, extracted: 0, skipped: 0, failed: 0 };

  const addTotals = (r: { downloaded: number; extracted: number; skipped: number; failed: number }) => {
    totals.downloaded += r.downloaded;
    totals.extracted += r.extracted;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  };

  if (!targetGroup || targetGroup === 1) {
    addTotals(await processDownloads(GROUP_1_REFERENCE, "1: Reference Data", skipExtract));
  }

  if (!targetGroup || targetGroup === 2) {
    addTotals(await processDownloads(GROUP_2_CSV, "2: Master CSV Files", skipExtract));
  }

  if (!targetGroup || targetGroup === 3) {
    addTotals(await processDownloads(GROUP_3_LEAGUE, "3: League & Game-Type CSVs", skipExtract));
  }

  if (!targetGroup || targetGroup === 4) {
    addTotals(await processDownloads(GROUP_4_EVENTS, "4: Event Files", skipExtract));
  }

  if (!targetGroup || targetGroup === 5) {
    addTotals(await processDownloads(GROUP_5_GAMELOGS, "5: Game Logs", skipExtract));
  }

  if (!targetGroup || targetGroup === 6) {
    // Schedules (many small files)
    addTotals(await processDownloads(getScheduleDownloads(), "6a: Schedules", skipExtract));

    // Official daily totals (many small files)
    addTotals(await processDownloads(getOfficialTotalsDownloads(), "6b: Official Daily Totals", skipExtract));

    // Ejections + special collections
    addTotals(
      await processDownloads(
        GROUP_6_SUPPLEMENTARY.filter((d) => d.filename !== "_skip_index_"),
        "6c: Ejections & Special Collections",
        skipExtract
      )
    );
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("COMPLETE");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total downloaded: ${totals.downloaded}`);
  console.log(`  Total cached:     ${totals.skipped}`);
  console.log(`  Total extracted:  ${totals.extracted}`);
  console.log(`  Total failed:     ${totals.failed}`);

  // Show disk usage
  try {
    const du = execSync(`du -sh "${BASE_DIR}"`, { encoding: "utf-8" }).trim();
    console.log(`  Disk usage:       ${du.split("\t")[0]}`);
  } catch {}
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
