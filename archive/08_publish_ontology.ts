/**
 * Publish Baseball Ontology — Types & Properties
 *
 * Reads src/ontology.json and publishes all new types and properties
 * to the Geo knowledge graph. Skips entities marked "existing: true"
 * and checks the API for entities that have already been published.
 *
 * Usage:
 *   bun run 08_publish_ontology.ts              # publish only what's missing
 *   bun run 08_publish_ontology.ts --dry-run    # preview without publishing
 *   bun run 08_publish_ontology.ts --force      # skip API checks, publish all
 */

import { Graph, type Op } from "@geoprotocol/geo-sdk";
import { publishOps, printOps, findEntityById } from "./src/functions";
import ontology from "./src/ontology.json";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

async function main() {
  const allOps: Op[] = [];

  // ── Pre-flight: check which entities already exist on-chain ─────────────

  const alreadyExists = new Set<string>();

  if (!DRY_RUN && !FORCE) {
    console.log("\n── Checking API for existing entities ──");

    const allIds: string[] = [];
    for (const [key, val] of Object.entries(ontology.properties)) {
      if (key === "_comment" || (val as any).existing) continue;
      allIds.push((val as any).id);
    }
    for (const [key, val] of Object.entries(ontology.types)) {
      if (key === "_comment" || (val as any).existing) continue;
      allIds.push((val as any).id);
    }

    // Check in batches to avoid hammering the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(id => findEntityById(id)));
      for (let j = 0; j < batch.length; j++) {
        if (results[j]) {
          alreadyExists.add(batch[j]);
        }
      }
    }

    console.log(`  ${alreadyExists.size} of ${allIds.length} entities already exist on-chain`);
  }

  // ── Step 1: Create properties first (types reference property IDs) ──────

  console.log("\n── Properties ──");
  let propCreated = 0;
  let propSkipped = 0;

  for (const [key, prop] of Object.entries(ontology.properties)) {
    if (key === "_comment") continue;
    const p = prop as any;
    if (p.existing) {
      console.log(`  ⏭ ${p.name} (system)`);
      propSkipped++;
      continue;
    }
    if (alreadyExists.has(p.id)) {
      console.log(`  ✓ ${p.name} (already published)`);
      propSkipped++;
      continue;
    }

    const params: any = {
      id: p.id,
      name: p.name,
      description: p.description,
      dataType: p.dataType,
    };

    // For relation properties, resolve toEntityTypes keys to type IDs
    if (p.dataType === "RELATION" && p.toEntityTypes) {
      params.relationValueTypes = p.toEntityTypes.map((typeKey: string) => {
        const t = (ontology.types as any)[typeKey];
        if (!t) throw new Error(`Property "${key}" references unknown type key: ${typeKey}`);
        return t.id;
      });
    }

    const { ops } = Graph.createProperty(params);
    allOps.push(...ops);
    propCreated++;
    console.log(`  + ${p.name} (${p.dataType})`);
  }

  console.log(`\n  ${propCreated} to create, ${propSkipped} skipped`);

  // ── Step 2: Create types with their property schemas ────────────────────

  console.log("\n── Types ──");
  let typeCreated = 0;
  let typeSkipped = 0;

  for (const [key, type] of Object.entries(ontology.types)) {
    if (key === "_comment") continue;
    const t = type as any;
    if (t.existing) {
      console.log(`  ⏭ ${t.name} (system)`);
      typeSkipped++;
      continue;
    }
    if (alreadyExists.has(t.id)) {
      console.log(`  ✓ ${t.name} (already published)`);
      typeSkipped++;
      continue;
    }

    // Resolve schema property keys to property IDs
    const schemaKeys = (ontology.type_schemas as any)[key] ?? [];
    const propertyIds = schemaKeys.map((propKey: string) => {
      const p = (ontology.properties as any)[propKey];
      if (!p) throw new Error(`Type "${key}" schema references unknown property key: ${propKey}`);
      return p.id;
    });

    const { ops } = Graph.createType({
      id: t.id,
      name: t.name,
      description: t.description,
      properties: propertyIds,
    });
    allOps.push(...ops);
    typeCreated++;
    console.log(`  + ${t.name} (${schemaKeys.length} properties)`);
  }

  console.log(`\n  ${typeCreated} to create, ${typeSkipped} skipped`);

  // ── Step 3: Publish or dry-run ──────────────────────────────────────────

  if (allOps.length === 0) {
    console.log("\n  Nothing to publish — all types and properties already exist.");
    return;
  }

  console.log(`\n  Total: ${allOps.length} operations`);

  if (DRY_RUN) {
    console.log("\n── Dry run — writing ops to file ──");
    printOps(allOps, ".", "ontology_ops.json");
  } else {
    console.log("\n── Publishing to Geo ──");
    await publishOps(allOps, "Baseball Ontology: Types & Properties");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
