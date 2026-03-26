# Geo SDK Patterns

## Creating Entities

```ts
import { Graph, type Op } from "@geoprotocol/geo-sdk";
import { TYPES, PROPERTIES } from "./src/constants";

const { id, ops } = Graph.createEntity({
  name: "Entity Name",
  description: "Description text",
  types: [TYPES.person],              // Array of type entity IDs
  values: [                            // Property values
    { property: PROPERTIES.birth_date, type: "date", value: "1895-02-06" },
    { property: PROPERTIES.web_url, type: "text", value: "https://example.com" },
  ],
  relations: {                         // Keyed by relation type ID
    [PROPERTIES.topics]: [{ toEntity: topicEntityId }],
  },
});
```

## Value Types for PropertyValueParam

| SDK type    | Example value                        |
|-------------|--------------------------------------|
| `text`      | `"any string"`                       |
| `date`      | `"2024-03-15"` (RFC 3339)            |
| `datetime`  | `"2024-03-15T14:30:00Z"`             |
| `integer`   | `42`                                 |
| `float`     | `3.14`                               |
| `boolean`   | `true`                               |
| `time`      | `"14:30:00"`                         |
| `schedule`  | RFC 5545 iCalendar string            |

## Creating Relations

```ts
const { ops } = Graph.createRelation({
  fromEntity: parentId,
  toEntity: childId,
  type: PROPERTIES.blocks,       // Relation type ID
  position: pos,                 // Optional fractional index string
  entityRelations: {             // Optional relations on the relation entity itself
    [PROPERTIES.view]: { toEntity: VIEWS.gallery },
  },
});
```

## Fractional Indexing (Block Ordering)

```ts
import { Position } from "@geoprotocol/geo-sdk";
let lastPos: string | null = null;
lastPos = Position.generateBetween(lastPos, null); // "a", then "n", etc.
```

## Text Blocks

Text blocks are entities with type `Text Block` attached to a parent via `Blocks` relation:

```ts
const { id: blockId, ops: blockOps } = Graph.createEntity({
  types: [TYPES.text_block],
  values: [{ property: PROPERTIES.markdown_content, type: "text", value: "# Heading\nParagraph" }],
});
const { ops: relOps } = Graph.createRelation({
  fromEntity: parentEntityId,
  toEntity: blockId,
  type: PROPERTIES.blocks,
  position: Position.generateBetween(lastPos, null),
});
```

## Images (IPFS Upload)

```ts
const { id, ops, cid } = await Graph.createImage({
  url: "https://example.com/image.png",
  name: "Image Name",
  network: "TESTNET",
});
// Attach as avatar:
Graph.createRelation({ fromEntity: parentId, toEntity: id, type: ContentIds.AVATAR_PROPERTY });
```

## Data Blocks

```ts
// Query data block — live filter evaluated at render time
Graph.createEntity({
  name: "Block Title",
  types: [TYPES.data_block],
  values: [{ property: PROPERTIES.filter, type: "text", value: JSON.stringify(filterObj) }],
  relations: { [PROPERTIES.data_source_type]: { toEntity: QUERY_DATA_SOURCE } },
});

// Collection data block — fixed, ordered set of entities
Graph.createEntity({
  name: "Block Title",
  types: [TYPES.data_block],
  relations: {
    [PROPERTIES.data_source_type]: { toEntity: COLLECTION_DATA_SOURCE },
    [PROPERTIES.collection_item]: [{ toEntity: id1 }, { toEntity: id2 }],
  },
});
```

## Updating & Deleting

```ts
Graph.updateEntity({ id: entityId, values: [...], unset: [{ property: propId }] });
Graph.deleteRelation({ id: relationId });
```

## Publishing

All SDK methods return `{ ops }` arrays. Collect and publish in one batch:

```ts
import { publishOps } from "./src/functions";
const allOps: Op[] = [];
// ... collect ops ...
await publishOps(allOps, "Edit name", optionalSpaceId);
```

For multi-space publishes (ops tagged with `.spaceId`):

```ts
import { publishOps_w_spaces } from "./src/functions";
await publishOps_w_spaces(allOps);
```

## Property Registry Pattern

For bulk imports, define a registry mapping JSON fields to property IDs:

```ts
const VALUE_PROPERTIES: Record<string, { id: string; type: "text" | "date" }> = {
  web_url:      { id: PROPERTIES.web_url,      type: "text" },
  birth_date:   { id: PROPERTIES.birth_date,   type: "date" },
};

function extractValues(data: Record<string, any>) {
  const values: any[] = [];
  for (const [field, meta] of Object.entries(VALUE_PROPERTIES)) {
    if (data[field] != null) {
      values.push({ property: meta.id, type: meta.type, value: data[field] });
    }
  }
  return values;
}
```
