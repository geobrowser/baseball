/**
 * Export Entities by Type to CSV
 *
 * Queries the Geo API for all entities of a given type,
 * fetches their properties and relations, and writes a CSV file.
 *
 * Usage:
 *   bun run 05_create_test_csv.ts <typeId> [--space <spaceId>] [--limit <n>]
 *
 * Examples:
 *   bun run 05_create_test_csv.ts 972d201ad78045689e01543f67b26bee
 *   bun run 05_create_test_csv.ts 972d201ad78045689e01543f67b26bee --space b5a31f8182b042437ede0f84ee02f104 --limit 50
 */

import dotenv from "dotenv";
import * as fs from "fs";
import { gql } from "./src/functions";
import { ROOT_SPACE_ID, PROPERTIES } from "./src/constants";

dotenv.config();

const TYPES_RELATION_ID = PROPERTIES.types;

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

function parseArgs(): { typeId: string; spaceId: string; limit: number } {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Usage: bun run 05_create_test_csv.ts <typeId> [--space <spaceId>] [--limit <n>]");
    process.exit(1);
  }

  const typeId = args[0];
  let spaceId = process.env.DEMO_SPACE_ID || ROOT_SPACE_ID;
  let limit = 100;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--space" && args[i + 1]) {
      spaceId = args[++i];
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[++i], 10);
    }
  }

  return { typeId, spaceId, limit };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { typeId, spaceId, limit } = parseArgs();

  // Resolve the type name for logging and output filename
  const typeData = await gql(`{
    entity(id: "${typeId}") { name }
  }`);
  const typeName = typeData.entity?.name || typeId;

  console.log(`Querying ${typeName} entities from space ${spaceId} (limit ${limit})...\n`);

  // 1. Get entities of the given type
  const entityData = await gql(`{
    entities(
      spaceId: "${spaceId}"
      typeId: "${typeId}"
      first: ${limit}
      filter: { name: { isNull: false } }
    ) {
      id
      name
      description
      typeIds
    }
  }`);

  const entities = entityData.entities;
  console.log(`Found ${entities.length} ${typeName} entities.\n`);

  if (entities.length === 0) {
    console.log("No entities found. Nothing to export.");
    return;
  }

  // 2. For each entity, fetch values and relations
  const entityRows: Array<{
    name: string;
    description: string;
    types: string[];
    properties: Record<string, string>;
    relations: Record<string, string[]>;
  }> = [];

  const allPropertyColumns = new Set<string>();
  const allRelationColumns = new Set<string>();

  for (const entity of entities) {
    const data = await gql(`{
      values(
        filter: {
          entityId: { is: "${entity.id}" }
          spaceId: { is: "${spaceId}" }
        }
      ) {
        propertyId
        text
        integer
        float
        boolean
        date
        datetime
        propertyEntity { name }
      }
      relations(
        filter: {
          fromEntityId: { is: "${entity.id}" }
          spaceId: { is: "${spaceId}" }
        }
        first: 100
      ) {
        typeId
        toEntityId
        typeEntity { name }
        toEntity { name }
      }
    }`);

    // Process values (skip Name and Description — they become top-level columns)
    const properties: Record<string, string> = {};
    for (const v of data.values) {
      if (v.propertyId === PROPERTIES.name || v.propertyId === PROPERTIES.description) continue;
      const propName = v.propertyEntity?.name || v.propertyId;
      const value = v.text ?? v.integer ?? v.float ?? v.boolean ?? v.date ?? v.datetime;
      if (value !== null && value !== undefined) {
        properties[propName] = String(value);
        allPropertyColumns.add(propName);
      }
    }

    // Process relations (skip Types relation — handled separately)
    const relations: Record<string, string[]> = {};
    const typeNames: string[] = [];

    for (const r of data.relations) {
      if (r.typeId === TYPES_RELATION_ID) {
        const typeName = r.toEntity?.name || r.toEntityId;
        typeNames.push(typeName);
      } else {
        const relType = r.typeEntity?.name || r.typeId;
        const target = r.toEntity?.name || r.toEntityId;
        if (!relations[relType]) relations[relType] = [];
        relations[relType].push(target);
        allRelationColumns.add(relType);
      }
    }

    entityRows.push({
      name: entity.name,
      description: entity.description || "",
      types: typeNames.length > 0 ? typeNames : [typeName],
      properties,
      relations,
    });

    console.log(`  Fetched: ${entity.name}`);
  }

  // 3. Build CSV
  const propertyColumns = [...allPropertyColumns].sort();
  const relationColumns = [...allRelationColumns].sort();

  const header = ["Name", "Types", "Description", ...propertyColumns, ...relationColumns];
  const rows = [buildCsvRow(header)];

  for (const row of entityRows) {
    const fields = [
      row.name,
      row.types.join(", "),
      row.description,
      ...propertyColumns.map((col) => row.properties[col] || ""),
      ...relationColumns.map((col) => (row.relations[col] || []).join(", ")),
    ];
    rows.push(buildCsvRow(fields));
  }

  const csv = "\uFEFF" + rows.join("\n") + "\n";

  // 4. Write to file
  const safeTypeName = typeName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const outputPath = `./test_csvs/${safeTypeName}_export.csv`;
  fs.mkdirSync("./test_csvs", { recursive: true });
  fs.writeFileSync(outputPath, csv);

  console.log(`\nCSV written to ${outputPath}`);
  console.log(`  ${entityRows.length} rows, ${header.length} columns`);
  console.log(`  Columns: ${header.join(", ")}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
