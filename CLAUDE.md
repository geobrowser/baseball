# CLAUDE.md — retrosheet_x_geo

Retrosheet baseball data → Geo decentralized knowledge graph (GRC-20 protocol).

> **Starting point:** Retrosheet data has already been downloaded and parsed into `data/parsed/`. The next steps are ontology design, publishing, and app development. See `walkthrough_plan.md` for the full plan.

## Quick Start

- **Runtime:** Bun — `bun run <file>.ts`
- **SDK:** `@geoprotocol/geo-sdk` v0.13.x — `Graph`, `Position`, `ContentIds`, `personalSpace`, `daoSpace`
- **API:** `https://testnet-api.geobrowser.io/graphql` (UUIDs are 32-char hex, no dashes)
- **Network:** Geo Testnet — RPC `https://rpc-geo-test-zc16z3tcvf.t.conduit.xyz`
- **Env vars:** `PK_SW` (signing key), `DEMO_SPACE_ID` (target space), `SW_ADDRESS` (wallet)

## Project Layout

```
src/constants.ts     — System ontology IDs (root space types, properties, data types, views)
src/functions.ts     — gql(), publishOps(), printOps(), entity lookup helpers
src/entity_ops.ts    — deleteEntity(), changeEntityId(), changeSpace(), mergeEntities()
scripts/             — Retrosheet download & parse pipeline
  download_retrosheet.ts  — Download all Retrosheet data (already run)
  parse_*.ts              — Parse downloaded files to JSON/NDJSON (already run)
  summarize_data.ts       — Validate and summarize parsed data
data/parsed/         — Retrosheet parsed data (14 files, 9.6 GB)
data_samples.txt     — Field reference for all 14 parsed files
docs/                — SDK and API reference docs
content/             — Content plan for posts, videos, tweets
archive/             — Prior work preserved for reference (ontology.txt, field-mappings.md, etc.)
0[1-7]_*.ts         — Demo/utility scripts for exploring the API and publishing
walkthrough_plan.md  — Phase-by-phase walkthrough plan for the video series
walkthrough_prompts.txt — Claude prompts to use during the walkthrough
```

## Core Patterns (minimal)

- SDK methods return `{ id, ops }`. Collect into `allOps: Op[]`, publish once via `publishOps(allOps, "name")`.
- Dates: RFC 3339 (`"YYYY-MM-DD"` for date, `"YYYY-MM-DDTHH:MM:SSZ"` for datetime).
- Block ordering: `Position.generateBetween(lastPos, null)` for fractional indexing.
- GraphQL filters: `UUIDFilter` uses `is`/`isNot` (not `equalTo`). `UUIDListFilter` uses `anyEqualTo`.
- Multi-space: tag ops with `.spaceId`, use `publishOps_w_spaces()`.

## Deep Reference (read on demand)

| Doc | When to read |
|-----|-------------|
| [docs/sdk-patterns.md](docs/sdk-patterns.md) | Writing new publish scripts, creating entities/relations/blocks |
| [docs/graphql-api.md](docs/graphql-api.md) | Querying the API, filtering, fetching values/relations/backlinks |
| [docs/ontology-ids.md](docs/ontology-ids.md) | System type/property/view/data-type UUIDs (root space) |
| [docs/entity-operations.md](docs/entity-operations.md) | Delete, merge, move, or migrate entities across spaces |
| [docs/data-pipeline.md](docs/data-pipeline.md) | Running the Retrosheet download/parse/summarize pipeline |
| [data_samples.txt](data_samples.txt) | Retrosheet parsed data field reference (all 14 files) |
| [knowledge-graph-ontology.md](knowledge-graph-ontology.md) | Full ontology spec (schemas, blocks, images, system properties) |
| [spec.md](spec.md) | Full GRC-20 protocol spec (data model, ops, edits, resolution) |
| [archive/ontology_rules_reference.md](archive/ontology_rules_reference.md) | Established ontology design rules and naming conventions |
