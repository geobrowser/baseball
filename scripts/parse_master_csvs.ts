/**
 * Parse Retrosheet Master CSV Files
 *
 * Validates and converts the 7 master CSV files into NDJSON format.
 * These files are already well-structured CSVs; this script adds
 * consistent field naming and outputs JSON for easy consumption.
 *
 * Usage:
 *   bun run scripts/parse_master_csvs.ts
 *
 * Input:  data/extracted/csv/ (the 7 master CSV files)
 * Output: data/parsed/{filename}.ndjson for each CSV
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const BASE_DIR = path.resolve(import.meta.dir, "..", "data");
const EXTRACTED_DIR = path.join(BASE_DIR, "extracted", "csv");
const OUTPUT_DIR = path.join(BASE_DIR, "parsed");

const MASTER_CSVS = [
  "allplayers.csv",
  "gameinfo.csv",
  "teamstats.csv",
  "batting.csv",
  "pitching.csv",
  "fielding.csv",
  "plays.csv",
];

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
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function processCSV(filename: string): Promise<{ records: number; headers: string[] }> {
  const inputPath = path.join(EXTRACTED_DIR, filename);
  if (!fs.existsSync(inputPath)) {
    console.warn(`  ⚠ File not found: ${inputPath}`);
    return { records: 0, headers: [] };
  }

  const outputName = filename.replace(".csv", ".ndjson");
  const outputPath = path.join(OUTPUT_DIR, outputName);

  // Skip if already parsed
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    const lines = parseInt(
      require("child_process").execSync(`wc -l < "${outputPath}"`, { encoding: "utf-8" }).trim()
    );
    const sizeMB = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1);
    console.log(`  Processing ${filename}... (cached)`);
    console.log(`    → ${lines} records, ${sizeMB}MB input`);
    return { records: lines, headers: [] };
  }

  console.log(`  Processing ${filename}...`);
  const startTime = Date.now();
  const sizeMB = (fs.statSync(inputPath).size / 1024 / 1024).toFixed(1);

  // Stream line-by-line to handle multi-GB files without loading into memory
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  const outStream = fs.createWriteStream(outputPath);
  let headers: string[] = [];
  let records = 0;
  let isFirstLine = true;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isFirstLine) {
      const rawHeaders = parseCSVLine(line);
      headers = rawHeaders.map(normalizeHeader);
      isFirstLine = false;
      continue;
    }

    const fields = parseCSVLine(line);
    const record: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      const val = (fields[j] || "").trim();
      if (val !== "") {
        record[headers[j]] = val;
      }
    }

    outStream.write(JSON.stringify(record) + "\n");
    records++;

    if (records % 1_000_000 === 0) {
      console.log(`    ... ${(records / 1_000_000).toFixed(0)}M records`);
    }
  }

  await new Promise<void>((resolve) => outStream.end(resolve));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `    → ${records} records, ${headers.length} columns, ${sizeMB}MB input, ${elapsed}s`
  );

  return { records, headers };
}

async function main() {
  console.log("=== Parsing Retrosheet Master CSV Files ===\n");

  if (!fs.existsSync(EXTRACTED_DIR)) {
    console.error(`Directory not found: ${EXTRACTED_DIR}`);
    console.error("Run download_retrosheet.ts first.");
    process.exit(1);
  }

  // Also check for files in subdirectories (the ZIP might extract differently)
  const availableFiles = fs.readdirSync(EXTRACTED_DIR).filter((f) => f.endsWith(".csv"));
  console.log(`Found CSV files: ${availableFiles.join(", ") || "(none in root)"}\n`);

  // Check if CSVs are in a subdirectory
  let csvDir = EXTRACTED_DIR;
  if (availableFiles.length === 0) {
    const subdirs = fs
      .readdirSync(EXTRACTED_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    for (const sub of subdirs) {
      const subFiles = fs
        .readdirSync(path.join(EXTRACTED_DIR, sub.name))
        .filter((f) => f.endsWith(".csv"));
      if (subFiles.length > 0) {
        csvDir = path.join(EXTRACTED_DIR, sub.name);
        console.log(`Found CSVs in subdirectory: ${sub.name}\n`);
        break;
      }
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const summary: { file: string; records: number; columns: number }[] = [];

  // Process known master CSVs
  for (const csvFile of MASTER_CSVS) {
    const fullPath = path.join(csvDir, csvFile);
    if (fs.existsSync(fullPath)) {
      const result = await processCSV(csvFile);
      summary.push({ file: csvFile, records: result.records, columns: result.headers.length });
    }
  }

  // Also process any other CSVs we find
  const allCsvs = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));
  for (const csvFile of allCsvs) {
    if (!MASTER_CSVS.includes(csvFile)) {
      console.log(`  (Extra CSV found: ${csvFile})`);
      const result = await processCSV(csvFile);
      summary.push({ file: csvFile, records: result.records, columns: result.headers.length });
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log("Summary:");
  console.log(`${"─".repeat(50)}`);
  for (const s of summary) {
    console.log(`  ${s.file.padEnd(20)} ${String(s.records).padStart(10)} records, ${s.columns} cols`);
  }
  console.log(
    `\nTotal records: ${summary.reduce((sum, s) => sum + s.records, 0).toLocaleString()}`
  );
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
