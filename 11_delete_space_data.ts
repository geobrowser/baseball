/**
 * Delete all entities in the baseball space, except the home entity
 * and any entities directly referenced by it.
 *
 * Baseball space ID: 7570a0ba7552e6806e0751c2ad105754
 * Home entity ID:    7bb902f704fc435297da9c437330f0f2
 *
 * Usage:
 *   bun run 11_delete_space_data.ts              # delete everything (prompts for confirmation)
 *   bun run 11_delete_space_data.ts --dry-run    # count entities without deleting
 *   bun run 11_delete_space_data.ts --limit 10   # delete at most N entities (for testing)
 */

import { gql, publishOps } from "./src/functions";
import { deleteEntity, type OpsBatch } from "./src/entity_ops";

const SPACE_ID = "7570a0ba7552e6806e0751c2ad105754";
const HOME_ENTITY_ID = "7bb902f704fc435297da9c437330f0f2";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.indexOf("--limit");
const LIMIT = LIMIT_ARG !== -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : Infinity;

// ── Fetch all entity IDs in the space (paginated) ───────────────────────────

async function fetchAllEntityIds(spaceId: string): Promise<{ id: string; name: string }[]> {
  const entities: { id: string; name: string }[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (true) {
    page++;
    const afterClause = cursor ? `after: "${cursor}"` : "";
    const data = await gql(`{
      entities(
        spaceId: "${spaceId}"
        first: 100
        ${afterClause}
        orderBy: CREATED_AT_ASC
      ) {
        nodes {
          id
          name
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`);

    const nodes: { id: string; name: string }[] = data.entities?.nodes ?? [];
    const pageInfo = data.entities?.pageInfo;

    entities.push(...nodes);
    console.log(`  Page ${page}: fetched ${nodes.length} entities (total so far: ${entities.length})`);

    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  return entities;
}

// ── Fetch entity IDs referenced by the home entity ──────────────────────────

async function fetchHomeEntityRelationTargets(homeEntityId: string, spaceId: string): Promise<Set<string>> {
  const data = await gql(`{
    relations(filter: {
      fromEntityId: { is: "${homeEntityId}" }
      spaceId: { is: "${spaceId}" }
    }) {
      toEntityId
    }
  }`);

  const ids = new Set<string>();
  for (const r of data.relations ?? []) {
    ids.add(r.toEntityId);
  }
  return ids;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`  Delete Space Data`);
  console.log(`  Space:      ${SPACE_ID}`);
  console.log(`  Home:       ${HOME_ENTITY_ID}`);
  console.log(`  Mode:       ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE"}`);
  if (LIMIT !== Infinity) console.log(`  Limit:      ${LIMIT} entities`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  // Step 1: Find entities protected by the home entity
  console.log("── Step 1: Fetching home entity relations ──");
  const homeTargets = await fetchHomeEntityRelationTargets(HOME_ENTITY_ID, SPACE_ID);
  console.log(`  Home entity has ${homeTargets.size} relation targets (will be protected)`);

  const protectedIds = new Set([HOME_ENTITY_ID, ...homeTargets]);
  console.log(`  Total protected: ${protectedIds.size} entities\n`);

  // Step 2: Fetch all entities in the space
  console.log("── Step 2: Fetching all entities in space ──");
  const allEntities = await fetchAllEntityIds(SPACE_ID);
  console.log(`  Total entities in space: ${allEntities.length}\n`);

  // Step 3: Filter to entities we should delete
  const toDelete = allEntities.filter(e => !protectedIds.has(e.id));
  const limited = toDelete.slice(0, LIMIT === Infinity ? toDelete.length : LIMIT);

  console.log(`── Step 3: Deletion plan ──`);
  console.log(`  Entities to delete: ${toDelete.length}`);
  if (LIMIT !== Infinity && limited.length < toDelete.length) {
    console.log(`  (Limited to: ${limited.length})`);
  }
  console.log(`  Skipping (protected): ${protectedIds.size}`);

  if (DRY_RUN) {
    console.log("\n── DRY RUN — listing entities that would be deleted ──");
    for (const e of limited) {
      console.log(`  [${e.id}] ${e.name ?? "(unnamed)"}`);
    }
    console.log(`\n  Total: ${limited.length} entities would be deleted.`);
    console.log("  Run without --dry-run to execute.");
    return;
  }

  // Confirmation prompt (skip when piped / non-interactive)
  if (process.stdin.isTTY) {
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve =>
      rl.question(`\n  Delete ${limited.length} entities from space ${SPACE_ID}? (yes/no): `, resolve)
    );
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("  Aborted.");
      return;
    }
  }

  // Step 4: Gather delete ops for all entities
  console.log(`\n── Step 4: Gathering delete ops for ${limited.length} entities ──\n`);
  const opsBatch: OpsBatch = new Map();
  let gathered = 0;

  for (const entity of limited) {
    await deleteEntity({
      entityId: entity.id,
      spaceId: SPACE_ID,
      skipOrphanCleanup: true, // bulk delete — skip cascading orphan checks
      dryRun: true,            // don't publish yet — accumulate into opsBatch
      opsBatch,
    });
    gathered++;
    console.log(`  [${gathered}/${limited.length}] Queued: ${entity.name ?? entity.id}`);
  }

  const allOps = opsBatch.get(SPACE_ID) ?? [];
  console.log(`\n  Total ops gathered: ${allOps.length}`);

  // Step 5: Publish all ops in a single call
  console.log(`\n── Step 5: Publishing ──`);
  await publishOps(allOps, "Delete baseball space data", SPACE_ID);

  console.log(`\n── Done ──`);
  console.log(`  Entities deleted: ${gathered}`);
  console.log(`  Ops published:    ${allOps.length}`);
  console.log(`  Protected (skipped): ${protectedIds.size}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
