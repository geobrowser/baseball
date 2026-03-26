# Ontology ID Reference

Two sources of ontology IDs:

- **`src/ontology.json`** — Canonical baseball ontology (27 types, 96+ properties with stable entity IDs, type schemas, and descriptions). This is the source of truth for all baseball domain types and properties.
- **`src/constants.ts`** — System/root space IDs (meta-types, system properties, data types, views). Used for SDK-level operations.

```ts
// System IDs
import { TYPES, PROPERTIES, DATA_TYPES, VIEWS } from "./src/constants";

// Baseball ontology IDs
import ontology from "./src/ontology.json";
const gameTypeId = ontology.types.game.id;
const hitsPropertyId = ontology.properties.hits.id;
```

## Type IDs (`TYPES`)

| Key | ID | Description |
|-----|-----|-------------|
| `type` | `e7d737c536764c609fa16aa64a8c90ad` | Meta-type for type definitions |
| `property` | `808a04ceb21c4d888ad12e240613e5ca` | Meta-type for property definitions |
| `person` | `7ed45f2bc48b419e8e4664d5ff680b0d` | Person entity type |
| `project` | `484a18c5030a499cb0f2ef588ff16d50` | Project entity type |
| `topic` | `5ef5a5860f274d8e8f6c59ae5b3e89e2` | Topic entity type |
| `text_block` | `76474f2f00894e77a0410b39fb17d0bf` | Text block (markdown content) |
| `data_block` | `b8803a8665de412bbb357e0c84adf473` | Data block (query/collection results) |
| `image` | `ba4e41460010499da0a3caaa7f579d0e` | Image media entity |

## Property IDs (`PROPERTIES`)

| Key | ID | Description |
|-----|-----|-------------|
| `name` | `a126ca530c8e48d5b88882c734c38935` | Entity name |
| `description` | `9b1f76ff9711404c861e59dc3fa7d037` | Entity description |
| `types` | `8f151ba4de204e3c9cb499ddf96f48f1` | Types relation |
| `web_url` | `eed38e74e67946bf8a42ea3e4f8fb5fb` | Website URL |
| `birth_date` | `60f8b943d9a742109356fc108ee7212c` | Birth date |
| `date_founded` | `41aa3d9847b64a97b7ec427e575b910e` | Date founded |
| `topics` | `458fbc070dbf4c928f5716f3fdde7c32` | Topics relation |
| `blocks` | `beaba5cba67741a8b35377030613fc70` | Blocks relation (attaches blocks to parent) |
| `markdown_content` | `e3e363d1dd294ccb8e6ff3b76d99bc33` | Markdown body for text blocks |
| `data_source_type` | `1f69cc9880d444abad493df6a7b15ee4` | Query vs collection marker |
| `filter` | `14a46854bfd14b1882152785c2dab9f3` | JSON filter for data blocks |
| `collection_item` | `a99f9ce12ffa4dac8c61f6310d46064a` | Entity in a collection |
| `view` | `1907fd1c81114a3ca378b1f353425b65` | View preference on blocks relation |

## View Type IDs (`VIEWS`)

| Key | ID |
|-----|-----|
| `table` | `cba271cef7c140339047614d174c69f1` |
| `list` | `7d497dba09c249b8968f716bcf520473` |
| `gallery` | `ccb70fc917f04a54b86e3b4d20cc7130` |
| `bullets` | `0aaac6f7c916403eaf6d2e086dc92ada` |

## Data Type Entity IDs (`DATA_TYPES`)

| Key | ID |
|-----|-----|
| `text` | `db22a933c151866ca01a4d9e471d5797` |
| `boolean` | `37a13ac05b6887ab83e772d4ece101ab` |
| `integer` | `4258025c2fa481c3a7acc4cbde4b82c2` |
| `float` | `d1f0423c3165808d942ff929bf9fc4ce` |
| `decimal` | `ced1a1c416628b57b3df543ec8ed47b8` |
| `date` | `31cc314f1c168c1cb49e6396b7510ed8` |
| `time` | `eef2373859108a4ba8251ad145fdc2f7` |
| `datetime` | `ef3ccb2d52bb8a31b4802b0e6305ac1e` |
| `schedule` | `28df8e42d6f389828d0156c20a9ee183` |
| `point` | `799dd1cff0068f7db65245cc6ace96ab` |
| `bytes` | `cf14d6bcd4c683f19139ce65552e99e0` |
| `rect` | `eb924b1b07ed818984c3596a979113b9` |
| `embedding` | `128a4a5c75a48d2da3255ac7d25a1e11` |

## Singletons

| Constant | ID | Purpose |
|----------|-----|---------|
| `ROOT_SPACE_ID` | `a19c345ab9866679b001d7d2138d88a1` | Root space |
| `QUERY_DATA_SOURCE` | `3b069b04adbe4728917d1283fd4ac27e` | Marker for live query blocks |
| `COLLECTION_DATA_SOURCE` | `1295037a5d9c4d09b27c5502654b9177` | Marker for collection blocks |
| `DATA_TYPE_PROPERTY` | `6d29d57849bb4959baf72cc696b1671a` | Relation from property → data type |

## Additional System Properties (from ontology spec)

See `knowledge-graph-ontology.md` Section 5 for the full alphabetized registry of ~50 system entities.

## Baseball Ontology (`src/ontology.json`)

The baseball ontology defines all domain-specific types and properties. Structure:

- **`types`** — 27 types (6 existing in space, 21 new). Each has `id`, `name`, `description`, and optional `existing: true`.
- **`properties`** — 96+ properties. Each has `id`, `name`, `dataType`, `description`, and optional `toEntityTypes` (for relations) and `existing: true`.
- **`type_schemas`** — Maps each type key to an array of property keys defining its schema.

Key domain types: `game`, `play`, `pitch`, `batting_performance`, `pitching_performance`, `fielding_performance`, `ballpark`, `season`, `roster_entry`, `ejection`.

Reference types: `league`, `position`, `game_type`, `handedness`, `pitch_type`, `pitch_call`, `play_event`, `hit_trajectory`, `sky_condition`, `surface_type`, `roof_type`.

See `ontology.txt` for the full human-readable design doc and `docs/field-mappings.md` for source data → property mappings.
