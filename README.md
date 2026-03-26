# Baseball × Geo Knowledge Graph

A walkthrough project building a decentralized baseball knowledge graph on the [Geo protocol](https://geobrowser.io) using historical data from [Retrosheet](https://www.retrosheet.org/).

This repo is the reference codebase for a video walkthrough series covering: data exploration, ontology design, publishing to Geo, iterating, and building an app on top.

---

## What's in this repo

### Data (already downloaded and parsed)

`data/parsed/` contains 14 parsed files from Retrosheet, totalling ~9.6 GB:

| File | Records | Description |
|------|---------|-------------|
| players.json | 26,961 | Player bios (names, birth info, handedness, HoF) |
| teams.json | 293 | Franchise history |
| ballparks.json | 656 | Stadium records |
| rosters.json | 125,566 | Year-by-year roster entries |
| gamelogs.ndjson | 237,580 | Game-level summaries (1871–2025) |
| ejections.json | 19,730 | Ejection records |
| schedules.ndjson | 238,816 | Schedule entries (1877–2026) |
| batting.ndjson | 5,746,328 | Per-game batting performances |
| pitching.ndjson | 1,269,889 | Per-game pitching performances |
| fielding.ndjson | 1,738,253 | Per-game fielding performances |
| plays.ndjson | 6,515,744 | Play-by-play records |
| allplayers.ndjson | 130,791 | All player records (alternate source) |
| gameinfo.ndjson | 224,877 | Detailed game info |
| special_collections.json | 2,733 | Special game collections |

See `data_samples.txt` for field-level examples from every file.

> **Retrosheet Disclosure:** The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested parties may contact Retrosheet at [www.retrosheet.org](https://www.retrosheet.org).

### Source / pipeline scripts

- `scripts/download_retrosheet.ts` — downloads all Retrosheet data (already run)
- `scripts/parse_*.ts` — parses raw files to JSON/NDJSON (already run)
- `scripts/summarize_data.ts` — validates parsed data and prints a summary

### Core library (`src/`)

- `src/constants.ts` — system ontology IDs from the Geo root space
- `src/functions.ts` — `gql()`, `publishOps()`, entity lookup helpers
- `src/entity_ops.ts` — `deleteEntity()`, `changeEntityId()`, `changeSpace()`, `mergeEntities()`

### Demo / utility scripts

- `01_api_demo.ts` — GraphQL API exploration examples
- `02_publish_demo.ts` — Reference pattern for publishing entities to Geo
- `03_delete_demo.ts` — Delete entities from a space
- `04_delete_entity.ts` — Standalone entity delete utility
- `07_entity_operations.ts` — Template for running entity operations

### Documentation

- `knowledge-graph-ontology.md` — Full GRC-20 ontology spec
- `spec.md` — Full GRC-20 protocol spec
- `docs/` — SDK patterns, GraphQL API reference, entity operations, ontology IDs
- `walkthrough_plan.md` — Phase-by-phase walkthrough plan
- `walkthrough_prompts.txt` — Claude prompts for each walkthrough step

### Archive

`archive/` holds prior work from a previous run-through of the ontology design + publishing steps. Useful as reference when recreating the ontology.

---

## Prerequisites

- [Bun](https://bun.sh) installed
- `.env` file configured:
  ```
  PK_SW=0x...
  DEMO_SPACE_ID=...
  SW_ADDRESS=0x...
  ```
- Geo Browser: `https://geobrowser.io`

## Running scripts

```bash
bun run scripts/summarize_data.ts     # validate parsed data
bun run 01_api_demo.ts                # explore the Geo API
bun run 02_publish_demo.ts            # publish demo entities
```
