# GraphQL API Reference

Endpoint: `https://testnet-api.geobrowser.io/graphql`

All UUIDs are 32-char lowercase hex (no dashes). The `gql()` helper in `src/functions.ts` handles requests.

```ts
import { gql } from "./src/functions";
```

## Query Entities

```graphql
{
  entities(
    spaceId: "SPACE_UUID"
    typeId: "TYPE_UUID"          # optional — filter by type
    first: 20
    filter: { name: { isNull: false } }
    orderBy: UPDATED_AT_DESC     # CREATED_AT_ASC, CREATED_AT_DESC, UPDATED_AT_ASC, etc.
  ) {
    id name description typeIds createdAt updatedAt
  }
}
```

## Query Values

```graphql
{
  values(filter: {
    entityId: { is: "ENTITY_UUID" }
    spaceId: { is: "SPACE_UUID" }
    # propertyId: { in: ["PROP1", "PROP2"] }   # optional filter
  }) {
    propertyId text integer float boolean date datetime time schedule
    propertyEntity { name }
  }
}
```

## Query Relations (outgoing)

```graphql
{
  relations(filter: {
    fromEntityId: { is: "ENTITY_UUID" }
    spaceId: { is: "SPACE_UUID" }
  }) {
    id typeId toEntityId toSpaceId position
    toEntity { name }
    typeEntity { name }
  }
}
```

## Query Backlinks (incoming relations)

```graphql
{
  relations(filter: {
    toEntityId: { is: "ENTITY_UUID" }
    # spaceId: { is: "SPACE_UUID" }   # optional — omit for all spaces
  }) {
    id typeId fromEntityId
    fromEntity { name }
    typeEntity { name }
    spaceId
  }
}
```

## Query Space Info

```graphql
{
  space(id: "SPACE_UUID") {
    id type address topicId
    page { id name description }
    membersList { memberSpaceId }
    editorsList { memberSpaceId }
  }
}
```

## Find Spaces by Wallet Address

```graphql
{
  spaces(filter: { address: { is: "0xWALLET" } }) {
    id type
  }
}
```

## Entity Deduplication Lookups

Before creating new entities, always check if they already exist. Use these patterns
in order of specificity. Helper functions are available in `src/functions.ts`.

### By unique identifier (most reliable)

```ts
import { findEntityByTextValue, findEntityByIntegerValue } from "./src/functions";
import ontology from "./src/ontology.json";

// Find by Retrosheet ID
const id = await findEntityByTextValue(ontology.properties.retrosheet_id.id, "ohtas001");

// Find by MLB ID
const id = await findEntityByIntegerValue(ontology.properties.mlb_id.id, 660271);
```

Underlying query (text value — no spaceId, searches all spaces):
```graphql
{
  values(filter: {
    propertyId: { is: "RETROSHEET_ID_PROP_UUID" }
    text: { is: "ohtas001" }
  }) { entityId }
}
```

Underlying query (integer value — no spaceId, searches all spaces):
```graphql
{
  values(filter: {
    propertyId: { is: "MLB_ID_PROP_UUID" }
    integer: { is: 660271 }
  }) { entityId }
}
```

### By name + type (for reference entities)

```ts
import { findEntityByName } from "./src/functions";
import ontology from "./src/ontology.json";

// Find a Position entity named "Shortstop"
const id = await findEntityByName("Shortstop", ontology.types.position.id);
```

Underlying query (no spaceId, searches all spaces):
```graphql
{
  entities(
    typeId: "TYPE_UUID"
    first: 10
    filter: { name: { includes: "Shortstop" } }
  ) { id name }
}
```

Note: The API `includes` filter is substring-based, not exact. The helper
function post-filters for exact match.

### Lookup priority in publish scripts

When creating entities that might already exist, check in this order:
1. **Retrosheet ID** — unique per entity, most reliable for historical data
2. **MLB ID** — unique per entity, most reliable for live data
3. **Name + type** — fallback for reference entities (Position, League, etc.)

If a match is found, reuse the existing entity ID. `Graph.createEntity()` with
an existing ID will upsert (update values, not duplicate).

## Filter Syntax

| Filter type | Operators |
|------------|-----------|
| `UUIDFilter` | `is`, `isNot` |
| `UUIDListFilter` | `anyEqualTo`, `in` |
| `StringFilter` | `isNull`, `includes` |
| Ordering | `CREATED_AT_ASC`, `CREATED_AT_DESC`, `UPDATED_AT_ASC`, `UPDATED_AT_DESC` |

**Common pitfall:** Use `is`/`isNot` for UUID equality, NOT `equalTo`.
