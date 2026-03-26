/**
 * Parse plays.csv into NDJSON — handles backpressure for 3.3GB file
 *
 * Usage: bun run scripts/parse_plays.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const INPUT = path.resolve(import.meta.dir, "..", "data", "extracted", "csv", "plays.csv");
const OUTPUT = path.resolve(import.meta.dir, "..", "data", "parsed", "plays.ndjson");

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

async function main() {
  console.log("Parsing plays.csv → plays.ndjson");
  const start = Date.now();

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT, { encoding: "utf-8", highWaterMark: 64 * 1024 }),
    crlfDelay: Infinity,
  });

  const out = fs.createWriteStream(OUTPUT, { highWaterMark: 1024 * 1024 });

  let headers: string[] = [];
  let records = 0;
  let first = true;

  for await (const line of rl) {
    if (!line) continue;

    if (first) {
      headers = parseCSVLine(line).map((h) =>
        h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
      );
      first = false;
      continue;
    }

    const fields = parseCSVLine(line);
    const rec: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const v = (fields[j] || "").trim();
      if (v !== "" && v !== "0") rec[headers[j]] = v;
    }

    const ok = out.write(JSON.stringify(rec) + "\n");
    records++;

    // Handle backpressure — wait for drain if buffer is full
    if (!ok) {
      await new Promise<void>((resolve) => out.once("drain", resolve));
    }

    if (records % 1_000_000 === 0) {
      console.log(`  ${records / 1_000_000}M records...`);
    }
  }

  await new Promise<void>((resolve) => out.end(resolve));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Done: ${records.toLocaleString()} records in ${elapsed}s`);
  console.log(`Output: ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
