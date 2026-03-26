# Entity Operations

Higher-level operations in `src/entity_ops.ts` built on top of the Geo SDK. All support `dryRun: true` to generate ops without publishing.

```ts
import { deleteEntity, changeEntityId, changeSpace, mergeEntities, migratePropertyReferences } from "./src/entity_ops";
```

## deleteEntity

Unsets all values, deletes all outgoing relations, optionally recursively deletes orphaned targets.

```ts
const ops = await deleteEntity({
  entityId: "abc123...",
  spaceId: "space123...",
  dryRun: false,                    // default false — set true to collect ops only
  skipOrphanCleanup: false,         // default false — set true to skip recursive orphan deletion
  excludeFromOrphanCheck: ["id1"],  // entity IDs to never treat as orphaned
});
```

**How it works:**
1. Queries all values and relations for the entity
2. `Graph.updateEntity({ unset })` for all value properties
3. `Graph.deleteRelation()` for all outgoing relations
4. For each "to" entity, checks if it still has backlinks — if not, recursively deletes it

## changeEntityId

Migrates all properties, relations, and backlinks to a new entity ID.

```ts
const ops = await changeEntityId({
  oldEntityId: "old123...",
  newEntityId: "new456...",
  spaceId: "space123...",
  dryRun: false,
});
```

**How it works:**
1. Copies all value properties to new entity via `Graph.updateEntity`
2. Recreates all outgoing relations from new entity
3. Migrates all backlinks (deletes old, creates new pointing to new ID)
4. Deletes old entity (skips orphan cleanup since new entity has same targets)

## changeSpace

Moves an entity between spaces, keeping the same entity ID.

```ts
const { createOps, deleteOps } = await changeSpace({
  entityId: "abc123...",
  fromSpaceId: "spaceA...",
  toSpaceId: "spaceB...",
  dryRun: false,
});
```

**How it works:**
1. Recreates values and relations in the new space
2. Updates backlinks in the old space to point to new space
3. Publishes creation to new space first, then deletion from old space

## mergeEntities

Merges multiple entities into one, handling same-space and cross-space scenarios.

```ts
const ops = await mergeEntities({
  mainEntityId: "main123...",
  mainSpaceId: "space123...",
  secondaries: [
    { entityId: "dup1...", spaceId: "space123..." },
    { entityId: "dup2...", spaceId: "spaceOther..." },
  ],
  dryRun: false,
  appendRelations: false,  // default false — set true to copy non-duplicate relations
});
```

**Same-space secondaries:** copies missing properties, optionally appends relations, migrates backlinks, deletes secondary.

**Cross-space secondaries:** merges within each foreign space first, then changes entity ID to match main.

**Property entities:** if main entity is a Property type, automatically calls `migratePropertyReferences` for all secondary IDs.

## migratePropertyReferences

When a Property entity is moved/merged, updates all references across ALL spaces.

```ts
const ops = await migratePropertyReferences({
  oldPropertyId: "oldProp...",
  newPropertyId: "newProp...",
  dryRun: false,
});
```

**How it works:**
1. Discovers all spaces referencing the old property ID
2. Checks write access (member/editor) for each space
3. For values: unsets old property, sets new property (with type conversion if needed)
4. For relations: deletes old-typed relations, creates new-typed relations
5. Logs warnings for spaces it can't write to

**Supported value conversions:** datetime↔date, integer↔float, numeric/date→text.
