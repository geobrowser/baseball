/**
 * Person Stats Export
 *
 * Queries all Person entities and exports a CSV with:
 *   - Name
 *   - Count of "Interested in" relations
 *   - Count of "Allocated" relations
 *   - Count of spaces that person's personal space is a member of
 *
 * Usage:
 *   bun run 06_person_stats_csv.ts [--space <spaceId>] [--limit <n>]
 */

import dotenv from "dotenv";
import * as fs from "fs";
import { gql } from "./src/functions";

dotenv.config();

const INTERESTED_IN_ID = "ff7e1b4444a2419187324e6c222afe07";
const ALLOCATED_ID = "cfeb642223c54df4b3f9375a489d9e22";

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

function parseArgs(): { spaceId?: string } {
  const args = process.argv.slice(2);
  let spaceId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--space" && args[i + 1]) {
      spaceId = args[++i];
    }
  }

  return { spaceId };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { spaceId } = parseArgs();

  const spaceFilter = spaceId ? `spaceId: { is: "${spaceId}" }` : "";
  console.log(
    `Querying "Interested in" relations${spaceId ? ` from space ${spaceId}` : ""}...\n`
  );

  // 1. Fetch all "Interested in" relations — this gives us only persons who have at least one
  const interestedInRelations: Array<{ fromEntityId: string; fromEntity: { name: string } }> = [];
  let offset = 0;
  const batchSize = 100;
  while (true) {
    const batch = await gql(`{
      relations(
        filter: {
          typeId: { is: "${INTERESTED_IN_ID}" }
          ${spaceFilter}
        }
        first: ${batchSize}
        offset: ${offset}
      ) {
        fromEntityId
        fromEntity { name }
      }
    }`);
    interestedInRelations.push(...batch.relations);
    if (batch.relations.length < batchSize) break;
    offset += batchSize;
  }

  // Group by person entity — count "Interested in" per person
  const personMap = new Map<string, { name: string; interestedInCount: number }>();
  for (const r of interestedInRelations) {
    const existing = personMap.get(r.fromEntityId);
    if (existing) {
      existing.interestedInCount++;
    } else {
      personMap.set(r.fromEntityId, {
        name: r.fromEntity?.name || r.fromEntityId,
        interestedInCount: 1,
      });
    }
  }

  const personIds = [...personMap.keys()];
  console.log(`Found ${personIds.length} persons with "Interested in" relations.\n`);

  if (personIds.length === 0) {
    console.log("No matching persons found. Nothing to export.");
    return;
  }

  // 2. Fetch all "Allocated" relations for these persons
  console.log("Fetching Allocated relations...");
  const allocatedCounts = new Map<string, number>();
  offset = 0;
  while (true) {
    const batch = await gql(`{
      relations(
        filter: {
          typeId: { is: "${ALLOCATED_ID}" }
          ${spaceFilter}
        }
        first: ${batchSize}
        offset: ${offset}
      ) {
        toEntityId
      }
    }`);
    for (const r of batch.relations) {
      if (personMap.has(r.toEntityId)) {
        allocatedCounts.set(r.toEntityId, (allocatedCounts.get(r.toEntityId) || 0) + 1);
      }
    }
    if (batch.relations.length < batchSize) break;
    offset += batchSize;
  }

  // 3. Build personal space lookup for space membership counts
  console.log("Fetching personal spaces to match persons...");
  const personalSpaces: Array<{ id: string; page: { id: string } | null }> = [];
  offset = 0;
  while (true) {
    const batch = await gql(`{
      spaces(
        filter: { type: { is: PERSONAL } }
        first: ${batchSize}
        offset: ${offset}
      ) {
        id
        page { id }
      }
    }`);
    personalSpaces.push(...batch.spaces);
    if (batch.spaces.length < batchSize) break;
    offset += batchSize;
  }
  console.log(`  Found ${personalSpaces.length} personal spaces.\n`);

  const entityToPersonalSpace = new Map<string, string>();
  for (const s of personalSpaces) {
    if (s.page) {
      entityToPersonalSpace.set(s.page.id, s.id);
    }
  }

  // 4. Count space memberships for matched personal spaces
  const matchedPsIds = new Set(
    personIds
      .map((id) => entityToPersonalSpace.get(id))
      .filter((id): id is string => !!id)
  );

  const spaceMembershipCounts = new Map<string, number>();
  for (const psId of matchedPsIds) {
    const memberData = await gql(`{
      members(filter: { memberSpaceId: { is: "${psId}" } }) {
        spaceId
      }
    }`);
    spaceMembershipCounts.set(psId, memberData.members.length);
  }

  // 5. Assemble rows
  const rows: Array<{
    name: string;
    interestedInCount: number;
    allocatedCount: number;
    personalSpaceId: string;
    spaceMemberships: number;
  }> = [];

  for (const [entityId, person] of personMap) {
    const personalSpaceId = entityToPersonalSpace.get(entityId) || "";
    const spaceMemberships = personalSpaceId
      ? spaceMembershipCounts.get(personalSpaceId) || 0
      : 0;

    rows.push({
      name: person.name,
      interestedInCount: person.interestedInCount,
      allocatedCount: allocatedCounts.get(entityId) || 0,
      personalSpaceId,
      spaceMemberships,
    });

    console.log(
      `  ${person.name} — Interested in: ${person.interestedInCount}, Allocated: ${allocatedCounts.get(entityId) || 0}, Spaces: ${spaceMemberships}`
    );
  }

  // 5. Build CSV
  const header = ["Name", "Personal Space ID", "Interested In Count", "Allocated Count", "Space Memberships"];
  const csvRows = [buildCsvRow(header)];

  for (const row of rows) {
    csvRows.push(
      buildCsvRow([
        row.name,
        row.personalSpaceId,
        String(row.interestedInCount),
        String(row.allocatedCount),
        String(row.spaceMemberships),
      ])
    );
  }

  const csv = "\uFEFF" + csvRows.join("\n") + "\n";

  const outputPath = "./test_csvs/person_stats.csv";
  fs.mkdirSync("./test_csvs", { recursive: true });
  fs.writeFileSync(outputPath, csv);

  console.log(`\nCSV written to ${outputPath}`);
  console.log(`  ${rows.length} rows`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
